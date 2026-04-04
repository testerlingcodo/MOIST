const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { query, newId } = require('../../config/db');
const { sendOtpEmail, sendWelcomeEmail } = require('../email/email.service');

async function login(identifier, password) {
  // identifier can be a student_number (for students) or email (for staff/admin roles)
  const { rows } = await query(
    `SELECT u.id, u.email, u.password, u.role, u.is_active
     FROM users u
     LEFT JOIN students s ON s.user_id = u.id
     WHERE s.student_number = ? OR u.email = ?
     LIMIT 1`,
    [identifier, identifier]
  );

  const user = rows[0];
  if (!user || !user.is_active) {
    throw Object.assign(new Error('Invalid credentials'), { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    throw Object.assign(new Error('Invalid credentials'), { status: 401 });
  }

  let studentId = null;
  if (user.role === 'student') {
    const { rows: sr } = await query(
      'SELECT id, status FROM students WHERE user_id = ?', [user.id]
    );
    if (sr[0]?.status === 'pending') {
      throw Object.assign(
        new Error('Your registration is pending approval from the Registrar.'),
        { status: 403 }
      );
    }
    if (sr[0]?.status === 'rejected') {
      throw Object.assign(
        new Error('Your registration was not approved. Please contact the Registrar.'),
        { status: 403 }
      );
    }
    studentId = sr[0]?.id || null;
  }

  const accessToken = signAccessToken({ sub: user.id, role: user.role, studentId });
  const { token: refreshToken, hash } = generateRefreshToken();

  await query(
    `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at)
     VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))`,
    [newId(), user.id, hash]
  );

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, role: user.role, studentId },
  };
}

async function refresh(refreshToken) {
  const hash = hashToken(refreshToken);
  const { rows } = await query(
    `SELECT rt.id, rt.user_id, u.role, u.is_active
     FROM refresh_tokens rt
     JOIN users u ON u.id = rt.user_id
     WHERE rt.token_hash = ? AND rt.revoked = 0 AND rt.expires_at > NOW()`,
    [hash]
  );

  const record = rows[0];
  if (!record || !record.is_active) {
    throw Object.assign(new Error('Invalid refresh token'), { status: 401 });
  }

  await query('UPDATE refresh_tokens SET revoked = 1 WHERE id = ?', [record.id]);

  let studentId = null;
  if (record.role === 'student') {
    const { rows: sr } = await query(
      'SELECT id FROM students WHERE user_id = ?', [record.user_id]
    );
    studentId = sr[0]?.id || null;
  }

  const accessToken = signAccessToken({ sub: record.user_id, role: record.role, studentId });
  const { token: newRefreshToken, hash: newHash } = generateRefreshToken();

  await query(
    `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at)
     VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))`,
    [newId(), record.user_id, newHash]
  );

  return { accessToken, refreshToken: newRefreshToken };
}

async function logout(refreshToken) {
  if (!refreshToken) return;
  const hash = hashToken(refreshToken);
  await query('UPDATE refresh_tokens SET revoked = 1 WHERE token_hash = ?', [hash]);
}

async function getMe(userId) {
  const { rows } = await query(
    `SELECT u.id, u.email, u.role, u.is_active,
            s.id AS student_id, s.student_number, s.first_name, s.last_name
     FROM users u
     LEFT JOIN students s ON s.user_id = u.id
     WHERE u.id = ?`,
    [userId]
  );
  if (!rows[0]) throw Object.assign(new Error('User not found'), { status: 404 });
  return rows[0];
}

function signAccessToken(payload) {
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  });
}

function generateRefreshToken() {
  const token = crypto.randomBytes(40).toString('hex');
  return { token, hash: hashToken(token) };
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function generateStudentNumber() {
  const { rows } = await query(
    `SELECT student_number FROM students
     WHERE student_number REGEXP '^C[0-9]+$'
     ORDER BY CAST(SUBSTRING(student_number, 2) AS UNSIGNED) DESC
     LIMIT 1`
  );
  if (!rows[0]) return 'C001';
  const last = parseInt(rows[0].student_number.slice(1), 10);
  return 'C' + String(last + 1).padStart(3, '0');
}

async function register(data) {
  const {
    first_name, last_name, middle_name, birthdate, gender,
    address, contact_number, email, year_level, course, password,
  } = data;

  if (!first_name || !last_name || !password || !email) {
    throw Object.assign(new Error('First name, last name, email, and password are required'), { status: 400 });
  }
  if (password.length < 8) {
    throw Object.assign(new Error('Password must be at least 8 characters'), { status: 400 });
  }

  const { rows: existing } = await query('SELECT id FROM users WHERE email = ?', [email]);
  if (existing[0]) throw Object.assign(new Error('Email already in use'), { status: 409 });

  const student_number = await generateStudentNumber();
  const hash = await bcrypt.hash(password, 10);
  const userId = newId();
  await query(
    'INSERT INTO users (id, email, password, role) VALUES (?, ?, ?, ?)',
    [userId, email || null, hash, 'student']
  );

  const studentId = newId();
  await query(
    `INSERT INTO students
     (id, user_id, student_number, first_name, last_name, middle_name,
      birthdate, gender, address, contact_number, email, year_level, course, status)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [studentId, userId, student_number, first_name, last_name, middle_name || null,
     birthdate || null, gender || null, address || null, contact_number || null,
     email || null, year_level || null, course || null, 'pending']
  );

  // Send welcome email (non-blocking)
  sendWelcomeEmail(email, first_name, student_number).catch(err =>
    console.error('[Email] Failed to send welcome email:', err.message, err.response?.data || '')
  );

  return { studentNumber: student_number, message: 'Registration submitted. Pending Registrar approval.' };
}

async function forgotPassword(email) {
  const { rows } = await query(
    `SELECT u.id, s.first_name FROM users u
     LEFT JOIN students s ON s.user_id = u.id
     WHERE u.email = ? AND u.is_active = 1`,
    [email]
  );
  // Always respond success to prevent email enumeration
  if (!rows[0]) return { message: 'If that email exists, an OTP has been sent.' };

  const firstName = rows[0].first_name;

  // Invalidate old OTPs for this email
  await query("UPDATE password_resets SET used = 1 WHERE email = ? AND used = 0", [email]);

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  await query(
    `INSERT INTO password_resets (id, email, otp, expires_at)
     VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE))`,
    [newId(), email, otp]
  );

  try {
    await sendOtpEmail(email, otp, firstName);
  } catch (emailErr) {
    console.error('[Email] Failed to send OTP email:', emailErr.message, emailErr.response?.data || '');
  }

  return {
    message: 'If that email exists, an OTP has been sent.',
  };
}

async function resetPassword(email, otp, newPassword) {
  const { rows } = await query(
    `SELECT id FROM password_resets
     WHERE email = ? AND otp = ? AND used = 0 AND expires_at > NOW()`,
    [email, otp]
  );
  if (!rows[0]) throw Object.assign(new Error('Invalid or expired OTP'), { status: 400 });

  const hash = await bcrypt.hash(newPassword, 10);
  await query('UPDATE users SET password = ? WHERE email = ?', [hash, email]);
  await query('UPDATE password_resets SET used = 1 WHERE id = ?', [rows[0].id]);

  return { message: 'Password reset successfully.' };
}

module.exports = { login, refresh, logout, getMe, register, forgotPassword, resetPassword };
