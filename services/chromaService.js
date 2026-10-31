const { ChromaClient } = require("chromadb");
const { embedQuery, embedText } = require("./embeddingService");
const AssistantChunk = require("../models/AssistantChunk");

const collectionName = process.env.CHROMA_COLLECTION || "student_assistant_documents";
const client = new ChromaClient({ path: process.env.CHROMA_URL || "http://localhost:8000" });

async function getCollection() {
  return client.getOrCreateCollection({ name: collectionName });
}

async function addChunks({ documentId, userId, chunks }) {
  try {
    const collection = await getCollection();
    const embeddings = [];
    for (const chunk of chunks) embeddings.push(await embedText(chunk));
    await collection.add({
      ids: chunks.map((_chunk, index) => `${documentId}:${index}`),
      documents: chunks,
      embeddings,
      metadatas: chunks.map((_chunk, index) => ({ documentId: String(documentId), userId: String(userId), chunkIndex: index })),
    });
  } catch (error) {
    console.warn("Chroma unavailable; storing document chunks in MongoDB:", error.message);
    await AssistantChunk.deleteMany({ documentId, userId });
    await AssistantChunk.insertMany(chunks.map((text, chunkIndex) => ({ documentId, userId, text, chunkIndex })));
  }
}

async function searchChunks({ userId, query, limit = 5 }) {
  const results = await searchChunksDetailed({ userId, query, limit });
  return results.map(({ text }) => text);
}

async function searchChunksDetailed({ userId, query, limit = 5 }) {
  try {
    const collection = await getCollection();
    const result = await collection.query({
      queryEmbeddings: [await embedQuery(query)],
      nResults: limit,
      where: { userId: String(userId) },
    });
    return (result.documents?.[0] || [])
      .map((text, index) => ({
        text,
        documentId: result.metadatas?.[0]?.[index]?.documentId || null,
        chunkIndex: result.metadatas?.[0]?.[index]?.chunkIndex ?? null,
      }))
      .filter(({ text }) => Boolean(text));
  } catch (error) {
    console.warn("Chroma unavailable; using MongoDB document chunks:", error.message);
    const terms = [...new Set(query.toLowerCase().match(/[a-z0-9]{3,}/g) || [])];
    if (!terms.length) return [];
    const chunks = await AssistantChunk.find({ userId }).select("documentId text chunkIndex").lean();
    return chunks
      .map(({ documentId, text, chunkIndex }) => ({
        documentId: String(documentId),
        chunkIndex,
        text,
        score: terms.reduce((score, term) => score + (text.toLowerCase().includes(term) ? 1 : 0), 0),
      }))
      .filter(({ score }) => score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, limit)
      .map(({ documentId, chunkIndex, text }) => ({ documentId, chunkIndex, text }));
  }
}

async function deleteChunks({ documentId, userId }) {
  await AssistantChunk.deleteMany({ documentId, userId });
  try {
    const collection = await getCollection();
    await collection.delete({ where: { documentId: String(documentId), userId: String(userId) } });
  } catch (error) {
    console.warn("Chroma unavailable while deleting document vectors:", error.message);
  }
}

module.exports = { addChunks, searchChunks, searchChunksDetailed, deleteChunks };
