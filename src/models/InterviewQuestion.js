const CATEGORY_OPTIONS = [
  "behavioral",
  "programming",
  "cs_fundamentals",
];

const TOPIC_OPTIONS = [
  "HR",
  "OOP",
  "DBMS",
  "OS",
  "CN",
  "DSA",
  "Java",
  "Python",
  "C",
  "C++",
  "JavaScript",
];

const DIFFICULTY_OPTIONS = ["easy", "medium", "hard"];
const DOMAIN_OPTIONS = [
  "behavioral",
  "programming",
  "oop",
  "dbms",
  "os",
  "cn",
  "dsa",
];
const CONTENT_TYPE_OPTIONS = [
  "concept_explanation",
  "interview_question",
  "practice_prompt",
  "comparison",
];
const INTENT_TYPE_OPTIONS = [
  "definition",
  "explanation",
  "question",
  "practice",
  "comparison",
];
const TABLE_NAME = "interview_questions";
const REQUIRED_COLUMNS = [
  ["domain", "TEXT NOT NULL DEFAULT ''"],
  ["subtopic", "TEXT NOT NULL DEFAULT ''"],
  ["content_type", "TEXT NOT NULL DEFAULT 'concept_explanation'"],
  ["intent_type", "TEXT NOT NULL DEFAULT 'explanation'"],
  ["keywords", "TEXT NOT NULL DEFAULT ''"],
];
const EXTRA_INDEXES = [
  [
    "idx_interview_questions_domain",
    `CREATE INDEX IF NOT EXISTS idx_interview_questions_domain ON ${TABLE_NAME} (domain)`,
  ],
  [
    "idx_interview_questions_intent_type",
    `CREATE INDEX IF NOT EXISTS idx_interview_questions_intent_type ON ${TABLE_NAME} (intent_type)`,
  ],
  [
    "idx_interview_questions_content_type",
    `CREATE INDEX IF NOT EXISTS idx_interview_questions_content_type ON ${TABLE_NAME} (content_type)`,
  ],
  [
    "idx_interview_questions_domain_topic_intent",
    `CREATE INDEX IF NOT EXISTS idx_interview_questions_domain_topic_intent ON ${TABLE_NAME} (domain, topic, intent_type)`,
  ],
];

const uniqueStrings = (items = []) => {
  return [...new Set(items.map((item) => String(item).trim()).filter(Boolean))];
};

const serializeTags = (tags = []) => {
  return JSON.stringify(uniqueStrings(tags));
};

const serializeKeywords = (keywords = []) => {
  return uniqueStrings(
    keywords.map((keyword) => String(keyword).trim().toLowerCase())
  ).join(",");
};

const parseTags = (value) => {
  if (Array.isArray(value)) {
    return uniqueStrings(value);
  }

  if (typeof value !== "string" || !value.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? uniqueStrings(parsed) : [];
  } catch (error) {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
};

const parseKeywords = (value) => {
  if (Array.isArray(value)) {
    return uniqueStrings(
      value.map((keyword) => String(keyword).trim().toLowerCase())
    );
  }

  if (typeof value !== "string" || !value.trim()) {
    return [];
  }

  return value
    .split(",")
    .map((keyword) => keyword.trim().toLowerCase())
    .filter(Boolean);
};

const inferDomain = (record) => {
  const normalizedTopic = String(record.topic || "").trim().toLowerCase();
  const normalizedCategory = String(record.category || "").trim().toLowerCase();

  if (normalizedCategory === "behavioral") return "behavioral";
  if (normalizedTopic === "oop") return "oop";
  if (normalizedTopic === "dbms") return "dbms";
  if (normalizedTopic === "os") return "os";
  if (normalizedTopic === "cn") return "cn";
  if (normalizedTopic === "dsa") return "dsa";
  if (
    ["java", "python", "c", "c++", "javascript"].includes(normalizedTopic) ||
    normalizedCategory === "programming"
  ) {
    return "programming";
  }

  return "";
};

const inferSubtopic = (record) => {
  return String(record.subtopic || record.topic || "").trim();
};

const inferKeywords = (record) => {
  const questionWords = String(record.question || "")
    .toLowerCase()
    .replace(/[^a-z0-9+\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word && word.length > 2);

  const topicWords = String(record.topic || "")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  return uniqueStrings([
    ...questionWords,
    ...topicWords,
    ...parseTags(record.tags).map((tag) => tag.toLowerCase()),
  ]);
};

const validateInterviewQuestion = (record) => {
  if (!record.question) {
    throw new Error("question is required.");
  }

  if (!record.answer) {
    throw new Error("answer is required.");
  }

  if (!CATEGORY_OPTIONS.includes(record.category)) {
    throw new Error(`category must be one of: ${CATEGORY_OPTIONS.join(", ")}`);
  }

  if (!TOPIC_OPTIONS.includes(record.topic)) {
    throw new Error(`topic must be one of: ${TOPIC_OPTIONS.join(", ")}`);
  }

  if (!DIFFICULTY_OPTIONS.includes(record.difficulty)) {
    throw new Error(`difficulty must be one of: ${DIFFICULTY_OPTIONS.join(", ")}`);
  }

  if (record.domain && !DOMAIN_OPTIONS.includes(record.domain)) {
    throw new Error(`domain must be one of: ${DOMAIN_OPTIONS.join(", ")}`);
  }

  if (!CONTENT_TYPE_OPTIONS.includes(record.content_type)) {
    throw new Error(
      `content_type must be one of: ${CONTENT_TYPE_OPTIONS.join(", ")}`
    );
  }

  if (!INTENT_TYPE_OPTIONS.includes(record.intent_type)) {
    throw new Error(
      `intent_type must be one of: ${INTENT_TYPE_OPTIONS.join(", ")}`
    );
  }
};

const normalizeInterviewQuestion = (record) => {
  const resolvedDomain = String(record.domain || inferDomain(record))
    .trim()
    .toLowerCase();
  const resolvedKeywords = parseKeywords(record.keywords).length
    ? parseKeywords(record.keywords)
    : inferKeywords(record);

  const normalizedRecord = {
    question: String(record.question || "").trim(),
    answer: String(record.answer || "").trim(),
    category: String(record.category || "").trim(),
    topic: String(record.topic || "").trim(),
    difficulty: String(record.difficulty || "medium").trim().toLowerCase(),
    domain: resolvedDomain,
    subtopic: inferSubtopic(record),
    content_type: String(record.content_type || "concept_explanation")
      .trim()
      .toLowerCase(),
    intent_type: String(record.intent_type || "explanation")
      .trim()
      .toLowerCase(),
    keywords: serializeKeywords(resolvedKeywords),
    tags: parseTags(record.tags),
    source: String(record.source || "internal").trim(),
    createdAt: record.createdAt || new Date().toISOString(),
    updatedAt: record.updatedAt || new Date().toISOString(),
  };

  validateInterviewQuestion(normalizedRecord);

  return normalizedRecord;
};

const mapRowToInterviewQuestion = (row) => {
  return {
    id: row.id,
    question: row.question,
    answer: row.answer,
    category: row.category,
    topic: row.topic,
    difficulty: row.difficulty,
    domain: row.domain || "",
    subtopic: row.subtopic || "",
    content_type: row.content_type || "concept_explanation",
    intent_type: row.intent_type || "explanation",
    keywords: parseKeywords(row.keywords),
    tags: parseTags(row.tags),
    source: row.source,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
};

const createInterviewQuestionsTable = (database) => {
  database.exec(`
    CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      category TEXT NOT NULL,
      topic TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      domain TEXT NOT NULL DEFAULT '',
      subtopic TEXT NOT NULL DEFAULT '',
      content_type TEXT NOT NULL DEFAULT 'concept_explanation',
      intent_type TEXT NOT NULL DEFAULT 'explanation',
      keywords TEXT NOT NULL DEFAULT '',
      tags TEXT NOT NULL DEFAULT '[]',
      source TEXT NOT NULL DEFAULT 'internal',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_interview_questions_category_topic_difficulty
    ON ${TABLE_NAME} (category, topic, difficulty);

    CREATE INDEX IF NOT EXISTS idx_interview_questions_source
    ON ${TABLE_NAME} (source);
  `);
};

module.exports = {
  CATEGORY_OPTIONS,
  TOPIC_OPTIONS,
  DIFFICULTY_OPTIONS,
  DOMAIN_OPTIONS,
  CONTENT_TYPE_OPTIONS,
  INTENT_TYPE_OPTIONS,
  TABLE_NAME,
  REQUIRED_COLUMNS,
  EXTRA_INDEXES,
  createInterviewQuestionsTable,
  normalizeInterviewQuestion,
  mapRowToInterviewQuestion,
  serializeTags,
  serializeKeywords,
};
