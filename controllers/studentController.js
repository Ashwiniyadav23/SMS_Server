const Student = require("../models/Student");
const { getCached, setCached, invalidateCache } = require("../services/redisService");
const studentFields = ["name", "email", "course", "year"];
const studentsCacheKey = "students:all";
const dashboardStatsCacheKey = "students:dashboard-stats";

function validateStudentInput(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    const error = new Error("Request body must be a JSON object");
    error.status = 400;
    throw error;
  }

  const unknownFields = Object.keys(body).filter((field) => !studentFields.includes(field));
  if (unknownFields.length) {
    const error = new Error(`Unexpected field: ${unknownFields[0]}`);
    error.status = 400;
    throw error;
  }

  const student = {};
  for (const field of studentFields) {
    const value = body[field];
    if (typeof value !== "string" || !value.trim()) {
      const error = new Error(`${field} is required and must be a non-empty string`);
      error.status = 400;
      throw error;
    }
    student[field] = value.trim();
  }

  student.email = student.email.toLowerCase();
  return student;
}

async function getStudents(_req, res, next) {
  try {
    const cached = await getCached(studentsCacheKey);
    if (cached) return res.json(cached);
    const students = await Student.find().sort({ createdAt: -1 });
    await setCached(studentsCacheKey, students);
    res.json(students);
  } catch (error) {
    next(error);
  }
}

async function getDashboardStats(_req, res, next) {
  try {
    const cached = await getCached(dashboardStatsCacheKey);
    if (cached) return res.json(cached);

    const [totalStudents, byCourse, byYear] = await Promise.all([
      Student.countDocuments(),
      Student.aggregate([{ $group: { _id: "$course", count: { $sum: 1 } } }, { $sort: { count: -1, _id: 1 } }]),
      Student.aggregate([{ $group: { _id: "$year", count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
    ]);
    const stats = {
      totalStudents,
      byCourse: byCourse.map(({ _id, count }) => ({ course: _id, count })),
      byYear: byYear.map(({ _id, count }) => ({ year: _id, count })),
    };
    await setCached(dashboardStatsCacheKey, stats);
    res.json(stats);
  } catch (error) {
    next(error);
  }
}

async function createStudent(req, res, next) {
  try {
    const student = await Student.create(validateStudentInput(req.body));
    await invalidateCache(studentsCacheKey, dashboardStatsCacheKey);
    res.status(201).json(student);
  } catch (error) {
    next(error);
  }
}

async function updateStudent(req, res, next) {
  try {
    const student = await Student.findByIdAndUpdate(req.params.id, validateStudentInput(req.body), {
      new: true,
      runValidators: true,
    });
    if (!student) return res.status(404).json({ message: "Student not found" });
    await invalidateCache(studentsCacheKey, dashboardStatsCacheKey);
    res.json(student);
  } catch (error) {
    next(error);
  }
}

async function deleteStudent(req, res, next) {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) return res.status(404).json({ message: "Student not found" });
    await invalidateCache(studentsCacheKey, dashboardStatsCacheKey);
    res.json({ message: "Student deleted" });
  } catch (error) {
    next(error);
  }
}

module.exports = { getStudents, getDashboardStats, createStudent, updateStudent, deleteStudent };
