const authService = require('./auth.service');

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

async function login(req, res, next) {
  try {
    const { studentNumber, email, password } = req.body;
    const identifier = studentNumber || email;
    const result = await authService.login(identifier, password);
    res.cookie('refreshToken', result.refreshToken, COOKIE_OPTS);
    res.json({ accessToken: result.accessToken, refreshToken: result.refreshToken, user: result.user });
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ error: 'No refresh token' });
    }
    const result = await authService.refresh(refreshToken);
    res.cookie('refreshToken', result.refreshToken, COOKIE_OPTS);
    res.json({ accessToken: result.accessToken });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    await authService.logout(refreshToken);
    res.clearCookie('refreshToken');
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
}

async function getMe(req, res, next) {
  try {
    const user = await authService.getMe(req.user.sub);
    res.json(user);
  } catch (err) {
    next(err);
  }
}

async function register(req, res, next) {
  try {
    const result = await authService.register(req.body);
    res.status(201).json(result);
  } catch (err) { next(err); }
}

async function forgotPassword(req, res, next) {
  try {
    const result = await authService.forgotPassword(req.body.email);
    res.json(result);
  } catch (err) { next(err); }
}

async function verifyOtp(req, res, next) {
  try {
    const { email, otp } = req.body;
    const result = await authService.verifyOtp(email, otp);
    res.json(result);
  } catch (err) { next(err); }
}

async function resetPassword(req, res, next) {
  try {
    const { email, otp, newPassword } = req.body;
    const result = await authService.resetPassword(email, otp, newPassword);
    res.json(result);
  } catch (err) { next(err); }
}

module.exports = { login, refresh, logout, getMe, register, forgotPassword, verifyOtp, resetPassword };
