const { PDFParse } = require("pdf-parse");

async function extractDocumentText(file) {
  const filename = file.originalname.toLowerCase();
  if (filename.endsWith(".txt") || file.mimetype === "text/plain") {
    return file.buffer.toString("utf8");
  }
  if (filename.endsWith(".pdf") || file.mimetype === "application/pdf") {
    const parser = new PDFParse({ data: file.buffer });
    try {
      const parsed = await parser.getText();
      return parsed.text || "";
    } finally {
      await parser.destroy();
    }
  }
  const error = new Error("Only .txt and .pdf documents are supported.");
  error.status = 400;
  throw error;
}

module.exports = { extractDocumentText };
