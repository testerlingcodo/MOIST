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
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Security
app.use(helmet());
app.use(cors({
  origin: process.env.APP_URL || 'http://localhost:3000',
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

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use(errorHandler);

module.exports = app;
