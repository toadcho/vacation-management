const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Joi 검증 에러
  if (err.isJoi) {
    return res.status(400).json({
      error: 'Validation Error',
      details: err.details.map(d => ({
        message: d.message,
        field: d.path.join('.')
      }))
    });
  }

  // Firebase 에러 (err.code가 문자열인 경우만 체크)
  if (err.code && typeof err.code === 'string' && err.code.startsWith('auth/')) {
    return res.status(401).json({
      error: 'Authentication Error',
      message: err.message
    });
  }

  // 기본 에러
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack
    })
  });
};

module.exports = errorHandler;
