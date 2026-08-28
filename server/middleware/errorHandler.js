export function notFound(req, res) {
  res.status(404).json({ success: false, message: 'Route not found.' });
}
export function errorHandler(err, req, res, next) {
  console.error(err);

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation failed. Please check your input.',
    });
  }

  if (err.type === 'entity.too.large') {
    return res.status(413).json({ success: false, message: 'Request body too large.' });
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Malformed request body.' });
  }

  res.status(err.status || 500).json({
    success: false,
    message: 'Something went wrong. Please try again later.',
  });
}
