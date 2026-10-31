const AIUsage = require("../models/AIUsage");

async function getAdminUsage(req, res) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Only administrators can view AI usage." });
  }

  const daily = await AIUsage.aggregate([
    {
      $group: {
        _id: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          model: "$model",
        },
        requests: { $sum: 1 },
        requestsWithTokenData: {
          $sum: {
            $cond: [{ $ne: ["$totalTokens", null] }, 1, 0],
          },
        },
        promptTokens: { $sum: { $ifNull: ["$promptTokens", 0] } },
        completionTokens: { $sum: { $ifNull: ["$completionTokens", 0] } },
        totalTokens: { $sum: { $ifNull: ["$totalTokens", 0] } },
        estimatedCostUsd: { $sum: { $ifNull: ["$estimatedCostUsd", 0] } },
      },
    },
    { $sort: { "_id.date": -1, "_id.model": 1 } },
    { $limit: 90 },
  ]);

  const byUser = await AIUsage.aggregate([
    {
      $group: {
        _id: "$userId",
        requests: { $sum: 1 },
        totalTokens: { $sum: { $ifNull: ["$totalTokens", 0] } },
        estimatedCostUsd: { $sum: { $ifNull: ["$estimatedCostUsd", 0] } },
      },
    },
    { $sort: { totalTokens: -1 } },
    { $limit: 50 },
    { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
    { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
    { $project: { _id: 0, userId: "$_id", name: "$user.name", email: "$user.email", requests: 1, totalTokens: 1, estimatedCostUsd: 1 } },
  ]);

  const totals = daily.reduce((result, item) => ({
    requests: result.requests + item.requests,
    promptTokens: result.promptTokens + item.promptTokens,
    completionTokens: result.completionTokens + item.completionTokens,
    totalTokens: result.totalTokens + item.totalTokens,
    estimatedCostUsd: result.estimatedCostUsd + item.estimatedCostUsd,
    requestsWithTokenData: result.requestsWithTokenData + item.requestsWithTokenData,
  }), { requests: 0, requestsWithTokenData: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCostUsd: 0 });

  res.json({ totals, daily, byUser });
}

module.exports = { getAdminUsage };
