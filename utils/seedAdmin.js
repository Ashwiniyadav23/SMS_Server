const bcrypt = require("bcryptjs");
const User = require("../models/User");

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.warn("Admin seed skipped: set ADMIN_EMAIL and ADMIN_PASSWORD in backend/.env.");
    return;
  }
  if (password.length < 8) {
    throw new Error("ADMIN_PASSWORD must contain at least 8 characters.");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await User.findOneAndUpdate(
    { email: email.trim().toLowerCase() },
    { $set: { name: "Administrator", email: email.trim().toLowerCase(), passwordHash, role: "admin" } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  console.log(`Admin account ready: ${email.trim().toLowerCase()}`);
}

module.exports = seedAdmin;
