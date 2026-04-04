const Brevo = require('@getbrevo/brevo');

function getClient() {
  const client = new Brevo.TransactionalEmailsApi();
  client.authentications['apiKey'].apiKey = process.env.BREVO_API_KEY;
  return client;
}

const SENDER = {
  name: 'MOIST SIS',
  email: process.env.BREVO_SENDER || 'moistsis.portal@gmail.com',
};

function isReady() {
  return !!process.env.BREVO_API_KEY;
}

function header() {
  return `
    <tr>
      <td style="background:linear-gradient(135deg,#5a0d1a,#7a1324,#a01830);padding:32px 24px;text-align:center">
        <div style="color:#ffd700;font-size:13px;font-weight:900;letter-spacing:2px">MOIST, INC.</div>
        <div style="color:rgba(255,255,255,.75);font-size:11px;margin-top:4px">Student Information Portal</div>
      </td>
    </tr>`;
}

function footer() {
  return `
    <tr>
      <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 28px;text-align:center">
        <p style="margin:0;font-size:11px;color:#94a3b8">MOIST, INC. – Student Information Portal<br>This is an automated message. Please do not reply.</p>
      </td>
    </tr>`;
}

function wrap(content) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
        ${header()}
        ${content}
        ${footer()}
      </table>
    </td></tr>
  </table>
</body></html>`;
}

async function send(toEmail, subject, htmlContent) {
  const api = getClient();
  const email = new Brevo.SendSmtpEmail();
  email.sender = SENDER;
  email.to = [{ email: toEmail }];
  email.subject = subject;
  email.htmlContent = htmlContent;
  await api.sendTransacEmail(email);
}

async function sendOtpEmail(toEmail, otp, firstName) {
  if (!isReady()) {
    console.log(`\n🔑 PASSWORD RESET OTP for ${toEmail}: ${otp} (expires in 15 mins)\n`);
    return;
  }

  const content = `
    <tr><td style="padding:32px 28px">
      <p style="margin:0 0 8px;font-size:20px;font-weight:800;color:#1e293b">Password Reset</p>
      <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.6">
        Hi ${firstName || 'Student'},<br>
        We received a request to reset your password. Use the OTP below — it expires in <strong>15 minutes</strong>.
      </p>
      <div style="background:#f8fafc;border:2px dashed #e2e8f0;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
        <div style="font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:8px">Your OTP Code</div>
        <div style="font-size:40px;font-weight:900;letter-spacing:10px;color:#1e293b">${otp}</div>
      </div>
      <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.6">
        If you did not request a password reset, you can safely ignore this email.
      </p>
    </td></tr>`;

  await send(toEmail, 'Your Password Reset OTP – MOIST SIS', wrap(content));
}

async function sendWelcomeEmail(toEmail, firstName, studentNumber) {
  if (!isReady()) return;

  const content = `
    <tr><td style="padding:40px 24px;text-align:center;background:linear-gradient(135deg,#5a0d1a,#7a1324,#a01830)">
      <div style="font-size:40px">🎓</div>
      <div style="color:#fff;font-size:20px;font-weight:800;margin-top:8px">Welcome to MOIST SIS!</div>
    </td></tr>
    <tr><td style="padding:32px 28px">
      <p style="margin:0 0 16px;font-size:15px;color:#1e293b;line-height:1.6">Hi <strong>${firstName}</strong>,</p>
      <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.7">
        Your registration has been successfully submitted to <strong>MOIST Student Information System</strong>.
        Please wait for the Registrar to review and approve your account before you can log in.
      </p>
      <div style="background:linear-gradient(135deg,#f8fafc,#f1f5f9);border:2px solid #e2e8f0;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px">
        <div style="font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:8px">Your Student Number</div>
        <div style="font-size:28px;font-weight:900;letter-spacing:4px;color:#7a1324">${studentNumber}</div>
        <div style="font-size:12px;color:#94a3b8;margin-top:8px">Keep this for your records</div>
      </div>
      <div style="background:#fefce8;border:1px solid #fde68a;border-radius:10px;padding:16px">
        <p style="margin:0;font-size:13px;color:#92400e;line-height:1.6">
          <strong>⏳ What's next?</strong><br>
          Once approved, you can log in using your student number and password.
        </p>
      </div>
    </td></tr>`;

  await send(toEmail, 'Welcome to MOIST SIS! 🎓', wrap(content));
}

module.exports = { sendOtpEmail, sendWelcomeEmail };
