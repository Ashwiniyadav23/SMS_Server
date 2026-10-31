const Conversation = require("../models/Conversation");

const maxMessages = 12;

function normalizeMessages(messages) {
  return (Array.isArray(messages) ? messages : [])
    .filter((message) => message && (message.role === "user" || message.role === "assistant") && typeof message.content === "string")
    .slice(-maxMessages)
    .map(({ role, content }) => ({ role, content: content.trim().slice(0, 5000) }))
    .filter(({ content }) => content);
}

async function getConversation(userId) {
  const conversation = await Conversation.findOne({ userId }).lean();
  return normalizeMessages(conversation?.messages);
}

async function appendConversation(userId, messages) {
  const normalized = normalizeMessages(messages);
  return Conversation.findOneAndUpdate(
    { userId },
    { $set: { messages: normalized } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean();
}

async function clearConversation(userId) {
  await Conversation.deleteOne({ userId });
}

module.exports = { maxMessages, normalizeMessages, getConversation, appendConversation, clearConversation };
