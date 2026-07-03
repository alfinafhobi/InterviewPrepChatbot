const { importInterviewDataset } = require("./utils/interviewDatasetImporter");

importInterviewDataset({
  datasetNames: [
    "Technical_interview_questions",
    "Technical_interview_questions.csv",
    "Technical_interview_questions.json",
    "Software Questions.csv",
    "Software Questions",
  ],
  source: "technical_dataset",
  label: "Technical interview dataset",
});
