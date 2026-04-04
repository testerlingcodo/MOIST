const axios = require('axios');
const crypto = require('crypto');

const BASE_URL = 'https://api.paymongo.com/v1';

function getHeaders() {
  const encoded = Buffer.from(`${process.env.PAYMONGO_SECRET_KEY}:`).toString('base64');
  return {
    Authorization: `Basic ${encoded}`,
    'Content-Type': 'application/json',
  };
}

async function createPaymentLink({ amount, description, metadata = {} }) {
  // PayMongo expects amount in centavos
  const amountInCentavos = Math.round(amount * 100);

  const response = await axios.post(
    `${BASE_URL}/links`,
    {
      data: {
        attributes: {
          amount: amountInCentavos,
          description,
          remarks: metadata.student_number || '',
        },
      },
    },
    { headers: getHeaders() }
  );

  const link = response.data.data;
  return {
    linkId: link.id,
    checkoutUrl: link.attributes.checkout_url,
    referenceNumber: link.attributes.reference_number,
    status: link.attributes.status,
  };
}

async function retrievePaymentLink(linkId) {
  const response = await axios.get(`${BASE_URL}/links/${linkId}`, {
    headers: getHeaders(),
  });
  const link = response.data.data;
  return {
    linkId: link.id,
    status: link.attributes.status,
    payments: link.attributes.payments || [],
  };
}

async function createRefund({ paymentId, amount, reason = 'others' }) {
  const amountInCentavos = Math.round(amount * 100);
  const response = await axios.post(
    `${BASE_URL}/refunds`,
    {
      data: {
        attributes: {
          amount: amountInCentavos,
          payment_id: paymentId,
          reason,
        },
      },
    },
    { headers: getHeaders() }
  );
  return response.data.data;
}

function verifyWebhookSignature(rawBody, signatureHeader) {
  const secret = process.env.PAYMONGO_WEBHOOK_SECRET;
  if (!secret) return false;

  // PayMongo signature format: "t=timestamp,te=hash,li=hash"
  const parts = signatureHeader.split(',');
  const tPart = parts.find((p) => p.startsWith('t='));
  const tePart = parts.find((p) => p.startsWith('te='));

  if (!tPart || !tePart) return false;

  const timestamp = tPart.split('=')[1];
  const signature = tePart.split('=')[1];
  const payload = `${timestamp}.${rawBody}`;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

module.exports = {
  createPaymentLink,
  retrievePaymentLink,
  createRefund,
  verifyWebhookSignature,
};
