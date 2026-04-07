export function errorHandler(err, req, res, next) {
  console.error('[Error]', err.message);
  console.error(err.stack);

  if (err.name === 'PrismaClientKnownRequestError') {
    return res.status(400).json({ message: 'Database error', detail: err.message });
  }

  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
  });
}
