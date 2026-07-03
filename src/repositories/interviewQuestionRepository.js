const { getDatabase } = require("../config/db");
const {
  TABLE_NAME,
  mapRowToInterviewQuestion,
  normalizeInterviewQuestion,
  serializeTags,
} = require("../models/InterviewQuestion");

const insertStatement = `
  INSERT INTO ${TABLE_NAME} (
    question,
    answer,
    category,
    topic,
    difficulty,
    domain,
    subtopic,
    content_type,
    intent_type,
    keywords,
    tags,
    source,
    createdAt,
    updatedAt
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "can",
  "do",
  "for",
  "how",
  "i",
  "in",
  "is",
  "me",
  "my",
  "of",
  "on",
  "or",
  "please",
  "tell",
  "the",
  "to",
  "what",
  "when",
  "where",
  "which",
  "why",
  "you",
]);

const PRACTICE_CONTENT_TYPES = ["practice_prompt", "interview_question"];
const SUPPORT_CONTENT_TYPES = [
  "concept_explanation",
  "comparison",
  "interview_question",
];
const NORMAL_ALLOWED_SOURCES = [
  "synthetic_dataset",
  "starter_data",
  "technical_dataset",
];
const SOURCE_SCORE_ADJUSTMENTS = {
  synthetic_dataset: 8,
  starter_data: 3,
  technical_dataset: -1,
  mock_dataset: -2,
};
const DOMAIN_FIELD_TERMS = {
  behavioral: ["behavioral", "hr", "leadership", "teamwork", "conflict"],
  programming: ["programming", "java", "python", "javascript", "c", "c++"],
  oop: ["oop", "object oriented", "encapsulation", "inheritance", "polymorphism", "abstraction"],
  dbms: ["dbms", "database", "sql", "normalization", "transaction", "acid"],
  os: ["os", "operating system", "process", "thread", "deadlock", "scheduling"],
  cn: ["cn", "computer networks", "network", "internet", "tcp", "udp", "osi"],
  dsa: [
    "dsa",
    "data structure",
    "algorithm",
    "array",
    "linked list",
    "stack",
    "queue",
    "tree",
    "graph",
    "sorting",
    "searching",
    "merge sort",
    "insertion sort",
    "greedy",
    "dynamic programming",
    "hashing",
    "hashmap",
  ],
};
const WEAK_SOURCE_MINIMUM_SCORE = {
  mock_dataset: 18,
  technical_dataset: 14,
};

const escapeLikeValue = (value) => {
  return value.replace(/[%_]/g, "\\$&");
};

const applyQueryAliases = (value) => {
  let normalizedValue = String(value || "").toLowerCase().trim();

  normalizedValue = normalizedValue.replace(/^explain\s+(.+)$/i, "what is $1");
  normalizedValue = normalizedValue.replace(/^define\s+(.+)$/i, "what is $1");
  normalizedValue = normalizedValue.replace(/\boperating systems?\b/gi, "os");
  normalizedValue = normalizedValue.replace(/\bmultithreading\b/gi, "thread");
  normalizedValue = normalizedValue.replace(/\bjav\b/gi, "java");
  normalizedValue = normalizedValue.replace(/\bhash maps?\b/gi, "hashmap");
  normalizedValue = normalizedValue.replace(/\bhash tables?\b/gi, "hashmap");
  normalizedValue = normalizedValue.replace(/\binsertion sorts?\b/gi, "insertion sort");
  normalizedValue = normalizedValue.replace(/\bmerge sorts?\b/gi, "merge sort");
  normalizedValue = normalizedValue.replace(/\bgreedy algorithms?\b/gi, "greedy algorithm");
  normalizedValue = normalizedValue.replace(/\bsorting algorithms?\b/gi, "sorting algorithm");
  normalizedValue = normalizedValue.replace(/\bsearching algorithms?\b/gi, "searching algorithm");
  normalizedValue = normalizedValue.replace(/\bsearch algorithms?\b/gi, "searching algorithm");
  normalizedValue = normalizedValue.replace(/\bdynamic programs?\b/gi, "dynamic programming");
  normalizedValue = normalizedValue.replace(/\bdynamic programmes?\b/gi, "dynamic programming");

  return normalizedValue;
};

const normalizeKeywordToken = (token) => {
  const normalizedToken = String(token || "").trim().toLowerCase();

  if (normalizedToken.length <= 4) {
    return normalizedToken;
  }

  if (normalizedToken.endsWith("ies")) {
    return `${normalizedToken.slice(0, -3)}y`;
  }

  if (
    normalizedToken.endsWith("sses") ||
    normalizedToken.endsWith("ches") ||
    normalizedToken.endsWith("shes") ||
    normalizedToken.endsWith("xes") ||
    normalizedToken.endsWith("zes")
  ) {
    return normalizedToken.slice(0, -2);
  }

  if (normalizedToken.endsWith("s") && !normalizedToken.endsWith("ss")) {
    return normalizedToken.slice(0, -1);
  }

  return normalizedToken;
};

const normalizeText = (value) => {
  return applyQueryAliases(value)
    .toLowerCase()
    .replace(/[^a-z0-9+\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const getSourceScoreAdjustment = (source) => {
  return SOURCE_SCORE_ADJUSTMENTS[source] || 0;
};

const getSourcePriority = (source) => {
  switch (source) {
    case "synthetic_dataset":
      return 0;
    case "starter_data":
      return 1;
    case "technical_dataset":
      return 2;
    case "mock_dataset":
      return 3;
    default:
      return 4;
  }
};

const extractKeywords = (message) => {
  return [...new Set(
    normalizeText(message)
      .split(" ")
      .map(normalizeKeywordToken)
      .filter(
        (word) => word && word.length > 1 && !STOP_WORDS.has(word)
      )
  )];
};

const detectIntent = (message) => {
  const normalizedMessage = normalizeText(message);

  if (
    normalizedMessage.includes("difference between") ||
    normalizedMessage.includes("compare") ||
    normalizedMessage.includes(" vs ")
  ) {
    return "comparison";
  }

  if (
    normalizedMessage.includes("ask me") ||
    normalizedMessage.includes("quiz me") ||
    normalizedMessage.includes("practice") ||
    normalizedMessage.includes("mock question")
  ) {
    return "practice";
  }

  if (
    normalizedMessage.includes("what is") ||
    normalizedMessage.includes("define") ||
    normalizedMessage.includes("meaning of")
  ) {
    return "definition";
  }

  return "explanation";
};

const detectDomain = (message) => {
  const normalizedMessage = normalizeText(message);

  if (
    normalizedMessage.includes("tell me about yourself") ||
    normalizedMessage.includes("strength") ||
    normalizedMessage.includes("weakness") ||
    normalizedMessage.includes("leadership") ||
    normalizedMessage.includes("conflict") ||
    normalizedMessage.includes("teamwork") ||
    normalizedMessage.includes("behavioral")
  ) {
    return "behavioral";
  }

  if (
    normalizedMessage.includes("object oriented") ||
    normalizedMessage.includes("oop") ||
    normalizedMessage.includes("inheritance") ||
    normalizedMessage.includes("polymorphism") ||
    normalizedMessage.includes("abstraction") ||
    normalizedMessage.includes("encapsulation")
  ) {
    return "oop";
  }

  if (
    normalizedMessage.includes("dbms") ||
    normalizedMessage.includes("sql") ||
    normalizedMessage.includes("normalization") ||
    normalizedMessage.includes("transaction") ||
    normalizedMessage.includes("acid") ||
    normalizedMessage.includes("join")
  ) {
    return "dbms";
  }

  if (
    normalizedMessage.includes("operating system") ||
    normalizedMessage.includes(" os ") ||
    normalizedMessage.startsWith("os ") ||
    normalizedMessage.endsWith(" os") ||
    normalizedMessage.includes("process") ||
    normalizedMessage.includes("thread") ||
    normalizedMessage.includes("deadlock") ||
    normalizedMessage.includes("scheduling")
  ) {
    return "os";
  }

  if (
    normalizedMessage.includes("computer network") ||
    normalizedMessage.includes("networks") ||
    normalizedMessage.includes("internet") ||
    normalizedMessage.includes(" cn ") ||
    normalizedMessage.startsWith("cn ") ||
    normalizedMessage.endsWith(" cn") ||
    normalizedMessage.includes("tcp") ||
    normalizedMessage.includes("udp") ||
    normalizedMessage.includes("http") ||
    normalizedMessage.includes("osi")
  ) {
    return "cn";
  }

  if (
    normalizedMessage.includes("dsa") ||
    normalizedMessage.includes("array") ||
    normalizedMessage.includes("linked list") ||
    normalizedMessage.includes("tree") ||
    normalizedMessage.includes("graph") ||
    normalizedMessage.includes("recursion") ||
    normalizedMessage.includes("binary search") ||
    normalizedMessage.includes("stack") ||
    normalizedMessage.includes("queue") ||
    normalizedMessage.includes("sorting") ||
    normalizedMessage.includes("searching") ||
    normalizedMessage.includes("merge sort") ||
    normalizedMessage.includes("insertion sort") ||
    normalizedMessage.includes("greedy algorithm") ||
    normalizedMessage.includes("dynamic programming") ||
    normalizedMessage.includes("hashing") ||
    normalizedMessage.includes("hashmap")
  ) {
    return "dsa";
  }

  if (
    normalizedMessage.includes("java") ||
    normalizedMessage.includes("python") ||
    normalizedMessage.includes("javascript") ||
    normalizedMessage.includes("c++") ||
    normalizedMessage.includes(" c ") ||
    normalizedMessage.endsWith(" c") ||
    normalizedMessage.startsWith("c ")
  ) {
    return "programming";
  }

  return null;
};

const buildQueryContext = (message) => {
  const normalizedMessage = normalizeText(message);
  const keywords = extractKeywords(message);

  return {
    rawMessage: String(message || "").trim(),
    normalizedMessage,
    keywords,
    intent: detectIntent(message),
    domain: detectDomain(message),
  };
};

const dedupeCandidates = (candidates) => {
  const uniqueCandidates = new Map();

  for (const candidate of candidates) {
    if (!candidate || uniqueCandidates.has(candidate.id)) {
      continue;
    }

    uniqueCandidates.set(candidate.id, candidate);
  }

  return [...uniqueCandidates.values()];
};

const matchesTopicPreference = (candidate, preferredTopic) => {
  if (!preferredTopic) {
    return true;
  }

  const normalizedTopic = normalizeText(candidate.topic);
  const normalizedSubtopic = normalizeText(candidate.subtopic);

  return (
    normalizedTopic === preferredTopic ||
    normalizedSubtopic === preferredTopic ||
    normalizedTopic.includes(preferredTopic) ||
    normalizedSubtopic.includes(preferredTopic)
  );
};

const filterCandidatesByOptions = (candidates, options = {}) => {
  const allowedContentTypes = Array.isArray(options.contentTypes)
    ? options.contentTypes
    : null;
  const allowedSources = Array.isArray(options.allowedSources)
    ? new Set(options.allowedSources)
    : null;
  const excludedIds = new Set(
    Array.isArray(options.excludeIds) ? options.excludeIds : []
  );

  return candidates.filter((candidate) => {
    if (excludedIds.has(candidate.id)) {
      return false;
    }

    if (allowedSources && !allowedSources.has(candidate.source)) {
      return false;
    }

    if (!allowedContentTypes || allowedContentTypes.length === 0) {
      return true;
    }

    return allowedContentTypes.includes(candidate.content_type);
  });
};

const filterPracticeCandidatesByScope = (candidates, options = {}) => {
  const preferredDomain = normalizeText(options.preferredDomain);
  const preferredTopic = normalizeText(options.preferredTopic);

  return candidates.filter((candidate) => {
    if (
      preferredDomain &&
      normalizeText(candidate.domain) !== preferredDomain
    ) {
      return false;
    }

    if (!matchesTopicPreference(candidate, preferredTopic)) {
      return false;
    }

    return true;
  });
};

const getNormalizedSourceList = (allowedSources) => {
  if (!Array.isArray(allowedSources) || allowedSources.length === 0) {
    return null;
  }

  return [...new Set(
    allowedSources
      .map((source) => String(source || "").trim())
      .filter(Boolean)
  )];
};

const fetchCandidateQuestions = (context, options = {}) => {
  const database = getDatabase();
  const searchTerms = [context.normalizedMessage, ...context.keywords]
    .filter(Boolean)
    .slice(0, 8);
  const allowedSources = getNormalizedSourceList(options.allowedSources);

  if (searchTerms.length === 0) {
    return [];
  }

  const whereParts = [];
  const scoreParts = [];
  const parameters = [];

  for (const term of searchTerms) {
    const pattern = `%${escapeLikeValue(term)}%`;

    scoreParts.push(
      "(CASE WHEN LOWER(question) LIKE ? ESCAPE '\\' THEN 5 ELSE 0 END)",
      "(CASE WHEN LOWER(keywords) LIKE ? ESCAPE '\\' THEN 4 ELSE 0 END)",
      "(CASE WHEN LOWER(topic) LIKE ? ESCAPE '\\' THEN 4 ELSE 0 END)",
      "(CASE WHEN LOWER(domain) LIKE ? ESCAPE '\\' THEN 4 ELSE 0 END)",
      "(CASE WHEN LOWER(subtopic) LIKE ? ESCAPE '\\' THEN 4 ELSE 0 END)",
      "(CASE WHEN LOWER(tags) LIKE ? ESCAPE '\\' THEN 2 ELSE 0 END)",
      "(CASE WHEN LOWER(answer) LIKE ? ESCAPE '\\' THEN 1 ELSE 0 END)"
    );
    whereParts.push(
      "LOWER(question) LIKE ? ESCAPE '\\'",
      "LOWER(answer) LIKE ? ESCAPE '\\'",
      "LOWER(topic) LIKE ? ESCAPE '\\'",
      "LOWER(tags) LIKE ? ESCAPE '\\'",
      "LOWER(keywords) LIKE ? ESCAPE '\\'",
      "LOWER(domain) LIKE ? ESCAPE '\\'",
      "LOWER(subtopic) LIKE ? ESCAPE '\\'"
    );

    parameters.push(
      pattern,
      pattern,
      pattern,
      pattern,
      pattern,
      pattern,
      pattern
    );
    parameters.push(
      pattern,
      pattern,
      pattern,
      pattern,
      pattern,
      pattern,
      pattern
    );
  }

  const sourceFilter =
    allowedSources && allowedSources.length > 0
      ? ` AND source IN (${allowedSources.map(() => "?").join(", ")})`
      : "";

  const rows = database
    .prepare(
      `
        SELECT *,
          ${scoreParts.join(" + ")} AS preliminary_score
        FROM ${TABLE_NAME}
        WHERE (${whereParts.join(" OR ")})${sourceFilter}
        ORDER BY
          preliminary_score DESC,
          CASE source
            WHEN 'synthetic_dataset' THEN 0
            WHEN 'starter_data' THEN 1
            WHEN 'technical_dataset' THEN 2
            WHEN 'mock_dataset' THEN 3
            ELSE 4
          END ASC,
          id DESC
        LIMIT 60
      `
    )
    .all(...parameters, ...(allowedSources || []));

  return rows.map(mapRowToInterviewQuestion);
};

const hasKeywordMatch = (text, keyword) => {
  return normalizeText(text)
    .split(" ")
    .map(normalizeKeywordToken)
    .includes(keyword);
};

const hasStructuredDomainEvidence = (candidate, domain) => {
  if (!domain) {
    return false;
  }

  const allowedTerms = DOMAIN_FIELD_TERMS[domain] || [];
  const candidateFields = [
    candidate.domain,
    candidate.topic,
    candidate.subtopic,
    ...(candidate.tags || []),
    ...(candidate.keywords || []),
  ]
    .map((value) => normalizeText(value))
    .filter(Boolean);

  return candidateFields.some((fieldValue) =>
    allowedTerms.some(
      (allowedTerm) =>
        fieldValue === allowedTerm ||
        fieldValue.includes(allowedTerm) ||
        allowedTerm.includes(fieldValue)
    )
  );
};

const getCandidateScore = (candidate, context) => {
  let score = 0;
  const normalizedQuestion = normalizeText(candidate.question);
  const normalizedAnswer = normalizeText(candidate.answer);
  const normalizedTopic = normalizeText(candidate.topic);
  const normalizedSubtopic = normalizeText(candidate.subtopic);
  const normalizedDomain = normalizeText(candidate.domain);
  const tagValues = (candidate.tags || []).map((tag) => normalizeText(tag));
  const keywordValues = (candidate.keywords || []).map((keyword) =>
    normalizeText(keyword)
  );

  if (normalizedQuestion === context.normalizedMessage) {
    score += 12;
  }

  if (
    context.normalizedMessage &&
    normalizedQuestion.includes(context.normalizedMessage)
  ) {
    score += 8;
  }

  for (const keyword of context.keywords) {
    if (hasKeywordMatch(candidate.question, keyword)) {
      score += 4;
    }

    if (
      keywordValues.some(
        (value) =>
          value === keyword ||
          value.includes(keyword) ||
          keyword.includes(value)
      )
    ) {
      score += 5;
    }

    if (tagValues.some((value) => value.includes(keyword))) {
      score += 3;
    }

    if (normalizedAnswer.includes(keyword)) {
      score += 1;
    }

    if (normalizedSubtopic.includes(keyword)) {
      score += 5;
    }
  }

  if (
    context.domain &&
    (normalizedDomain === context.domain || normalizedTopic === context.domain)
  ) {
    score += 6;
  }

  if (context.normalizedMessage) {
    if (normalizedTopic && context.normalizedMessage.includes(normalizedTopic)) {
      score += 6;
    }

    if (
      normalizedSubtopic &&
      context.normalizedMessage.includes(normalizedSubtopic)
    ) {
      score += 5;
    }
  }

  if (candidate.intent_type === context.intent) {
    score += 5;
  }

  score += getSourceScoreAdjustment(candidate.source);

  if (
    candidate.content_type === "practice_prompt" &&
    context.intent !== "practice"
  ) {
    score -= 8;
  }

  if (
    context.domain &&
    normalizedDomain &&
    normalizedDomain !== context.domain
  ) {
    score -= 12;
  }

  if (context.domain && !normalizedDomain) {
    score -= 8;
  }

  if (context.domain && !hasStructuredDomainEvidence(candidate, context.domain)) {
    score -= 10;
  }

  return score;
};

const getPracticeCandidateScore = (candidate, context, options = {}) => {
  let score = getCandidateScore(candidate, context);
  const preferredDomain = normalizeText(options.preferredDomain);
  const preferredTopic = normalizeText(options.preferredTopic);
  const normalizedDomain = normalizeText(candidate.domain);

  if (candidate.content_type === "interview_question") {
    score += 6;
  } else if (candidate.content_type === "practice_prompt") {
    score += 4;
  }

  if (preferredDomain && normalizedDomain === preferredDomain) {
    score += 6;
  }

  if (preferredTopic && matchesTopicPreference(candidate, preferredTopic)) {
    score += 4;
  }

  return score;
};

const getAllQuestions = () => {
  const database = getDatabase();
  const rows = database
    .prepare(`SELECT * FROM ${TABLE_NAME} ORDER BY createdAt ASC`)
    .all();

  return rows.map(mapRowToInterviewQuestion);
};

const findMostRelevantQuestion = (message, options = {}) => {
  const context = buildQueryContext(message);
  const allowedSources = getNormalizedSourceList(
    options.allowedSources || NORMAL_ALLOWED_SOURCES
  );

  if (!context.normalizedMessage) {
    return null;
  }

  const candidates = filterCandidatesByOptions(
    fetchCandidateQuestions(context, { allowedSources }),
    {
      ...options,
      allowedSources,
    }
  )
    .map((candidate) => ({
      candidate,
      score: getCandidateScore(candidate, context),
    }));

  candidates.sort((left, right) => {
    if (right.score !== left.score) {
      if (
        Math.abs(right.score - left.score) <= 5 &&
        left.candidate.source !== right.candidate.source
      ) {
        return (
          getSourcePriority(left.candidate.source) -
          getSourcePriority(right.candidate.source)
        );
      }

      return right.score - left.score;
    }

    if (left.candidate.source !== right.candidate.source) {
      return (
        getSourcePriority(left.candidate.source) -
        getSourcePriority(right.candidate.source)
      );
    }

    if (left.candidate.question.length !== right.candidate.question.length) {
      return left.candidate.question.length - right.candidate.question.length;
    }

    return left.candidate.id - right.candidate.id;
  });

  const bestMatch = candidates[0];

  if (!bestMatch || bestMatch.score < 8) {
    return null;
  }

  const minimumWeakSourceScore =
    WEAK_SOURCE_MINIMUM_SCORE[bestMatch.candidate.source];

  if (
    minimumWeakSourceScore &&
    bestMatch.score < minimumWeakSourceScore
  ) {
    return null;
  }

  return bestMatch.candidate;
};

const findPracticeQuestion = (message, options = {}) => {
  const context = buildQueryContext(message);
  const preferredDomain = normalizeText(
    options.preferredDomain || context.domain || ""
  );
  const preferredTopic = normalizeText(options.preferredTopic || "");

  let candidates = filterPracticeCandidatesByScope(
    filterCandidatesByOptions(
      fetchCandidateQuestions(context, {
        allowedSources: ["synthetic_dataset"],
      }),
      {
        contentTypes: PRACTICE_CONTENT_TYPES,
        allowedSources: ["synthetic_dataset"],
        excludeIds: options.excludeIds,
      }
    ),
    {
      preferredDomain,
      preferredTopic,
    }
  );

  const fallbackCandidates = getAllQuestions().filter((candidate) => {
    if (!PRACTICE_CONTENT_TYPES.includes(candidate.content_type)) {
      return false;
    }

    if (
      Array.isArray(options.excludeIds) &&
      options.excludeIds.includes(candidate.id)
    ) {
      return false;
    }

    if (candidate.source !== "synthetic_dataset") {
      return false;
    }

    if (preferredDomain && normalizeText(candidate.domain) !== preferredDomain) {
      return false;
    }

    if (!matchesTopicPreference(candidate, preferredTopic)) {
      return false;
    }

    return true;
  });

  candidates = dedupeCandidates([...candidates, ...fallbackCandidates]).map(
    (candidate) => ({
      candidate,
      score: getPracticeCandidateScore(candidate, context, {
        preferredDomain,
        preferredTopic,
      }),
    })
  );

  candidates.sort((left, right) => {
    if (right.score !== left.score) {
      if (
        Math.abs(right.score - left.score) <= 4 &&
        left.candidate.source !== right.candidate.source
      ) {
        return (
          getSourcePriority(left.candidate.source) -
          getSourcePriority(right.candidate.source)
        );
      }

      return right.score - left.score;
    }

    if (left.candidate.content_type !== right.candidate.content_type) {
      if (left.candidate.content_type === "interview_question") return -1;
      if (right.candidate.content_type === "interview_question") return 1;
    }

    if (left.candidate.source !== right.candidate.source) {
      return (
        getSourcePriority(left.candidate.source) -
        getSourcePriority(right.candidate.source)
      );
    }

    return left.candidate.id - right.candidate.id;
  });

  return candidates[0] ? candidates[0].candidate : null;
};

const findRelatedInterviewQuestion = (conceptMatch) => {
  if (!conceptMatch) {
    return null;
  }

  const database = getDatabase();
  const allowedSources = NORMAL_ALLOWED_SOURCES;
  const rows = database
    .prepare(
      `
        SELECT *
        FROM ${TABLE_NAME}
        WHERE id != ?
          AND domain = ?
          AND topic = ?
          AND content_type IN ('interview_question', 'practice_prompt')
          AND source IN (${allowedSources.map(() => "?").join(", ")})
        ORDER BY
          CASE WHEN subtopic = ? THEN 0 ELSE 1 END,
          CASE WHEN source = 'synthetic_dataset' THEN 0 ELSE 1 END,
          id ASC
        LIMIT 5
      `
    )
    .all(
      conceptMatch.id,
      conceptMatch.domain || "",
      conceptMatch.topic || "",
      ...allowedSources,
      conceptMatch.subtopic || ""
    );

  const bestRow = rows[0];

  return bestRow ? mapRowToInterviewQuestion(bestRow) : null;
};

const findPracticeSupportQuestion = (practiceQuestion) => {
  if (!practiceQuestion) {
    return null;
  }

  const directPrompt = practiceQuestion.content_type === "practice_prompt"
    ? practiceQuestion.answer
    : practiceQuestion.question;
  const context = buildQueryContext(directPrompt);
  const candidates = getAllQuestions()
    .filter((candidate) => {
      if (candidate.id === practiceQuestion.id) {
        return false;
      }

      if (!SUPPORT_CONTENT_TYPES.includes(candidate.content_type)) {
        return false;
      }

      if (
        practiceQuestion.domain &&
        normalizeText(candidate.domain) !== normalizeText(practiceQuestion.domain)
      ) {
        return false;
      }

      if (
        practiceQuestion.topic &&
        candidate.topic &&
        candidate.topic !== practiceQuestion.topic
      ) {
        return false;
      }

      return true;
    })
    .map((candidate) => {
      let score = getCandidateScore(candidate, context);

      if (candidate.subtopic === practiceQuestion.subtopic) {
        score += 6;
      }

      if (candidate.topic === practiceQuestion.topic) {
        score += 4;
      }

      if (candidate.source === "synthetic_dataset") {
        score += 2;
      }

      return {
        candidate,
        score,
      };
    })
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.candidate.id - right.candidate.id;
    });

  const bestCandidate = candidates[0];

  if (!bestCandidate || bestCandidate.score < 8) {
    return null;
  }

  return bestCandidate.candidate;
};

const replaceQuestionsBySource = (questions, source) => {
  const database = getDatabase();
  const deleteStatement = database.prepare(
    `DELETE FROM ${TABLE_NAME} WHERE source = ?`
  );
  const insertQuestion = database.prepare(insertStatement);

  const transaction = database.transaction((records) => {
    deleteStatement.run(source);

    for (const record of records) {
      const normalizedRecord = normalizeInterviewQuestion(record);

      insertQuestion.run(
        normalizedRecord.question,
        normalizedRecord.answer,
        normalizedRecord.category,
        normalizedRecord.topic,
        normalizedRecord.difficulty,
        normalizedRecord.domain,
        normalizedRecord.subtopic,
        normalizedRecord.content_type,
        normalizedRecord.intent_type,
        normalizedRecord.keywords,
        serializeTags(normalizedRecord.tags),
        normalizedRecord.source,
        normalizedRecord.createdAt,
        normalizedRecord.updatedAt
      );
    }
  });

  transaction(questions);

  return questions.length;
};

module.exports = {
  findPracticeQuestion,
  findPracticeSupportQuestion,
  findRelatedInterviewQuestion,
  findMostRelevantQuestion,
  getAllQuestions,
  replaceQuestionsBySource,
};
