const express = require("express");
const {
  getStudents,
  getDashboardStats,
  createStudent,
  updateStudent,
  deleteStudent,
} = require("../controllers/studentController");
const { allowRoles } = require("../middleware/auth");
const asyncHandler = require("../middleware/asyncHandler");

const router = express.Router();

router.get("/", asyncHandler(getStudents));
router.get("/stats", asyncHandler(getDashboardStats));
router.post("/", allowRoles("admin", "staff"), asyncHandler(createStudent));
router.put("/:id", allowRoles("admin", "staff"), asyncHandler(updateStudent));
router.delete("/:id", allowRoles("admin"), asyncHandler(deleteStudent));

module.exports = router;
