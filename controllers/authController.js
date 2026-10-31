const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { getJwtSecret } = require("../middleware/auth");

function validateCredentials(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    const error = new Error("Request body must be a JSON object");
    error.status = 400;
    throw error;
  }
  const { name, email, password } = body;
  if (typeof email !== "string" || !email.trim() || typeof password !== "string" || password.length < 8) {
    const error = new Error("Email and a password of at least 8 characters are required");
    error.status = 400;
    throw error;
  }
  if (name !== undefined && (typeof name !== "string" || name.trim().length < 2)) {
    const error = new Error("Name must contain at least 2 characters");
    error.status = 400;
    throw error;
  }
  return { name: name?.trim(), email: email.trim().toLowerCase(), password };
}

function createToken(user) {
  return jwt.sign({ sub: user._id.toString(), email: user.email, role: user.role }, getJwtSecret(), { expiresIn: "2h" });
}

function serializeUser(user) {
  return { id: user._id, name: user.name, email: user.email, role: user.role };
}

async function register(req, res, next) {
  try {
    const credentials = validateCredentials(req.body);
    if (!credentials.name) {
      const error = new Error("Name is required when creating an account");
      error.status = 400;
      throw error;
    }
    const passwordHash = await bcrypt.hash(credentials.password, 12);
    const user = await User.create({ name: credentials.name, email: credentials.email, passwordHash });
    res.status(201).json({ token: createToken(user), user: serializeUser(user) });
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const credentials = validateCredentials(req.body);
    const user = await User.findOne({ email: credentials.email }).select("+passwordHash");
    const passwordMatches = user && await bcrypt.compare(credentials.password, user.passwordHash);
    if (!passwordMatches) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    res.json({ token: createToken(user), user: serializeUser(user) });
  } catch (error) {
    next(error);
  }
}

function me(req, res) {
  res.json({ user: req.user });
}

module.exports = { register, login, me };
