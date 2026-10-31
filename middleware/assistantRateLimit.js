const requests = new Map()
const windowMs = 5 * 60 * 1000
const maxRequests = 10

function assistantRateLimit(req, res, next) {
  const now = Date.now()
  for (const [ip, request] of requests) {
    if (request.resetAt <= now) requests.delete(ip)
  }

  const ip = req.ip || req.socket.remoteAddress || 'unknown'
  const current = requests.get(ip)
  if (current && current.resetAt > now && current.count >= maxRequests) {
    res.set('Retry-After', String(Math.ceil((current.resetAt - now) / 1000)))
    return res.status(429).json({ message: 'Assistant limit reached. Try again in a few minutes.' })
  }

  if (current && current.resetAt > now) current.count += 1
  else requests.set(ip, { count: 1, resetAt: now + windowMs })
  next()
}

module.exports = assistantRateLimit
