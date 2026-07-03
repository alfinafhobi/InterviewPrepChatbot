require("dotenv").config();

const connectDB = require("../config/db");
const { closeDatabase } = require("../config/db");
const {
  replaceQuestionsBySource,
} = require("../repositories/interviewQuestionRepository");
const syntheticInterviewQuestions = require("./syntheticInterviewQuestions");

const seedSyntheticInterviewQuestions = async () => {
  try {
    await connectDB();

    const insertedCount = replaceQuestionsBySource(
      syntheticInterviewQuestions,
      "synthetic_dataset"
    );

    console.log(`Synthetic interview data seeded successfully: ${insertedCount} records.`);
  } catch (error) {
    console.error("Failed to seed synthetic interview data:", error.message);
    process.exitCode = 1;
  } finally {
    closeDatabase();
  }
};

seedSyntheticInterviewQuestions();
