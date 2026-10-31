const mongoose = require("mongoose");

const assistantDocumentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    chunkCount: { type: Number, required: true, min: 1 },
  },
  { timestamps: true },
);

module.exports = mongoose.model("AssistantDocument", assistantDocumentSchema);
