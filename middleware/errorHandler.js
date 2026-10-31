function errorHandler(error, _req, res, _next) {
  if (error.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ message: "Documents must be 2 MB or smaller." });
  }
  if (error.message === "Only .txt and .pdf documents are supported.") {
    return res.status(400).json({ message: error.message });
  }
  if (error.status === 401 || error.status === 403 || error.status === 503) {
    return res.status(error.status).json({ message: error.message });
  }
  if (error.status === 400 || error instanceof SyntaxError) {
    return res.status(400).json({ message: error.message || "Invalid JSON body" });
  }
  if (error.name === "ValidationError") {
    return res.status(400).json({ message: error.message });
  }
  if (error.code === 11000) {
    return res.status(409).json({ message: "A student with this email already exists" });
  }
  if (error.name === "CastError") {
    return res.status(400).json({ message: "Invalid student ID" });
  }
  console.error(error);
  return res.status(500).json({ message: "Something went wrong. Please try again." });
}

module.exports = errorHandler
