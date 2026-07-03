const { importInterviewDataset } = require("./utils/interviewDatasetImporter");

importInterviewDataset({
  datasetNames: ["Mock_interview_questions", "Mock_interview_questions.json"],
  source: "mock_dataset",
  label: "Mock interview dataset",
});
