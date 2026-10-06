export function noStore(req, res, next) {
  res.set('Cache-Control', 'no-store');
  next();
}

export function noCache(req, res, next) {
  res.set('Cache-Control', 'no-cache');
  next();
}
