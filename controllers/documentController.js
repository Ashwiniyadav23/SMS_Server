const AssistantDocument = require("../models/AssistantDocument");
const { chunkText } = require("../services/textChunker");
const { addChunks, deleteChunks } = require("../services/chromaService");
const { redactPii } = require("../services/assistantSecurity");
const { extractDocumentText } = require("../services/documentTextExtractor");

async function uploadDocument(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ message: "Upload a .txt or .pdf document using the file field." });
    const text = redactPii(await extractDocumentText(req.file));
    const chunks = chunkText(text);
    if (!chunks.length) return res.status(400).json({ message: "The uploaded document does not contain readable text." });

    const document = await AssistantDocument.create({
      userId: req.user.sub,
      name: req.file.originalname,
      chunkCount: chunks.length,
    });
    await addChunks({ documentId: document._id, userId: req.user.sub, chunks });
    res.status(201).json({ id: document._id, name: document.name, chunkCount: document.chunkCount });
  } catch (error) {
    if (!error.status && error.name !== "ValidationError" && error.name !== "MongoServerError") {
      error.status = 503;
      error.message = "Document indexing is unavailable. Check the document services and try again.";
    }
    next(error);
  }
}

async function listDocuments(req, res, next) {
  try {
    res.json(await AssistantDocument.find({ userId: req.user.sub }).sort({ createdAt: -1 }).select("name chunkCount createdAt"));
  } catch (error) {
    next(error);
  }
}

async function deleteDocument(req, res, next) {
  try {
    const document = await AssistantDocument.findOne({ _id: req.params.id, userId: req.user.sub });
    if (!document) return res.status(404).json({ message: "Document not found." });
    await deleteChunks({ documentId: document._id, userId: req.user.sub });
    await document.deleteOne();
    res.status(204).end();
  } catch (error) {
    next(error);
  }
}

module.exports = { uploadDocument, listDocuments, deleteDocument };
