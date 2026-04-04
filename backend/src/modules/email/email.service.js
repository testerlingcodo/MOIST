const nodemailer = require('nodemailer');

function getTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

async function sendOtpEmail(toEmail, otp, firstName) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.log(`\n🔑 PASSWORD RESET OTP for ${toEmail}: ${otp} (expires in 15 mins)\n`);
    return;
  }

  const transporter = getTransporter();
  await transporter.sendMail({
    from: `"MOIST SIS" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject: 'Your Password Reset OTP – MOIST SIS',
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:480px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#5a0d1a,#7a1324,#a01830);padding:32px 24px;text-align:center">
              <div style="color:#ffd700;font-size:13px;font-weight:900;letter-spacing:2px">MOIST, INC.</div>
              <div style="color:rgba(255,255,255,.75);font-size:11px;margin-top:4px">Student Information Portal</div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 28px">
              <p style="margin:0 0 8px;font-size:20px;font-weight:800;color:#1e293b">Password Reset</p>
              <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.6">
                Hi ${firstName || 'Student'},<br>
                We received a request to reset your password. Use the OTP below — it expires in <strong>15 minutes</strong>.
              </p>

              <!-- OTP Box -->
              <div style="background:#f8fafc;border:2px dashed #e2e8f0;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
                <div style="font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:8px">Your OTP Code</div>
                <div style="font-size:40px;font-weight:900;letter-spacing:10px;color:#1e293b">${otp}</div>
              </div>

              <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.6">
                If you did not request a password reset, you can safely ignore this email. Your password will not be changed.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 28px;text-align:center">
              <p style="margin:0;font-size:11px;color:#94a3b8">
                MOIST, INC. – Student Information Portal<br>
                This is an automated message. Please do not reply.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  });
}

module.exports = { sendOtpEmail };
