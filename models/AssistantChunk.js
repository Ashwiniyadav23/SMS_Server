const mongoose = require("mongoose");

const assistantChunkSchema = new mongoose.Schema(
  {
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: "AssistantDocument", required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    text: { type: String, required: true },
    chunkIndex: { type: Number, required: true, min: 0 },
  },
  { timestamps: true },
);

assistantChunkSchema.index({ userId: 1, documentId: 1, chunkIndex: 1 }, { unique: true });

module.exports = mongoose.model("AssistantChunk", assistantChunkSchema);
