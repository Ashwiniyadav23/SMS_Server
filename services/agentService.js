const { DynamicStructuredTool } = require("@langchain/core/tools");
const { z } = require("zod");
const Student = require("../models/Student");
const { searchChunks, searchChunksDetailed } = require("./chromaService");

const studentIdSchema = z.object({ studentId: z.string().regex(/^[a-f\d]{24}$/i) });

function isStaffOrAdmin(user) {
  return user?.role === "admin" || user?.role === "staff";
}

function serializeStudent(student) {
  return {
    id: String(student._id),
    name: student.name,
    email: student.email,
    course: student.course,
    year: student.year,
  };
}

function createDocumentSearchTool({ userId }) {
  if (typeof userId !== "string" || !userId) {
    throw Object.assign(new Error("Authenticated user is required for document search"), { status: 401 })
  }
  return new DynamicStructuredTool({
    name: "search_student_documents",
    description: "Search the authenticated user's uploaded study documents for relevant facts.",
    schema: z.object({ query: z.string().min(1).max(1200) }),
    func: async ({ query }) => {
      const chunks = await searchChunks({ userId, query });
      return chunks.length ? chunks.join("\n\n") : "No relevant uploaded document context was found.";
    },
  });
}

function createStudentProfileTool({ user }) {
  return new DynamicStructuredTool({
    name: "get_authorized_student_profile",
    description: "Retrieve one permitted student profile. Staff and admins may request a supplied student ID; students may retrieve only their own profile.",
    schema: studentIdSchema,
    func: async ({ studentId }) => {
      if (!isStaffOrAdmin(user) && user.role === "student") {
        const student = await Student.findOne({ email: user.email }).lean();
        if (!student || String(student._id) !== studentId) {
          throw Object.assign(new Error("Students may access only their own profile"), { status: 403 });
        }
      } else if (!isStaffOrAdmin(user)) {
        throw Object.assign(new Error("Student profile access is not permitted"), { status: 403 });
      }
      const student = await Student.findById(studentId).lean();
      if (!student) throw Object.assign(new Error("Student not found"), { status: 404 });
      return JSON.stringify(serializeStudent(student));
    },
  });
}

function createStudentReportTool({ user }) {
  return new DynamicStructuredTool({
    name: "generate_student_report",
    description: "Generate a structured report for a student. Only staff and admins may use this tool.",
    schema: studentIdSchema,
    func: async ({ studentId }) => {
      if (!isStaffOrAdmin(user)) {
        throw Object.assign(new Error("Only staff and admins may generate student reports"), { status: 403 });
      }
      const student = await Student.findById(studentId).lean();
      if (!student) throw Object.assign(new Error("Student not found"), { status: 404 });
      return JSON.stringify({
        reportType: "student-summary",
        generatedAt: new Date().toISOString(),
        student: serializeStudent(student),
        sections: {
          enrollment: { course: student.course, year: student.year },
          academicSupport: "Review progress and goals with the student.",
          nextSteps: ["Confirm current goals", "Review recent progress", "Agree on one next action"],
        },
      });
    },
  });
}

function selectTools({ user, query }) {
  const normalized = query.toLowerCase();
  if (/\b(report|summary)\b/.test(normalized)) return [createStudentReportTool({ user })];
  if (/\b(student|profile|enrolled|course|year)\b/.test(normalized)) return [createStudentProfileTool({ user })];
  return [createDocumentSearchTool({ userId: user.sub })];
}

async function runStudentAgent({ user, query }) {
  const [tool] = selectTools({ user, query });
  if (tool.name !== "search_student_documents" && !query.match(/[a-f\d]{24}/i)) {
    throw Object.assign(new Error("Include a valid student ID for profile or report requests"), { status: 400 });
  }
  const input = tool.name === "search_student_documents"
    ? { query }
    : { studentId: query.match(/[a-f\d]{24}/i)[0] };
  const toolResult = await tool.invoke(input);
  const searchResults = tool.name === "search_student_documents"
    ? await searchChunksDetailed({ userId: user.sub, query })
    : [];
  return {
    context: tool.name === "search_student_documents" && !toolResult.startsWith("No relevant uploaded document context")
      ? toolResult
      : tool.name === "search_student_documents" ? "" : toolResult,
    toolResult,
    sources: searchResults.map(({ documentId, chunkIndex }) => ({
      type: "uploaded-document",
      label: `Uploaded document${documentId ? ` ${documentId}` : ""}${chunkIndex === null ? "" : `, chunk ${chunkIndex + 1}`}`,
    })),
    toolsUsed: [tool.name],
  };
}

async function generateStudentReport({ user, studentId }) {
  return createStudentReportTool({ user }).invoke({ studentId });
}

module.exports = {
  createDocumentSearchTool,
  createStudentProfileTool,
  createStudentReportTool,
  generateStudentReport,
  runStudentAgent,
  selectTools,
};
