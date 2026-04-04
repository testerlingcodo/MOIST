const axios = require('axios');

const BASE_URL = 'https://api.xendit.co';

function getAuthHeader() {
  const key = process.env.XENDIT_SECRET_KEY || '';
  return 'Basic ' + Buffer.from(key + ':').toString('base64');
}

/**
 * Create a Xendit Invoice
 * @param {object} opts
 * @param {string} opts.externalId   - unique ID for this invoice (our payment row ID)
 * @param {number} opts.amount       - amount in PHP (already includes convenience fee)
 * @param {string} opts.payerEmail   - student email (optional)
 * @param {string} opts.description
 * @param {string} opts.successRedirectUrl
 * @param {string} opts.failureRedirectUrl
 * @returns {Promise<{invoiceId: string, invoiceUrl: string}>}
 */
async function createInvoice({ externalId, amount, payerEmail, description, successRedirectUrl, failureRedirectUrl, invoiceDuration }) {
  const body = {
    external_id: externalId,
    amount,
    description,
    currency: 'PHP',
    success_redirect_url: successRedirectUrl,
    failure_redirect_url: failureRedirectUrl,
    payment_methods: ['GCASH', 'PAYMAYA', 'OTC', 'CREDIT_CARD', 'QRPH'],
  };
  if (invoiceDuration) body.invoice_duration = invoiceDuration;
  if (payerEmail) body.payer_email = payerEmail;

  const res = await axios.post(`${BASE_URL}/v2/invoices`, body, {
    headers: {
      Authorization: getAuthHeader(),
      'Content-Type': 'application/json',
    },
  });

  return {
    invoiceId: res.data.id,
    invoiceUrl: res.data.invoice_url,
    expiryDate: res.data.expiry_date || null,
  };
}

async function getInvoice(invoiceId) {
  const res = await axios.get(`${BASE_URL}/v2/invoices/${invoiceId}`, {
    headers: {
      Authorization: getAuthHeader(),
      'Content-Type': 'application/json',
    },
  });

  return res.data;
}

async function expireInvoice(invoiceId) {
  const res = await axios.post(`${BASE_URL}/invoices/${invoiceId}/expire!`, null, {
    headers: {
      Authorization: getAuthHeader(),
      'Content-Type': 'application/json',
    },
  });

  return res.data;
}

/**
 * Verify that an incoming webhook came from Xendit.
 * Xendit sends the webhook token as the x-callback-token header.
 */
function verifyWebhookToken(headerToken) {
  const expected = process.env.XENDIT_WEBHOOK_TOKEN || '';
  if (!expected) return true; // skip check if not configured (dev)
  return headerToken === expected;
}

module.exports = { createInvoice, getInvoice, expireInvoice, verifyWebhookToken };
