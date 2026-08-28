export function notFound(req, res) {
  res.status(404).json({
    success: false,
    message: 'Route not found.',
  });
}

export function errorHandler(err, req, res, next) {
  console.error(
    `[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`,
    err
  );

  if (err?.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation failed. Please check your input.',
    });
  }

  if (err?.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      message: 'Request body too large.',
    });
  }

  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      message: 'Malformed request body.',
    });
  }

  if (err?.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'Origin is not allowed.',
    });
  }

  return res.status(err?.status || 500).json({
    success: false,
    message:
      err?.status && err.status < 500
        ? err.message || 'Request could not be completed.'
        : 'Something went wrong. Please try again later.',
  });
}