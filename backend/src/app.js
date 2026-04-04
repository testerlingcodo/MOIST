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
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.get('/payment-success', (req, res) => {
  res.send(`<!DOCTYPE html><html><head><meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Payment Successful</title>
  <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f0fdf4}
  .card{background:#fff;border-radius:20px;padding:40px 32px;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.08);max-width:360px;width:90%}
  .icon{font-size:64px;margin-bottom:16px}.title{font-size:22px;font-weight:800;color:#166534;margin-bottom:8px}
  .msg{font-size:14px;color:#6b7280;line-height:1.5}.note{margin-top:16px;font-size:12px;color:#9ca3af}</style>
  </head><body><div class="card">
  <div class="icon">✅</div>
  <div class="title">Payment Successful!</div>
  <div class="msg">Your payment has been received and is being processed.</div>
  <div class="note">You may close this window and return to the app.</div>
  </div></body></html>`);
});

app.get('/payment-failed', (req, res) => {
  res.send(`<!DOCTYPE html><html><head><meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Payment Failed</title>
  <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#fef2f2}
  .card{background:#fff;border-radius:20px;padding:40px 32px;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.08);max-width:360px;width:90%}
  .icon{font-size:64px;margin-bottom:16px}.title{font-size:22px;font-weight:800;color:#991b1b;margin-bottom:8px}
  .msg{font-size:14px;color:#6b7280;line-height:1.5}.note{margin-top:16px;font-size:12px;color:#9ca3af}</style>
  </head><body><div class="card">
  <div class="icon">❌</div>
  <div class="title">Payment Failed</div>
  <div class="msg">Your payment was not completed. Please try again.</div>
  <div class="note">You may close this window and return to the app.</div>
  </div></body></html>`);
});

app.use(errorHandler);

module.exports = app;
