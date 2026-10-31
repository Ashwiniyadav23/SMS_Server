const mongoose = require("mongoose");

let connectionPromise;
let app;

async function connectToDatabase() {
  if (mongoose.connection.readyState === 1) return;
  if (!process.env.MONGODB_URI) {
    const error = new Error("MONGODB_URI is not configured in Vercel project environment variables.");
    error.status = 503;
    throw error;
  }
  connectionPromise ||= mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
  });
  await connectionPromise;
}

module.exports = async function handler(req, res) {
  try {
    app ||= require("../app");
    if (req.method === "GET" && req.url === "/") {
      return res.status(200).json({ message: "Student API is running!" });
    }
    await connectToDatabase();
    return app(req, res);
  } catch (error) {
    connectionPromise = undefined;
    console.error("Vercel database connection failed:", error.message);
    return res.status(503).json({
      message: "The backend database is temporarily unavailable.",
    });
  }
};
