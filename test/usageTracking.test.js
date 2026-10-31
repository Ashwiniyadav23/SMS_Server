const test = require("node:test")
const assert = require("node:assert/strict")
const { estimateGeminiCost, normalizeUsage } = require("../services/usageService")

test("preserves missing usage metadata as null", () => {
  assert.deepEqual(normalizeUsage(undefined), {
    promptTokens: null,
    completionTokens: null,
    totalTokens: null,
  })
})

test("does not estimate cost without complete metadata or pricing", () => {
  process.env.GEMINI_INPUT_COST_PER_MILLION = "1"
  process.env.GEMINI_OUTPUT_COST_PER_MILLION = "1"
  assert.equal(estimateGeminiCost("gemini-test", null, 10), null)
  process.env.GEMINI_INPUT_COST_PER_MILLION = "0"
  process.env.GEMINI_OUTPUT_COST_PER_MILLION = "0"
  assert.equal(estimateGeminiCost("gemini-test", 10, 10), null)
})

test("calculates configured Gemini cost", () => {
  process.env.GEMINI_INPUT_COST_PER_MILLION = "2"
  process.env.GEMINI_OUTPUT_COST_PER_MILLION = "4"
  assert.equal(estimateGeminiCost("gemini-test", 1000, 500), 0.004)
})
