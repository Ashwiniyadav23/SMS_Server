const multer = require("multer");

module.exports = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const filename = file.originalname.toLowerCase();
    const isText = file.mimetype === "text/plain" || filename.endsWith(".txt");
    const isPdf = file.mimetype === "application/pdf" || filename.endsWith(".pdf");
    if (isText || isPdf) return callback(null, true);
    callback(new Error("Only .txt and .pdf documents are supported."));
  },
});
