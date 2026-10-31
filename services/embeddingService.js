const embeddingModel = process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001";

async function embedText(text) {
  if (!process.env.GEMINI_API_KEY) {
    const error = new Error("GEMINI_API_KEY is not configured in backend/.env");
    error.status = 503;
    throw error;
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${embeddingModel}:embedContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: { parts: [{ text }] }, taskType: "RETRIEVAL_DOCUMENT" }),
    },
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !Array.isArray(data.embedding?.values)) {
    const error = new Error(data.error?.message || "Gemini embedding request failed");
    error.status = response.status || 502;
    throw error;
  }
  return data.embedding.values;
}

async function embedQuery(text) {
  const values = await embedText(text);
  return values;
}

module.exports = { embedText, embedQuery };
