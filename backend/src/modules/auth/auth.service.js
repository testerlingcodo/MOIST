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
            s.id AS student_id, s.student_number, s.first_name, s.last_name,
            s.course, s.major, s.year_level
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

function normalizeEmailInput(email) {
  const normalizedEmail = typeof email === 'string' ? email.trim() : '';
  if (!normalizedEmail) {
    throw Object.assign(new Error('Email is required'), { status: 400 });
  }
  return normalizedEmail;
}

function normalizeOtpInput(otp) {
  const normalizedOtp = typeof otp === 'string' ? otp.trim() : '';
  if (!/^\d{6}$/.test(normalizedOtp)) {
    throw Object.assign(new Error('Enter a valid 6-digit OTP'), { status: 400 });
  }
  return normalizedOtp;
}

function normalizeResetTokenInput(resetToken) {
  const normalizedToken = typeof resetToken === 'string' ? resetToken.trim() : '';
  if (!/^[a-f0-9]{64}$/i.test(normalizedToken)) {
    throw Object.assign(new Error('Invalid or expired reset session. Please start over.'), { status: 400 });
  }
  return normalizedToken;
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
    first_name, last_name, middle_name, name_extension,
    birthdate, birthplace, gender, civil_status,
    address, contact_number, email, course, major, year_level,
    guardian_name, guardian_contact, enrollment_type,
    mother_name, father_name,
    elementary_school, elementary_year,
    junior_high_school, junior_high_year,
    senior_high_school, strand, senior_high_year,
    school_last_attended, school_last_attended_address,
    course_section_last_attended, year_last_attended,
    disability_type, disability_cause,
    school_year, semester,
    employment_status, company_name, company_location,
    religion, als_info, ip_info, is_solo_parent,
    password,
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
    [userId, email, hash, 'student']
  );

  const studentId = newId();
  await query(
    `INSERT INTO students
     (id, user_id, student_number, first_name, last_name, middle_name, name_extension,
      birthdate, birthplace, gender, civil_status, address, contact_number, email,
      course, major, year_level, guardian_name, guardian_contact, enrollment_type,
      mother_name, father_name,
      elementary_school, elementary_year, junior_high_school, junior_high_year,
      senior_high_school, strand, senior_high_year,
      school_last_attended, school_last_attended_address, course_section_last_attended, year_last_attended,
      disability_type, disability_cause, school_year, semester,
      employment_status, company_name, company_location,
      religion, als_info, ip_info, is_solo_parent, consent_given, status)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      studentId, userId, student_number, first_name, last_name, middle_name || null, name_extension || null,
      birthdate || null, birthplace || null, gender || null, civil_status || 'single',
      address || null, contact_number || null, email,
      course || null, major || null, year_level ? parseInt(year_level) : null, guardian_name || null, guardian_contact || null, enrollment_type || null,
      mother_name || null, father_name || null,
      elementary_school || null, elementary_year || null, junior_high_school || null, junior_high_year || null,
      senior_high_school || null, strand || null, senior_high_year || null,
      school_last_attended || null, school_last_attended_address || null,
      course_section_last_attended || null, year_last_attended || null,
      disability_type || 'N/A', disability_cause || 'N/A',
      school_year || null, semester || null,
      employment_status || 'not_employed', company_name || null, company_location || null,
      religion || null, als_info || null, ip_info || null,
      is_solo_parent ? 1 : 0, 1, 'pending',
    ]
  );

  // Send welcome email (non-blocking)
  sendWelcomeEmail(email, first_name, student_number).catch(err =>
    console.error('[Email] Failed to send welcome email:', err.message, err.response?.data || '')
  );

  return { studentNumber: student_number, message: 'Registration submitted. Pending Registrar approval.' };
}

async function forgotPassword(email) {
  const normalizedEmail = normalizeEmailInput(email);
  const { rows } = await query(
    `SELECT u.id, s.first_name FROM users u
     LEFT JOIN students s ON s.user_id = u.id
     WHERE u.email = ? AND u.is_active = 1`,
    [normalizedEmail]
  );
  // Always respond success to prevent email enumeration
  if (!rows[0]) return { message: 'If that email exists, an OTP has been sent.' };

  const firstName = rows[0].first_name;

  // Cooldown: reject if an OTP was sent less than 60 seconds ago
  const { rows: recent } = await query(
    `SELECT created_at FROM password_resets
     WHERE email = ? AND used = 0 AND created_at > DATE_SUB(NOW(), INTERVAL 60 SECOND)
     ORDER BY created_at DESC LIMIT 1`,
    [normalizedEmail]
  );
  if (recent[0]) {
    throw Object.assign(new Error('Please wait 60 seconds before requesting a new OTP'), { status: 429 });
  }

  // Invalidate old OTPs for this email
  await query("UPDATE password_resets SET used = 1 WHERE email = ? AND used = 0", [normalizedEmail]);

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  await query(
    `INSERT INTO password_resets (id, email, otp, expires_at)
     VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE))`,
    [newId(), normalizedEmail, otp]
  );

  try {
    await sendOtpEmail(normalizedEmail, otp, firstName);
  } catch (emailErr) {
    console.error('[Email] Failed to send OTP email:', emailErr.message, emailErr.response?.data || '');
  }

  return {
    message: 'If that email exists, an OTP has been sent.',
  };
}

async function verifyOtp(email, otp) {
  const normalizedEmail = normalizeEmailInput(email);
  const normalizedOtp = normalizeOtpInput(otp);
  const { rows } = await query(
    `SELECT id FROM password_resets
     WHERE email = ? AND otp = ? AND used = 0 AND expires_at > NOW()`,
    [normalizedEmail, normalizedOtp]
  );
  if (!rows[0]) throw Object.assign(new Error('Invalid or expired OTP'), { status: 400 });

  // Issue a short-lived reset token (10 minutes) — only this token allows password reset
  const resetToken = crypto.randomBytes(32).toString('hex');
  await query(
    `UPDATE password_resets
     SET reset_token = ?, token_expires_at = DATE_ADD(NOW(), INTERVAL 10 MINUTE)
     WHERE id = ?`,
    [resetToken, rows[0].id]
  );

  return { resetToken };
}

async function resetPassword(email, resetToken, newPassword) {
  const normalizedEmail = normalizeEmailInput(email);
  const normalizedResetToken = normalizeResetTokenInput(resetToken);
  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    throw Object.assign(new Error('Password must be at least 8 characters'), { status: 400 });
  }

  const { rows } = await query(
    `SELECT id FROM password_resets
     WHERE email = ? AND reset_token = ? AND used = 0
       AND token_expires_at > NOW()`,
    [normalizedEmail, normalizedResetToken]
  );
  if (!rows[0]) throw Object.assign(new Error('Invalid or expired reset session. Please start over.'), { status: 400 });

  const hash = await bcrypt.hash(newPassword, 10);
  await query('UPDATE users SET password = ? WHERE email = ?', [hash, normalizedEmail]);
  await query(
    'UPDATE password_resets SET used = 1, reset_token = NULL, token_expires_at = NULL WHERE id = ?',
    [rows[0].id]
  );

  return { message: 'Password reset successfully.' };
}

module.exports = { login, refresh, logout, getMe, register, forgotPassword, verifyOtp, resetPassword };
