const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      unique: true,
    },
    course: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    year: { type: String, required: true, enum: ["1st Year", "2nd Year", "3rd Year", "4th Year", "Graduate"] },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Student", studentSchema);
