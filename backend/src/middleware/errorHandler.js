function errorHandler(err, req, res, next) {
  console.error(err);

  if (err.isJoi) {
    return res.status(422).json({
      error: 'Validation error',
      details: err.details.map((d) => d.message),
    });
  }

  if (err.code === '23505') {
    return res.status(409).json({ error: 'Duplicate entry: record already exists' });
  }

  if (err.code === '23503') {
    return res.status(409).json({ error: 'Referenced record does not exist' });
  }

  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: err.message || 'Internal server error',
  });
}

module.exports = errorHandler;
