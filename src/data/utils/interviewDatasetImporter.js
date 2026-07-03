require("dotenv").config();

const fs = require("fs");
const path = require("path");

const connectDB = require("../../config/db");
const { closeDatabase } = require("../../config/db");
const {
  CATEGORY_OPTIONS,
  TOPIC_OPTIONS,
  DIFFICULTY_OPTIONS,
} = require("../../models/InterviewQuestion");
const {
  replaceQuestionsBySource,
} = require("../../repositories/interviewQuestionRepository");

const CATEGORY_OPTIONS_SET = new Set(CATEGORY_OPTIONS);
const TOPIC_OPTIONS_SET = new Set(TOPIC_OPTIONS);
const DIFFICULTY_OPTIONS_SET = new Set(DIFFICULTY_OPTIONS);

const QUESTION_KEYS = ["question", "Question", "questionText", "prompt", "title"];
const ANSWER_KEYS = ["answer", "Answer", "sampleAnswer", "response", "solution", "explanation"];
const CATEGORY_KEYS = ["category", "Category", "type"];
const TOPIC_KEYS = ["topic", "Topic", "subject", "domain"];
const DIFFICULTY_KEYS = ["difficulty", "Difficulty", "level"];
const TAG_KEYS = ["tags", "Tags", "keywords", "keyword"];

const getValue = (record, keys) => {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) {
      return record[key];
    }
  }

  return undefined;
};

const normalizeText = (value, fallback = "") => {
  if (typeof value === "string") {
    return value.trim() || fallback;
  }

  if (value === undefined || value === null) {
    return fallback;
  }

  return String(value).trim() || fallback;
};

const parseCsvLine = (line) => {
  const values = [];
  let current = "";
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"' && insideQuotes && nextChar === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === "," && !insideQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());

  return values;
};

const parseCsvFile = (filePath) => {
  const fileContent = fs.readFileSync(filePath, "utf-8").trim();

  if (!fileContent) {
    return [];
  }

  const lines = fileContent.split(/\r?\n/).filter(Boolean);

  if (lines.length < 2) {
    return [];
  }

  const headers = parseCsvLine(lines[0]);

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const record = {};

    headers.forEach((header, index) => {
      record[header] = values[index] !== undefined ? values[index] : "";
    });

    return record;
  });
};

const parseJsonFile = (filePath) => {
  const fileContent = fs.readFileSync(filePath, "utf-8");
  const parsed = JSON.parse(fileContent);

  if (Array.isArray(parsed)) {
    return parsed;
  }

  if (Array.isArray(parsed.questions)) {
    return parsed.questions;
  }

  if (Array.isArray(parsed.data)) {
    return parsed.data;
  }

  if (Array.isArray(parsed.records)) {
    return parsed.records;
  }

  throw new Error("JSON dataset must be an array or contain a questions, data, or records array.");
};

const buildCandidatePaths = (datasetNames) => {
  const names = Array.isArray(datasetNames) ? datasetNames : [datasetNames];
  const folders = [
    process.cwd(),
    path.join(process.cwd(), "data"),
    path.join(process.cwd(), "src", "data"),
    path.join(process.cwd(), "src", "data", "datasets"),
  ];
  const candidatePaths = [];

  for (const name of names) {
    const ext = path.extname(name).toLowerCase();

    for (const folder of folders) {
      if (ext === ".json" || ext === ".csv") {
        candidatePaths.push(path.join(folder, name));
        continue;
      }

      candidatePaths.push(path.join(folder, `${name}.json`));
      candidatePaths.push(path.join(folder, `${name}.csv`));
    }
  }

  return [...new Set(candidatePaths)];
};

const resolveDatasetFile = (datasetNames) => {
  const candidatePaths = buildCandidatePaths(datasetNames);
  const existingPath = candidatePaths.find((candidatePath) => fs.existsSync(candidatePath));

  if (!existingPath) {
    throw new Error(
      `Dataset file not found. Expected one of: ${candidatePaths.join(", ")}`
    );
  }

  return existingPath;
};

const readDataset = (datasetNames) => {
  const filePath = resolveDatasetFile(datasetNames);
  const extension = path.extname(filePath).toLowerCase();

  if (extension === ".json") {
    return {
      filePath,
      records: parseJsonFile(filePath),
    };
  }

  if (extension === ".csv") {
    return {
      filePath,
      records: parseCsvFile(filePath),
    };
  }

  throw new Error("Only JSON and CSV files are supported.");
};

const normalizeCategory = (value, question, answer, tags) => {
  const normalized = normalizeText(value).toLowerCase().replace(/\s+/g, "_");

  if (CATEGORY_OPTIONS_SET.has(normalized)) {
    return normalized;
  }

  const context = `${question} ${answer} ${tags.join(" ")}`.toLowerCase();

  if (
    context.includes("behavioral") ||
    context.includes("behavior") ||
    context.includes("hr") ||
    context.includes("tell me about yourself") ||
    context.includes("leadership") ||
    context.includes("conflict") ||
    context.includes("teamwork") ||
    context.includes("strength") ||
    context.includes("weakness")
  ) {
    return "behavioral";
  }

  if (
    context.includes("oop") ||
    context.includes("dbms") ||
    context.includes("operating system") ||
    context.includes("computer network") ||
    context.includes("cn") ||
    context.includes("dsa") ||
    context.includes("algorithm") ||
    context.includes("data structure")
  ) {
    return "cs_fundamentals";
  }

  return "programming";
};

const normalizeTopic = (value, question, answer, tags, category) => {
  const raw = normalizeText(value);

  if (TOPIC_OPTIONS_SET.has(raw)) {
    return raw;
  }

  const context = `${raw} ${question} ${answer} ${tags.join(" ")}`.toLowerCase();

  if (category === "behavioral" || context.includes("hr")) return "HR";
  if (context.includes("oop")) return "OOP";
  if (context.includes("dbms") || context.includes("sql")) return "DBMS";
  if (context.includes("operating system") || context.includes("process") || context.includes("thread")) return "OS";
  if (context.includes("computer network") || context.includes("network") || context.includes("tcp") || context.includes("http")) return "CN";
  if (context.includes("dsa") || context.includes("algorithm") || context.includes("array") || context.includes("linked list") || context.includes("tree")) return "DSA";
  if (context.includes("javascript")) return "JavaScript";
  if (context.includes("python")) return "Python";
  if (context.includes("java")) return "Java";
  if (context.includes("c++")) return "C++";
  if (context.includes(" c language") || context.includes(" c programming") || context.includes(" c ")) return "C";

  if (category === "behavioral") {
    return "HR";
  }

  if (category === "cs_fundamentals") {
    return "DSA";
  }

  return "JavaScript";
};

const normalizeDifficulty = (value) => {
  const normalized = normalizeText(value, "medium").toLowerCase();

  if (DIFFICULTY_OPTIONS_SET.has(normalized)) {
    return normalized;
  }

  if (normalized.includes("beginner") || normalized.includes("basic")) return "easy";
  if (normalized.includes("advanced") || normalized.includes("expert")) return "hard";

  return "medium";
};

const normalizeTags = (value, category, topic) => {
  const baseTags = [category, topic];

  if (Array.isArray(value)) {
    return [...new Set([...baseTags, ...value.map((item) => normalizeText(item)).filter(Boolean)])];
  }

  if (typeof value === "string") {
    const splitTags = value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    return [...new Set([...baseTags, ...splitTags])];
  }

  return baseTags;
};

const mapRecordToInterviewQuestion = (record, index, source) => {
  const question = normalizeText(getValue(record, QUESTION_KEYS));

  if (!question) {
    return {
      valid: false,
      reason: `Record ${index + 1} skipped because question is missing.`,
    };
  }

  const answer = normalizeText(
    getValue(record, ANSWER_KEYS),
    "Answer not available in dataset."
  );

  const rawCategory = getValue(record, CATEGORY_KEYS);
  const rawTopic = getValue(record, TOPIC_KEYS);
  const rawDifficulty = getValue(record, DIFFICULTY_KEYS);
  const rawTags = getValue(record, TAG_KEYS);

  const temporaryTags = normalizeTags(rawTags, "programming", "JavaScript");
  const category = normalizeCategory(rawCategory, question, answer, temporaryTags);
  const topic = normalizeTopic(rawTopic, question, answer, temporaryTags, category);
  const tags = normalizeTags(rawTags, category, topic);
  const difficulty = normalizeDifficulty(rawDifficulty);

  return {
    valid: true,
    data: {
      question,
      answer,
      category,
      topic,
      difficulty,
      tags,
      source,
    },
  };
};

const importInterviewDataset = async ({ datasetNames, source, label }) => {
  let insertedCount = 0;
  let skippedCount = 0;

  try {
    const { filePath, records } = readDataset(datasetNames);
    const mappedRecords = records.map((record, index) =>
      mapRecordToInterviewQuestion(record, index, source)
    );
    const validRecords = [];

    for (const record of mappedRecords) {
      if (!record.valid) {
        skippedCount += 1;
        console.warn(record.reason);
        continue;
      }

      validRecords.push(record.data);
    }

    if (validRecords.length === 0) {
      console.log("No valid records found to insert.");
      return;
    }

    await connectDB();

    insertedCount = replaceQuestionsBySource(validRecords, source);

    console.log(`${label} imported successfully.`);
    console.log(`File: ${path.basename(filePath)}`);
    console.log(`Total records read: ${records.length}`);
    console.log(`Inserted records: ${insertedCount}`);
    console.log(`Skipped records: ${skippedCount}`);
    console.log(`Source value applied: "${source}"`);
  } catch (error) {
    console.error(`Failed to import ${label.toLowerCase()}:`, error.message);
    process.exitCode = 1;
  } finally {
    closeDatabase();
  }
};

module.exports = {
  importInterviewDataset,
};
