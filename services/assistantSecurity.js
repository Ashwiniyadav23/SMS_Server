const { z } = require("zod")

const piiPatterns = [
  { pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, replacement: '[REDACTED_EMAIL]' },
  { pattern: /(?:\+?91[\s-]?[6-9]\d{9}|(?<!\d)[6-9]\d{9}(?!\d))/g, replacement: '[REDACTED_PHONE]' },
  { pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, replacement: '[REDACTED_AADHAAR]' },
  { pattern: /\b[A-Z]{5}\d{4}[A-Z]\b/gi, replacement: '[REDACTED_PAN]' },
  { pattern: /\b\d{3}[\s-]?\d{2}[\s-]?\d{4}\b/g, replacement: '[REDACTED_SSN]' },
  { pattern: /\b(?:\d[ -]*?){13,19}\b/g, replacement: '[REDACTED_PAYMENT_NUMBER]' },
]

const promptInjectionPatterns = [
  /\bignore\s+(?:all\s+)?(?:previous| prior|above|earlier)\s+instructions?\b/i,
  /\bdisregard\s+(?:all\s+)?(?:previous| prior|above|earlier)\s+instructions?\b/i,
  /\breveal\s+(?:the\s+)?(?:system|developer)\s+(?:prompt|instructions?)\b/i,
  /\b(?:system|developer)\s+prompt\b/i,
  /\b(?:jailbreak|dan mode|do anything now)\b/i,
  /\b(?:change|override|bypass)\s+(?:your|the)\s+(?:rules|instructions|safety)\b/i,
]

function redactPii(text) {
  return piiPatterns.reduce((redacted, { pattern, replacement }) => redacted.replace(pattern, replacement), text)
}

function containsPii(text) {
  return redactPii(text) !== text
}

function containsPromptInjection(text) {
  return promptInjectionPatterns.some((pattern) => pattern.test(text))
}

function sanitizeRetrievedContext(context) {
  const redacted = redactPii(context)
  return redacted
    .split(/\r?\n/)
    .map((line) => (containsPromptInjection(line) ? '[REMOVED_UNTRUSTED_INSTRUCTION]' : line))
    .join('\n')
}

function hasGroundingSupport(answer, context) {
  if (/\[REDACTED_[A-Z_]+\]/.test(answer)) return true
  if (!context || context.startsWith('No relevant uploaded document context')) return true
  const contextTerms = new Set(context.toLowerCase().match(/[a-z0-9]{5,}/g) || [])
  const answerTerms = new Set(answer.toLowerCase().match(/[a-z0-9]{5,}/g) || [])
  const overlap = [...answerTerms].filter((term) => contextTerms.has(term))
  return overlap.length >= 2
}

const assistantOutputSchema = z.object({
  answer: z.string().trim().min(1).max(5000),
  sources: z.array(z.object({
    type: z.literal("uploaded-document"),
    label: z.string().trim().min(1).max(200),
  })).max(10),
}).strict()

function validateAssistantOutput(output, context) {
  const parsed = assistantOutputSchema.safeParse(output)
  if (!parsed.success) {
    return { valid: false, error: "The assistant returned an unsupported response format." }
  }
  if (context && !parsed.data.sources.length) {
    return { valid: false, error: "The assistant response did not include a document source." }
  }
  if (!hasGroundingSupport(parsed.data.answer, context)) {
    return { valid: false, error: "The response could not be grounded in the uploaded documents." }
  }
  return { valid: true, data: parsed.data }
}

function parseStructuredAssistantResponse(text) {
  if (typeof text !== "string" || !text.trim()) {
    return { valid: false, error: "The assistant returned an empty response." }
  }
  try {
    const parsed = JSON.parse(text)
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || typeof parsed.answer !== "string") {
      return { valid: false, error: "The assistant returned an unsupported response format." }
    }
    return { valid: true, data: parsed }
  } catch {
    return { valid: false, error: "The assistant returned an unsupported response format." }
  }
}

module.exports = {
  redactPii,
  containsPii,
  containsPromptInjection,
  sanitizeRetrievedContext,
  hasGroundingSupport,
  assistantOutputSchema,
  validateAssistantOutput,
  parseStructuredAssistantResponse,
}
