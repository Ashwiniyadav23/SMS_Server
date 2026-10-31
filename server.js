const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const mongoose = require("mongoose");
const app = require("./app");
const seedAdmin = require("./utils/seedAdmin");
const { connectRedis, disconnectRedis } = require("./services/redisService");

const port = process.env.PORT || 5001;
const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/student_management";

async function connectToDatabase() {
  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    console.log("MongoDB connected successfully");
    await seedAdmin();
    await connectRedis();
  } catch (error) {
    console.error(
      "Could not connect to MongoDB. Check MONGODB_URI and network access:",
      error.message,
    );
    const retryTimer = setTimeout(connectToDatabase, 15000);
    retryTimer.unref();
  }
}

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  connectToDatabase();
});

process.on("SIGTERM", async () => {
  await disconnectRedis();
  await mongoose.disconnect();
  process.exit(0);
});
