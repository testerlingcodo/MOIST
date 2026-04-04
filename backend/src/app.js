const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');

const authRoutes = require('./modules/auth/auth.routes');
const userRoutes = require('./modules/users/users.routes');
const studentRoutes = require('./modules/students/students.routes');
const subjectRoutes = require('./modules/subjects/subjects.routes');
const teacherRoutes = require('./modules/teachers/teachers.routes');
const enrollmentRoutes = require('./modules/enrollments/enrollments.routes');
const enrollmentBatchRoutes = require('./modules/enrollment_batches/enrollment_batches.routes');
const gradeRoutes = require('./modules/grades/grades.routes');
const tuitionRoutes = require('./modules/tuition/tuition.routes');
const courseRoutes = require('./modules/courses/courses.routes');
const paymentRoutes = require('./modules/payments/payments.routes');
const announcementRoutes = require('./modules/announcements/announcements.routes');
const documentRequestRoutes = require('./modules/document_requests/document_requests.routes');
const studentNotificationRoutes = require('./modules/student_notifications/student_notifications.routes');
const auditLogRoutes = require('./modules/audit_logs/audit_logs.routes');
const academicSettingsRoutes = require('./modules/academic_settings/academic_settings.routes');
const appVersionRoutes = require('./modules/app_version/app_version.routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Trust Railway's proxy
app.set('trust proxy', 1);

// Security
app.use(helmet());
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : ['http://localhost:3000', 'http://localhost:3001'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// Rate limiting (disabled in development to avoid 429 from React StrictMode double-effects)
if (process.env.NODE_ENV === 'production') {
  app.use('/api/', rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    message: { error: 'Too many requests, please try again later.' },
  }));
}

app.use(cookieParser());

// Webhook needs raw body for signature verification
app.use('/api/v1/payments/webhook', express.raw({ type: 'application/json' }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/students', studentRoutes);
app.use('/api/v1/subjects', subjectRoutes);
app.use('/api/v1/teachers', teacherRoutes);
app.use('/api/v1/enrollments', enrollmentRoutes);
app.use('/api/v1/enrollment-batches', enrollmentBatchRoutes);
app.use('/api/v1/grades', gradeRoutes);
app.use('/api/v1/tuition', tuitionRoutes);
app.use('/api/v1/courses', courseRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/announcements', announcementRoutes);
app.use('/api/v1/document-requests', documentRequestRoutes);
app.use('/api/v1/student-notifications', studentNotificationRoutes);
app.use('/api/v1/audit-logs', auditLogRoutes);
app.use('/api/v1/academic-settings', academicSettingsRoutes);

app.use('/api/v1/app-version', appVersionRoutes);
app.use(express.static(require('path').join(__dirname, '../public')));
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.get('/payment-success', async (req, res) => {
  const { query: dbQuery } = require('./config/db');
  const ref = req.query.ref || '';
  let payment = null;

  if (ref) {
    try {
      const { rows } = await dbQuery(
        `SELECT p.*, s.student_number, s.first_name, s.last_name, s.course, s.year_level
         FROM payments p
         JOIN students s ON s.id = p.student_id
         WHERE p.id = ?`,
        [ref]
      );
      payment = rows[0] || null;
    } catch (_) {}
  }

  const fmt = (n) => 'PHP ' + parseFloat(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const date = payment?.paid_at || payment?.created_at
    ? new Date(payment.paid_at || payment.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  res.send(`<!DOCTYPE html><html><head><meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Payment Receipt – MOIST, INC.</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Segoe UI',sans-serif;background:#f1f5f9;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:16px}
    .receipt{background:#fff;border-radius:16px;width:100%;max-width:420px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,.12)}
    .header{background:linear-gradient(135deg,#5a0d1a,#7a1324,#a01830);padding:28px 24px;text-align:center}
    .logo-circle{width:64px;height:64px;background:rgba(255,255,255,.15);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 12px;font-size:28px}
    .school{color:#ffd700;font-size:13px;font-weight:900;letter-spacing:2px}
    .school-sub{color:rgba(255,255,255,.75);font-size:11px;margin-top:2px}
    .badge{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.25);border-radius:20px;padding:6px 16px;margin-top:14px;color:#fff;font-size:12px;font-weight:700}
    .badge .dot{width:8px;height:8px;background:#4ade80;border-radius:50%}
    .body{padding:24px}
    .amount-box{background:#f8fafc;border:2px solid #e2e8f0;border-radius:12px;padding:20px;text-align:center;margin-bottom:20px}
    .amount-label{font-size:11px;color:#94a3b8;font-weight:700;letter-spacing:1px;text-transform:uppercase}
    .amount{font-size:32px;font-weight:900;color:#1e293b;margin-top:4px}
    .conv{font-size:12px;color:#94a3b8;margin-top:4px}
    .divider{border:none;border-top:2px dashed #e2e8f0;margin:16px 0}
    .section-label{font-size:10px;font-weight:800;color:#94a3b8;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:12px}
    .row{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px}
    .row-label{font-size:12px;color:#64748b}
    .row-value{font-size:12px;font-weight:700;color:#1e293b;text-align:right;max-width:55%}
    .ref{font-family:monospace;font-size:11px;color:#475569;background:#f1f5f9;padding:2px 6px;border-radius:4px}
    .footer{background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 24px;text-align:center}
    .footer-text{font-size:11px;color:#94a3b8;line-height:1.6}
    .close-btn{display:block;margin:12px auto 0;background:#7a1324;color:#fff;border:none;border-radius:8px;padding:10px 24px;font-size:13px;font-weight:700;cursor:pointer;width:100%}
  </style>
  </head><body>
  <div class="receipt">
    <div class="header">
      <img src="/moist-seal.png" alt="MOIST Seal" style="width:72px;height:72px;border-radius:50%;object-fit:cover;margin:0 auto 12px;display:block;background:rgba(255,255,255,.15);padding:4px">
      <div class="school">MOIST, INC.</div>
      <div class="school-sub">Student Information Portal</div>
      <div class="badge"><span class="dot"></span>Payment Confirmed</div>
    </div>
    <div class="body">
      <div class="amount-box">
        <div class="amount-label">Amount Paid</div>
        <div class="amount">${fmt(payment?.amount)}</div>
        ${payment?.convenience_fee ? `<div class="conv">Includes convenience fee of ${fmt(payment.convenience_fee)}</div>` : ''}
      </div>
      <div class="section-label">Student Information</div>
      <div class="row"><span class="row-label">Student No.</span><span class="row-value">${payment?.student_number || '—'}</span></div>
      <div class="row"><span class="row-label">Name</span><span class="row-value">${payment ? `${payment.last_name}, ${payment.first_name}` : '—'}</span></div>
      <div class="row"><span class="row-label">Course</span><span class="row-value">${payment?.course || '—'} ${payment?.year_level ? '– Year ' + payment.year_level : ''}</span></div>
      <hr class="divider">
      <div class="section-label">Payment Details</div>
      <div class="row"><span class="row-label">School Year</span><span class="row-value">${payment?.school_year || '—'}</span></div>
      <div class="row"><span class="row-label">Semester</span><span class="row-value">${payment?.semester || '—'}</span></div>
      <div class="row"><span class="row-label">Method</span><span class="row-value">Xendit Online Payment</span></div>
      <div class="row"><span class="row-label">Date</span><span class="row-value">${date}</span></div>
      <div class="row"><span class="row-label">Reference</span><span class="row-value"><span class="ref">${payment?.xendit_invoice_id || ref || '—'}</span></span></div>
      <div class="row"><span class="row-label">Status</span><span class="row-value" style="color:#16a34a">✓ Paid – Pending Verification</span></div>
    </div>
    <div class="footer">
      <div class="footer-text">This is an official payment receipt from MOIST, INC.<br>Keep this for your records. Verification may take 1–2 business days.</div>
      <button class="close-btn" onclick="closeAndReturn()">Close & Return to App</button>
    </div>
  </div>
  <script>
    function closeAndReturn() {
      const isMobile = /android|iphone|ipad|ipod/i.test(navigator.userAgent);
      if (isMobile) {
        window.close();
      } else {
        window.location.href = '${process.env.STUDENT_URL || 'https://moist-student.vercel.app'}/dashboard';
      }
    }
  </script>
  </body></html>`);
});

app.get('/payment-failed', (req, res) => {
  res.send(`<!DOCTYPE html><html><head><meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Payment Failed – MOIST, INC.</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Segoe UI',sans-serif;background:#f1f5f9;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:16px}
    .card{background:#fff;border-radius:16px;width:100%;max-width:420px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,.12)}
    .header{background:linear-gradient(135deg,#5a0d1a,#7a1324,#a01830);padding:28px 24px;text-align:center}
    .logo-circle{width:64px;height:64px;background:rgba(255,255,255,.15);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 12px;font-size:28px}
    .school{color:#ffd700;font-size:13px;font-weight:900;letter-spacing:2px}
    .school-sub{color:rgba(255,255,255,.75);font-size:11px;margin-top:2px}
    .badge{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.25);border-radius:20px;padding:6px 16px;margin-top:14px;color:#fff;font-size:12px;font-weight:700}
    .badge .dot{width:8px;height:8px;background:#f87171;border-radius:50%}
    .body{padding:32px 24px;text-align:center}
    .icon{font-size:56px;margin-bottom:16px}
    .title{font-size:20px;font-weight:800;color:#991b1b;margin-bottom:8px}
    .msg{font-size:13px;color:#64748b;line-height:1.6}
    .footer{background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 24px;text-align:center}
    .footer-text{font-size:11px;color:#94a3b8}
    .close-btn{display:block;margin:12px auto 0;background:#7a1324;color:#fff;border:none;border-radius:8px;padding:10px 24px;font-size:13px;font-weight:700;cursor:pointer;width:100%}
  </style>
  </head><body>
  <div class="card">
    <div class="header">
      <img src="/moist-seal.png" alt="MOIST Seal" style="width:72px;height:72px;border-radius:50%;object-fit:cover;margin:0 auto 12px;display:block;background:rgba(255,255,255,.15);padding:4px">
      <div class="school">MOIST, INC.</div>
      <div class="school-sub">Student Information Portal</div>
      <div class="badge"><span class="dot"></span>Payment Failed</div>
    </div>
    <div class="body">
      <div class="icon">❌</div>
      <div class="title">Payment Not Completed</div>
      <div class="msg">Your payment was not processed successfully.<br>Please return to the app and try again.<br><br>If the problem persists, contact the cashier's office.</div>
    </div>
    <div class="footer">
      <div class="footer-text">MOIST, INC. – Student Information Portal</div>
      <button class="close-btn" onclick="closeAndReturn()">Close & Return to App</button>
    </div>
  </div>
  <script>
    function closeAndReturn() {
      const isMobile = /android|iphone|ipad|ipod/i.test(navigator.userAgent);
      if (isMobile) {
        window.close();
      } else {
        window.location.href = '${process.env.STUDENT_URL || 'https://moist-student.vercel.app'}/dashboard';
      }
    }
  </script>
  </body></html>`);
});

app.use(errorHandler);

module.exports = app;
