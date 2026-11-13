/**
 * Rate limit simples em memoria (sem dependencias externas).
 *
 * Suficiente para desenvolvimento e para uma unica instancia da API.
 * Em producao com varias instancias, troque por Redis ou por um WAF.
 */
function rateLimit({ windowMs = 15 * 60 * 1000, max = 10, message } = {}) {
  const attempts = new Map();

  function prune(now) {
    if (attempts.size < 1000) return;
    for (const [key, entry] of attempts) {
      if (entry.resetAt <= now) attempts.delete(key);
    }
  }

  return function rateLimitMiddleware(req, res, next) {
    const now = Date.now();
    prune(now);

    const identifier = String(req.body?.email || '').trim().toLowerCase();
    const key = `${req.ip || 'unknown'}:${identifier}`;
    const entry = attempts.get(key);

    if (!entry || entry.resetAt <= now) {
      attempts.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    entry.count += 1;

    if (entry.count > max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
      res.set('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({
        error:
          message ||
          `Muitas tentativas. Tente novamente em ${Math.ceil(retryAfterSeconds / 60)} minuto(s).`,
      });
    }

    return next();
  };
}

module.exports = { rateLimit };
