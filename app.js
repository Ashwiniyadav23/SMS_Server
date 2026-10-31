const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const mongoose = require("mongoose");
const studentRoutes = require("./routes/studentRoutes");
const assistantRoutes = require("./routes/assistantRoutes");
const authRoutes = require("./routes/authRoutes");
const { requireAuth } = require("./middleware/auth");
const errorHandler = require("./middleware/errorHandler");

const app = express();
const allowedOrigins = process.env.FRONTEND_ORIGIN
  ? new Set(process.env.FRONTEND_ORIGIN.split(",").map((origin) => origin.trim()).filter(Boolean))
  : null;

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || !allowedOrigins || allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error("Origin is not allowed by the server"));
  },
}));
app.use(express.json({ limit: "10kb" }));
app.use(morgan("dev"));

app.get("/", (_req, res) => res.json({ message: "Student API is running!" }));
app.use("/api/assistant", assistantRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/students", (_req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ message: "Database is unavailable. Check the MongoDB connection and try again." });
  }
  next();
});
app.use("/api/students", requireAuth, studentRoutes);
app.use(errorHandler);

module.exports = app;
