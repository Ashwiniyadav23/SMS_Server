const AIUsage = require("../models/AIUsage");

function estimateGeminiCost(model, promptTokens, completionTokens) {
  const inputRate = Number(process.env.GEMINI_INPUT_COST_PER_MILLION || 0);
  const outputRate = Number(process.env.GEMINI_OUTPUT_COST_PER_MILLION || 0);
  if (!Number.isFinite(promptTokens) || !Number.isFinite(completionTokens) || inputRate <= 0 || outputRate <= 0) return null;
  return ((promptTokens * inputRate) + (completionTokens * outputRate)) / 1_000_000;
}

function normalizeUsage(usage) {
  const promptTokens = Number.isFinite(usage?.promptTokenCount) ? usage.promptTokenCount : null;
  const completionTokens = Number.isFinite(usage?.candidatesTokenCount) ? usage.candidatesTokenCount : null;
  const totalTokens = Number.isFinite(usage?.totalTokenCount) ? usage.totalTokenCount : null;
  return { promptTokens, completionTokens, totalTokens };
}

async function recordUsage({ userId, provider, model, operation, usage, toolsUsed = [] }) {
  const { promptTokens, completionTokens, totalTokens } = normalizeUsage(usage);
  const estimatedCostUsd = provider === "gemini"
    ? estimateGeminiCost(model, promptTokens, completionTokens)
    : null;

  await AIUsage.create({
    userId,
    provider,
    model,
    operation,
    promptTokens,
    completionTokens,
    totalTokens,
    estimatedCostUsd,
    toolsUsed,
  });

  return { promptTokens, completionTokens, totalTokens, estimatedCostUsd, metadataAvailable: Boolean(usage) };
}

module.exports = { estimateGeminiCost, normalizeUsage, recordUsage };
