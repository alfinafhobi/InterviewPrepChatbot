require("dotenv").config();

const connectDB = require("../config/db");
const { closeDatabase } = require("../config/db");
const {
  replaceQuestionsBySource,
} = require("../repositories/interviewQuestionRepository");
const interviewKnowledge = require("./interviewKnowledge");

const seedInterviewData = async () => {
  try {
    await connectDB();

    const insertedCount = replaceQuestionsBySource(
      interviewKnowledge,
      "starter_data"
    );

    console.log(`Starter interview data seeded successfully: ${insertedCount} records.`);
  } catch (error) {
    console.error("Failed to seed interview knowledge:", error.message);
  } finally {
    closeDatabase();
  }
};

seedInterviewData();
