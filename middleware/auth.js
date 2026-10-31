const jwt = require("jsonwebtoken");

function getJwtSecret() {
  if (!process.env.JWT_SECRET) {
    const error = new Error("JWT_SECRET is not configured in backend/.env");
    error.status = 503;
    throw error;
  }
  return process.env.JWT_SECRET;
}

function requireAuth(req, _res, next) {
  try {
    const authorization = req.get("authorization") || "";
    const [scheme, token] = authorization.split(" ");
    if (scheme !== "Bearer" || !token) {
      return next(Object.assign(new Error("Authentication required"), { status: 401 }));
    }
    req.user = jwt.verify(token, getJwtSecret());
    next();
  } catch (error) {
    if (error.status === 503) return next(error);
    next(Object.assign(new Error("Invalid or expired authentication token"), { status: 401, cause: error }));
  }
}

function allowRoles(...roles) {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(Object.assign(new Error("You do not have permission to perform this action"), { status: 403 }));
    }
    next();
  };
}

module.exports = { getJwtSecret, requireAuth, allowRoles };
