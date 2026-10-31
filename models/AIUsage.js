const mongoose = require("mongoose");

const aiUsageSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    provider: { type: String, required: true },
    model: { type: String, required: true },
    operation: { type: String, required: true },
    promptTokens: { type: Number, min: 0, default: null },
    completionTokens: { type: Number, min: 0, default: null },
    totalTokens: { type: Number, min: 0, default: null },
    estimatedCostUsd: { type: Number, min: 0, default: null },
    toolsUsed: { type: [String], default: [] },
  },
  { timestamps: true },
);

module.exports = mongoose.model("AIUsage", aiUsageSchema);
