const { query, newId } = require('../../config/db');
const paymongo = require('./paymongo.client');
const xendit = require('./xendit.client');
const audit = require('../audit_logs/audit_logs.service');
const academicSettingsService = require('../academic_settings/academic_settings.service');

const CONVENIENCE_FEE_RATE = 0.03; // 3%
const DEFAULT_XENDIT_INVOICE_DURATION = 15 * 60; // 15 minutes

async function assertStudentPaymentActiveTerm(batch, label = 'Student payment') {
  const activeTerm = await academicSettingsService.getActive();
  if (!activeTerm) {
    throw Object.assign(new Error(`${label} is not available because there is no active academic term`), { status: 409 });
  }
  if (batch.school_year !== activeTerm.school_year || batch.semester !== activeTerm.semester) {
    throw Object.assign(
      new Error(`Online payment is only available for the active term (${activeTerm.school_year} ${activeTerm.semester} semester). Previous balances will carry over to the next term.`),
      { status: 409 }
    );
  }
}

async function expireStaleAwaitingPayments({ paymentId, batchId, studentId, schoolYear, semester } = {}) {
  const conditions = [
    `status = 'awaiting_payment'`,
    `xendit_expires_at IS NOT NULL`,
    `xendit_expires_at <= NOW()`,
  ];
  const params = [];

  if (paymentId) {
    conditions.push('id = ?');
    params.push(paymentId);
  }

  if (batchId && studentId && schoolYear && semester) {
    conditions.push(`(batch_id = ? OR (batch_id IS NULL AND student_id = ? AND school_year = ? AND semester = ?))`);
    params.push(batchId, studentId, schoolYear, semester);
  } else if (batchId) {
    conditions.push('batch_id = ?');
    params.push(batchId);
  }

  await query(
    `UPDATE payments
     SET status = 'failed'
     WHERE ${conditions.join(' AND ')}`,
    params
  );
}

function normalizeXenditMethod(invoice = {}) {
  const channel = String(invoice.payment_channel || '').toLowerCase();
  const method = String(invoice.payment_method || '').toLowerCase();

  if (channel === 'gcash') return 'gcash';
  if (channel === 'paymaya' || channel === 'maya') return 'maya';
  if (channel === 'qrph' || channel === 'qris') return 'qris';
  if (channel === 'dana') return 'dana';
  if (channel === 'ovo') return 'ovo';
  if (method === 'credit_card' || channel === 'credit_card' || channel === 'cards') return 'credit_card';
  if (method === 'bank_transfer' || channel.includes('bank')) return 'bank_transfer';
  return 'xendit';
}

async function syncXenditPaymentStatus(payment) {
  if (!payment?.xendit_invoice_id) return payment;
  if (!['awaiting_payment', 'cancelled', 'failed'].includes(payment.status)) return payment;

  let invoice;
  try {
    invoice = await xendit.getInvoice(payment.xendit_invoice_id);
  } catch {
    return payment;
  }

  const invoiceStatus = String(invoice?.status || '').toUpperCase();
  const normalizedMethod = normalizeXenditMethod(invoice);

  if ((invoiceStatus === 'PAID' || invoiceStatus === 'SETTLED') && payment.status !== 'verified') {
    await query(
      `UPDATE payments
       SET status = 'verified', payment_method = ?,
           paid_at = COALESCE(paid_at, NOW()), verified_at = COALESCE(verified_at, NOW())
       WHERE id = ?`,
      [normalizedMethod, payment.id]
    );

    if (payment.batch_id) {
      const { rows: batchRows } = await query(
        'SELECT assessed_amount FROM enrollment_batches WHERE id = ?',
        [payment.batch_id]
      );
      await checkAndAutoEnroll(payment.batch_id, batchRows[0]?.assessed_amount || null);
    }
  } else if ((invoiceStatus === 'EXPIRED' || invoiceStatus === 'FAILED') && payment.status === 'awaiting_payment') {
    await query(
      `UPDATE payments SET status = 'failed' WHERE id = ? AND status = 'awaiting_payment'`,
      [payment.id]
    );
  }

  const { rows } = await query(
    `SELECT p.*, s.student_number, s.first_name, s.last_name
     FROM payments p
     JOIN students s ON s.id = p.student_id
     WHERE p.id = ?`,
    [payment.id]
  );
  return rows[0] || payment;
}

async function list({ page = 1, limit = 20, status, school_year, semester, student_id }) {
  page = parseInt(page); limit = parseInt(limit);
  const offset = (page - 1) * limit;
  const conditions = ['1=1'];
  const params = [];

  if (status) { params.push(status); conditions.push('p.status = ?'); }
  if (status === 'pending') {
    conditions.push(`COALESCE(p.xendit_invoice_id, '') = ''`);
    conditions.push(`COALESCE(p.payment_method, '') <> 'xendit'`);
  }
  if (school_year) { params.push(school_year); conditions.push('p.school_year = ?'); }
  if (semester) { params.push(semester); conditions.push('p.semester = ?'); }
  if (student_id) { params.push(student_id); conditions.push('p.student_id = ?'); }

  const where = conditions.join(' AND ');
  const { rows } = await query(
    `SELECT p.*, s.student_number, s.first_name, s.last_name
     FROM payments p
     JOIN students s ON s.id = p.student_id
     WHERE ${where}
     ORDER BY p.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  const { rows: cr } = await query(
    `SELECT COUNT(*) AS total FROM payments p WHERE ${where}`, params
  );
  return { data: rows, total: cr[0].total, page, limit };
}

async function getById(id) {
  await expireStaleAwaitingPayments({ paymentId: id });

  const { rows } = await query(
    `SELECT p.*, s.student_number, s.first_name, s.last_name
     FROM payments p
     JOIN students s ON s.id = p.student_id
     WHERE p.id = ?`,
    [id]
  );
  if (!rows[0]) throw Object.assign(new Error('Payment not found'), { status: 404 });
  return syncXenditPaymentStatus(rows[0]);
}

async function createLink({ student_id, tuition_id, school_year, semester, amount, payment_type }) {
  const { rows: studentRows } = await query(
    'SELECT id, student_number, first_name, last_name FROM students WHERE id = ?',
    [student_id]
  );
  const student = studentRows[0];
  if (!student) throw Object.assign(new Error('Student not found'), { status: 404 });

  const description = `Tuition - ${student.student_number} - ${school_year} ${semester}`;
  const link = await paymongo.createPaymentLink({
    amount,
    description,
    metadata: { student_number: student.student_number, student_id, school_year, semester },
  });

  const id = newId();
  await query(
    `INSERT INTO payments
     (id, student_id, tuition_id, school_year, semester, amount, payment_type, status, paymongo_link_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
    [id, student_id, tuition_id || null, school_year, semester, amount, payment_type || 'full', link.linkId]
  );

  return { payment: await getById(id), checkoutUrl: link.checkoutUrl };
}

async function handleWebhook(rawBody, signatureHeader) {
  const isValid = paymongo.verifyWebhookSignature(rawBody, signatureHeader);
  if (!isValid) throw Object.assign(new Error('Invalid webhook signature'), { status: 401 });

  const event = JSON.parse(rawBody);
  const eventType = event.data?.attributes?.type;
  const paymentData = event.data?.attributes?.data;
  if (!paymentData) return { processed: false };

  const linkId = paymentData.attributes?.source?.id;
  const paymongoPaymentId = paymentData.id;
  const paymentMethod = paymentData.attributes?.source?.type;

  if (eventType === 'payment.paid') {
    await query(
      `UPDATE payments
       SET status = 'paid', paymongo_payment_id = ?, payment_method = ?, paid_at = NOW()
       WHERE paymongo_link_id = ? AND status = 'pending'`,
      [paymongoPaymentId, paymentMethod, linkId]
    );
  } else if (eventType === 'payment.failed') {
    await query(
      "UPDATE payments SET status = 'failed' WHERE paymongo_link_id = ? AND status = 'pending'",
      [linkId]
    );
  }

  return { processed: true, event: eventType };
}

async function refund(paymentId) {
  const payment = await getById(paymentId);
  if (payment.status !== 'paid') {
    throw Object.assign(new Error('Only paid payments can be refunded'), { status: 400 });
  }
  if (!payment.paymongo_payment_id) {
    throw Object.assign(new Error('No PayMongo payment ID'), { status: 400 });
  }

  await paymongo.createRefund({ paymentId: payment.paymongo_payment_id, amount: payment.amount });
  await query("UPDATE payments SET status = 'refunded' WHERE id = ?", [paymentId]);
  return getById(paymentId);
}

async function listByBatch(batchId) {
  // Lookup batch to find student + term for legacy payment matching
  const { rows: batchRows } = await query(
    'SELECT student_id, school_year, semester FROM enrollment_batches WHERE id = ?',
    [batchId]
  );
  if (!batchRows[0]) return [];
  const { student_id, school_year, semester } = batchRows[0];

  await expireStaleAwaitingPayments({
    batchId,
    studentId: student_id,
    schoolYear: school_year,
    semester,
  });

  // Batch-linked payments (new system)
  const { rows: linked } = await query(
    `SELECT p.*, u.email AS verified_by_name
     FROM payments p LEFT JOIN users u ON u.id = p.verified_by
     WHERE p.batch_id = ?
     ORDER BY p.created_at DESC`,
    [batchId]
  );

  // Legacy payments without batch_id, matched by student + term
  const { rows: legacy } = await query(
    `SELECT p.*, u.email AS verified_by_name
     FROM payments p LEFT JOIN users u ON u.id = p.verified_by
     WHERE p.batch_id IS NULL AND p.student_id = ? AND p.school_year = ? AND p.semester = ?
     ORDER BY p.created_at DESC`,
    [student_id, school_year, semester]
  );

  // Merge, deduplicate by id, sort newest first
  const seen = new Set();
  return [...linked, ...legacy]
    .filter(p => { if (seen.has(p.id)) return false; seen.add(p.id); return true; })
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

async function recordCash({ batch_id, amount, notes, cashier_id }) {
  const { rows: batchRows } = await query(
    'SELECT * FROM enrollment_batches WHERE id = ?',
    [batch_id]
  );
  const batch = batchRows[0];
  if (!batch) throw Object.assign(new Error('Enrollment batch not found'), { status: 404 });
  if (batch.status !== 'for_payment') {
    throw Object.assign(
      new Error(`Batch status must be 'for_payment' to record payment (current: ${batch.status})`),
      { status: 422 }
    );
  }

  const id = newId();
  await query(
    `INSERT INTO payments
     (id, batch_id, student_id, school_year, semester, amount, payment_method, submitted_by, payment_period, notes, status, verified_by, verified_at)
     VALUES (?, ?, ?, ?, ?, ?, 'cash', 'cashier', 'enrollment_fee', ?, 'verified', ?, NOW())`,
    [id, batch_id, batch.student_id, batch.school_year, batch.semester, amount, notes || null, cashier_id || null]
  );

  await checkAndAutoEnroll(batch_id, batch.assessed_amount);

  return getById(id);
}

async function submitOnline({ batch_id, student_id, amount, payment_method, reference_number }) {
  const { rows: batchRows } = await query(
    'SELECT * FROM enrollment_batches WHERE id = ?',
    [batch_id]
  );
  const batch = batchRows[0];
  if (!batch) throw Object.assign(new Error('Enrollment batch not found'), { status: 404 });
  if (!['for_payment', 'for_registration', 'enrolled'].includes(batch.status)) {
    throw Object.assign(
      new Error(`Cannot submit payment for a batch with status '${batch.status}'`),
      { status: 422 }
    );
  }
  await assertStudentPaymentActiveTerm(batch, 'Manual online payment');

  const id = newId();
  await query(
    `INSERT INTO payments
     (id, batch_id, student_id, school_year, semester, amount, payment_method, reference_number, submitted_by, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'student', 'pending')`,
    [id, batch_id, student_id || batch.student_id, batch.school_year, batch.semester, amount, payment_method || null, reference_number || null]
  );

  return getById(id);
}

async function verify(id, { verified_by }) {
  const payment = await getById(id);
  if (payment.status !== 'pending') {
    throw Object.assign(
      new Error(`Payment status must be 'pending' to verify (current: ${payment.status})`),
      { status: 422 }
    );
  }
  if (payment.xendit_invoice_id || payment.payment_method === 'xendit') {
    throw Object.assign(
      new Error('Xendit payments are verified automatically after successful payment.'),
      { status: 422 }
    );
  }

  await query(
    `UPDATE payments SET status = 'verified', verified_by = ?, verified_at = NOW() WHERE id = ?`,
    [verified_by, id]
  );

  const { rows: batchRows } = await query(
    'SELECT * FROM enrollment_batches WHERE id = ?',
    [payment.batch_id]
  );
  const batch = batchRows[0];
  await checkAndAutoEnroll(payment.batch_id, batch ? batch.assessed_amount : null);

  return getById(id);
}

async function reject(id, { verified_by, notes }) {
  const payment = await getById(id);
  if (payment.status !== 'pending') {
    throw Object.assign(
      new Error(`Payment status must be 'pending' to reject (current: ${payment.status})`),
      { status: 422 }
    );
  }
  if (payment.xendit_invoice_id || payment.payment_method === 'xendit') {
    throw Object.assign(
      new Error('Unpaid Xendit checkouts must not be handled as manual cashier submissions.'),
      { status: 422 }
    );
  }

  await query(
    `UPDATE payments SET status = 'rejected', verified_by = ?, verified_at = NOW(), notes = ? WHERE id = ?`,
    [verified_by, notes || null, id]
  );

  return getById(id);
}

async function recordInstallment({ batch_id, amount, payment_period, notes, cashier_id }) {
  const { rows: batchRows } = await query(
    'SELECT * FROM enrollment_batches WHERE id = ?',
    [batch_id]
  );
  const batch = batchRows[0];
  if (!batch) throw Object.assign(new Error('Enrollment batch not found'), { status: 404 });

  const id = newId();
  await query(
    `INSERT INTO payments
     (id, batch_id, student_id, school_year, semester, amount, payment_method, submitted_by, payment_period, notes, status, verified_by, verified_at)
     VALUES (?, ?, ?, ?, ?, ?, 'cash', 'cashier', ?, ?, 'verified', ?, NOW())`,
    [id, batch_id, batch.student_id, batch.school_year, batch.semester, amount, payment_period || null, notes || null, cashier_id || null]
  );

  return getById(id);
}

async function checkAndAutoEnroll(batchId, assessedAmount) {
  // Any verified enrollment-fee or generic portal payment means the student
  // has settled the cashier's initial enrollment step and can leave the queue.
  const { rows: sumLinked } = await query(
    `SELECT COALESCE(SUM(amount), 0) AS total FROM payments
     WHERE status = 'verified' AND batch_id = ?
       AND (payment_period = 'enrollment_fee' OR payment_period IS NULL)`,
    [batchId]
  );
  const { rows: batchRows } = await query(
    'SELECT student_id, school_year, semester FROM enrollment_batches WHERE id = ?',
    [batchId]
  );
  const batch = batchRows[0];
  let enrollmentStepPaid = Number(sumLinked[0].total);
  if (batch) {
    const { rows: sumLegacy } = await query(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM payments
       WHERE status = 'verified' AND batch_id IS NULL
         AND student_id = ? AND school_year = ? AND semester = ?
         AND (payment_period = 'enrollment_fee' OR payment_period IS NULL)`,
      [batch.student_id, batch.school_year, batch.semester]
    );
    enrollmentStepPaid += Number(sumLegacy[0].total);
  }

  const noAmountRequired = !assessedAmount || Number(assessedAmount) === 0;
  const hasEnrollmentStepPayment = enrollmentStepPaid > 0;
  if (noAmountRequired || hasEnrollmentStepPayment) {
    // Move to for_registration — Registrar still needs to officially enroll.
    // Remaining tuition stays as balance and can still be settled later.
    await query(
      `UPDATE enrollment_batches SET status = 'for_registration'
       WHERE id = ? AND status = 'for_payment'`,
      [batchId]
    );
    // Enrollments remain 'for_payment' until Registrar officially registers the student
  }
}

async function createXenditInvoice({ batch_id, student_id, amount }) {
  // Look up student email & student number
  const { rows: studentRows } = await query(
    'SELECT id, student_number, first_name, last_name, email FROM students WHERE id = ?',
    [student_id]
  );
  const student = studentRows[0];
  if (!student) throw Object.assign(new Error('Student not found'), { status: 404 });

  // Look up batch for school_year + semester
  const { rows: batchRows } = await query(
    'SELECT school_year, semester, assessed_amount, status FROM enrollment_batches WHERE id = ?',
    [batch_id]
  );
  const batch = batchRows[0];
  if (!batch) throw Object.assign(new Error('Enrollment batch not found'), { status: 404 });
  if (!['for_payment', 'for_registration', 'enrolled'].includes(batch.status)) {
    throw Object.assign(
      new Error(`Cannot create Xendit payment for a batch with status '${batch.status}'`),
      { status: 422 }
    );
  }
  await assertStudentPaymentActiveTerm(batch, 'Online payment');

  await expireStaleAwaitingPayments({
    batchId: batch_id,
    studentId: student_id,
    schoolYear: batch.school_year,
    semester: batch.semester,
  });

  const baseAmount = parseFloat(amount);
  const convFee = Math.ceil(baseAmount * CONVENIENCE_FEE_RATE * 100) / 100; // round up to centavo
  const totalAmount = parseFloat((baseAmount + convFee).toFixed(2));

  const appUrl = process.env.APP_URL || 'http://localhost:5000';
  const invoiceDuration = Number(process.env.XENDIT_INVOICE_DURATION_SECONDS || DEFAULT_XENDIT_INVOICE_DURATION);
  const now = new Date();

  const { rows: awaitingRows } = await query(
    `SELECT id, amount, convenience_fee, xendit_invoice_url, xendit_expires_at
     FROM payments
     WHERE batch_id = ? AND student_id = ? AND status = 'awaiting_payment'
     ORDER BY created_at DESC
     LIMIT 1`,
    [batch_id, student_id]
  );
  const awaitingPayment = awaitingRows[0];
  const awaitingExpiry = awaitingPayment?.xendit_expires_at ? new Date(awaitingPayment.xendit_expires_at) : null;

  if (awaitingPayment && awaitingPayment.xendit_invoice_url && awaitingExpiry && awaitingExpiry > now) {
    await audit.log({
      actor_id: student_id,
      actor_name: student.student_number,
      actor_role: 'student',
      action: 'xendit_invoice_reused',
      entity: 'payment',
      entity_id: awaitingPayment.id,
      description: `Reused active Xendit invoice for ${student.student_number}.`,
      details: {
        batch_id,
        student_id,
        xendit_expires_at: awaitingPayment.xendit_expires_at,
      },
    });

    return {
      paymentId: awaitingPayment.id,
      invoiceUrl: awaitingPayment.xendit_invoice_url,
      baseAmount: Number(awaitingPayment.amount || 0),
      convFee: Number(awaitingPayment.convenience_fee || 0),
      totalAmount: Number(awaitingPayment.amount || 0) + Number(awaitingPayment.convenience_fee || 0),
      expiryDate: awaitingPayment.xendit_expires_at,
      reused: true,
    };
  }

  if (awaitingPayment) {
    await query(
      `UPDATE payments SET status = 'failed' WHERE id = ? AND status = 'awaiting_payment'`,
      [awaitingPayment.id]
    );
  }

  const id = newId();

  const successUrl = `${appUrl}/payment-success?ref=${id}`;
  const failureUrl = `${appUrl}/payment-failed?ref=${id}`;

  const { invoiceId, invoiceUrl, expiryDate } = await xendit.createInvoice({
    externalId: id,
    amount: totalAmount,
    payerEmail: student.email || undefined,
    description: `Tuition - ${student.student_number} - ${batch.school_year} ${batch.semester} Sem`,
    successRedirectUrl: successUrl,
    failureRedirectUrl: failureUrl,
    invoiceDuration,
  });

  // Use 'awaiting_payment' so cashier can't see/verify it until Xendit confirms
  await query(
    `INSERT INTO payments
     (id, batch_id, student_id, school_year, semester, amount, convenience_fee, payment_method,
      submitted_by, status, reference_number, xendit_invoice_id, xendit_invoice_url, xendit_expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'xendit', 'student', 'awaiting_payment', ?, ?, ?, ?)`,
    [id, batch_id, student_id, batch.school_year, batch.semester, baseAmount, convFee, invoiceId, invoiceId, invoiceUrl, expiryDate ? new Date(expiryDate).toISOString().slice(0, 19).replace('T', ' ') : null]
  );

  await audit.log({
    actor_id: student_id,
    actor_name: student.student_number,
    actor_role: 'student',
    action: 'xendit_invoice_created',
    entity: 'payment',
    entity_id: id,
    description: `Created Xendit invoice for ${student.student_number}.`,
    details: {
      batch_id,
      student_id,
      amount: baseAmount,
      convenience_fee: convFee,
      total_amount: totalAmount,
      xendit_invoice_id: invoiceId,
      xendit_expires_at: expiryDate,
    },
  });

  return { paymentId: id, invoiceUrl, baseAmount, convFee, totalAmount, expiryDate };
}

async function cancelXenditInvoice(paymentId, studentId) {
  const { rows } = await query(
    `SELECT id, student_id, status, xendit_invoice_id FROM payments WHERE id = ?`,
    [paymentId]
  );
  const payment = rows[0];
  if (!payment) throw Object.assign(new Error('Payment not found'), { status: 404 });
  if (payment.student_id !== studentId) throw Object.assign(new Error('Forbidden'), { status: 403 });
  const syncedPayment = await syncXenditPaymentStatus(payment);
  if (syncedPayment.status === 'verified') {
    throw Object.assign(new Error('Payment already completed and can no longer be cancelled'), { status: 422 });
  }
  if (syncedPayment.status !== 'awaiting_payment') {
    throw Object.assign(new Error('Only awaiting payments can be cancelled'), { status: 422 });
  }
  if (syncedPayment.xendit_invoice_id) {
    try {
      await xendit.expireInvoice(syncedPayment.xendit_invoice_id);
    } catch {
      // Keep local cancel behavior even if provider-side expiry is unavailable.
    }
  }
  await query(`UPDATE payments SET status = 'cancelled' WHERE id = ?`, [paymentId]);
  await audit.log({
    actor_id: studentId,
    actor_name: String(studentId),
    actor_role: 'student',
    action: 'xendit_invoice_cancelled',
    entity: 'payment',
    entity_id: paymentId,
    description: 'Student cancelled a pending Xendit checkout locally.',
    details: {
      payment_id: paymentId,
      xendit_invoice_id: payment.xendit_invoice_id,
    },
  });
  return { cancelled: true };
}

async function handleXenditWebhook(body, callbackToken) {
  if (!xendit.verifyWebhookToken(callbackToken)) {
    throw Object.assign(new Error('Invalid Xendit callback token'), { status: 401 });
  }

  const event = typeof body === 'string' ? JSON.parse(body) : body;
  const status = String(event.status || '').toUpperCase();
  const invoiceId = event.id;
  const paymentMethod = normalizeXenditMethod(event);

  await audit.log({
    actor_name: 'Xendit Webhook',
    actor_role: 'system',
    action: 'xendit_webhook_received',
    entity: 'payment',
    entity_id: invoiceId || null,
    description: `Received Xendit webhook with status '${status || 'UNKNOWN'}'.`,
    details: event,
  });

  if (status === 'PAID' || status === 'SETTLED') {
    const { rows } = await query(
      `SELECT p.id, p.batch_id, eb.assessed_amount FROM payments p
       JOIN enrollment_batches eb ON eb.id = p.batch_id
       WHERE p.xendit_invoice_id = ? AND p.status IN ('awaiting_payment', 'failed')`,
      [invoiceId]
    );
    if (rows[0]) {
      await query(
        `UPDATE payments
         SET status = 'verified', payment_method = ?, paid_at = NOW(), verified_at = NOW()
         WHERE xendit_invoice_id = ? AND status IN ('awaiting_payment', 'failed')`,
        [paymentMethod || 'xendit', invoiceId]
      );
      await audit.log({
        actor_name: 'Xendit Webhook',
        actor_role: 'system',
        action: 'xendit_payment_verified',
        entity: 'payment',
        entity_id: rows[0].id,
        description: `Marked payment ${rows[0].id} as verified from Xendit webhook.`,
        details: {
          status,
          xendit_invoice_id: invoiceId,
          payment_method: paymentMethod || 'xendit',
        },
      });

      // Cancel any other dangling awaiting_payment for the same batch
      // (can happen when student retries and a new invoice was created but they paid the old one)
      if (rows[0].batch_id) {
        await query(
          `UPDATE payments SET status = 'failed'
           WHERE batch_id = ? AND status = 'awaiting_payment' AND xendit_invoice_id != ?`,
          [rows[0].batch_id, invoiceId]
        );
      }

      await checkAndAutoEnroll(rows[0].batch_id, rows[0].assessed_amount);
    }
  } else if (status === 'EXPIRED' || status === 'FAILED') {
    const { rows } = await query(
      `SELECT id FROM payments WHERE xendit_invoice_id = ? AND status = 'awaiting_payment'`,
      [invoiceId]
    );
    await query(
      `UPDATE payments SET status = 'failed' WHERE xendit_invoice_id = ? AND status = 'awaiting_payment'`,
      [invoiceId]
    );
    if (rows[0]) {
      const failReason = status === 'FAILED' ? 'Xendit reported payment failure.' : 'Xendit invoice expired.';
      await audit.log({
        actor_name: 'Xendit Webhook',
        actor_role: 'system',
        action: 'xendit_payment_failed',
        entity: 'payment',
        entity_id: rows[0].id,
        description: `Marked payment ${rows[0].id} as failed. ${failReason}`,
        details: {
          status,
          xendit_invoice_id: invoiceId,
        },
      });
    }
  }

  return { processed: true, status };
}

module.exports = {
  list,
  getById,
  createLink,
  handleWebhook,
  refund,
  listByBatch,
  recordCash,
  recordInstallment,
  submitOnline,
  verify,
  reject,
  checkAndAutoEnroll,
  createXenditInvoice,
  cancelXenditInvoice,
  handleXenditWebhook,
};
