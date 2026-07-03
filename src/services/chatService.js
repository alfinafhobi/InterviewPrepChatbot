const {
  findPracticeQuestion,
  findRelatedInterviewQuestion,
  findMostRelevantQuestion,
} = require("../repositories/interviewQuestionRepository");

const LEARNING_QUERY_PATTERNS = [
  "what is",
  "define",
  "explain",
  "meaning of",
];

const PRACTICE_QUERY_PATTERNS = [
  "ask me a question",
  "ask me an interview question",
  "ask me",
  "quiz me",
  "practice",
  "mock interview",
  "mock question",
];

const NEXT_QUESTION_PATTERNS = [
  "next question",
  "another question",
  "ask another",
  "continue practice",
];
const EXIT_PRACTICE_PATTERNS = [
  "exit practice",
  "stop practice",
  "end practice",
  "quit practice",
];

const DOMAIN_FEEDBACK_GUIDANCE = {
  behavioral:
    "A strong behavioral answer should use a clear situation, your actions, and the result.",
  programming:
    "A strong programming answer should define the concept and mention a practical code-level use.",
  oop:
    "A strong OOP answer should define the concept and connect it to object-oriented design or an example.",
  dbms:
    "A strong DBMS answer should define the idea and mention why it matters in database design or queries.",
  os: "A strong OS answer should explain the concept and mention its effect on execution or system behavior.",
  cn: "A strong networking answer should define the concept and mention the protocol behavior or use case.",
  dsa: "A strong DSA answer should explain the concept clearly and mention the data structure or complexity idea.",
};

const PRACTICE_EXPECTED_ANSWERS = {
  "tell me about yourself": {
    expectedAnswer:
      "Start with your current role or education, mention key skills, highlight one relevant achievement or project, and end with why this role fits you.",
    keyConcepts: [
      ["current role", "student", "education", "background"],
      ["skill", "backend", "database", "programming", "technical"],
      ["achievement", "project", "built", "experience"],
      ["role fits", "why this role", "interested", "excited", "fit"],
    ],
  },
  leadership: {
    expectedAnswer:
      "Use STAR and explain the situation, your leadership actions, and the result.",
    keyConcepts: [
      ["situation", "challenge", "task"],
      ["lead", "leadership", "guided", "managed"],
      ["action", "decision", "communication"],
      ["result", "outcome", "impact"],
    ],
  },
  "overloading and overriding": {
    expectedAnswer:
      "Function overloading uses the same name with different parameters, while overriding changes inherited behavior in a child class.",
    keyConcepts: [
      ["overloading", "different parameters"],
      ["overriding", "child class", "inherited behavior"],
    ],
  },
  "four pillars": {
    expectedAnswer:
      "The four pillars of OOP are encapsulation, inheritance, polymorphism, and abstraction.",
    keyConcepts: [
      ["encapsulation"],
      ["inheritance"],
      ["polymorphism"],
      ["abstraction"],
    ],
  },
  "array vs linked list": {
    expectedAnswer:
      "An array stores elements in contiguous memory and supports fast indexing, while a linked list stores nodes with pointers and makes insertions easier in some cases.",
    keyConcepts: [
      ["array", "contiguous memory"],
      ["indexing", "random access"],
      ["linked list", "node", "pointer"],
      ["insertion", "flexible memory"],
    ],
  },
  deadlock: {
    expectedAnswer:
      "Deadlock happens when processes wait indefinitely for each other's resources. The four conditions are mutual exclusion, hold and wait, no preemption, and circular wait.",
    keyConcepts: [
      ["deadlock", "wait indefinitely", "resource"],
      ["mutual exclusion"],
      ["hold and wait"],
      ["no preemption"],
      ["circular wait"],
    ],
  },
  "cpu scheduling": {
    expectedAnswer:
      "CPU scheduling decides which ready process gets CPU time next to improve utilization and response time.",
    keyConcepts: [
      ["cpu scheduling"],
      ["ready process", "ready queue"],
      ["cpu time", "next process"],
      ["utilization", "response time"],
    ],
  },
};

const practiceSessions = new Map();

const LEARNING_CONTENT = {
  polymorphism: {
    keyPoints: [
      "It lets one interface support multiple implementations.",
      "It commonly appears through method overriding and interfaces.",
      "It improves flexibility and reuse in object-oriented design.",
    ],
    example:
      "A Shape class can expose draw(), while Circle and Rectangle each provide their own draw() behavior.",
  },
  normalization: {
    keyPoints: [
      "It reduces duplicate data across tables.",
      "It helps improve consistency and update correctness.",
      "It is usually discussed through normal forms like 1NF, 2NF, and 3NF.",
    ],
    example:
      "Instead of storing customer data in every order row, keep customers in one table and link orders with a customer id.",
  },
  thread: {
    keyPoints: [
      "A thread is the smallest schedulable unit of execution.",
      "Threads inside one process share memory and resources.",
      "Using multiple threads can improve responsiveness for some workloads.",
    ],
    example:
      "A browser can keep the UI responsive on one thread while another thread loads data in the background.",
  },
};

const normalizeText = (value) => {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9+\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const detectPracticeDomain = (message) => {
  const normalizedMessage = normalizeText(message);

  if (
    normalizedMessage.includes("behavioral") ||
    normalizedMessage.includes("tell me about yourself") ||
    normalizedMessage.includes("leadership") ||
    normalizedMessage.includes("teamwork")
  ) {
    return "behavioral";
  }

  if (
    normalizedMessage.includes("oop") ||
    normalizedMessage.includes("polymorphism") ||
    normalizedMessage.includes("inheritance") ||
    normalizedMessage.includes("abstraction") ||
    normalizedMessage.includes("encapsulation")
  ) {
    return "oop";
  }

  if (
    normalizedMessage.includes("dbms") ||
    normalizedMessage.includes("normalization") ||
    normalizedMessage.includes("acid")
  ) {
    return "dbms";
  }

  if (
    normalizedMessage.includes("os") ||
    normalizedMessage.includes("operating system") ||
    normalizedMessage.includes("process") ||
    normalizedMessage.includes("thread") ||
    normalizedMessage.includes("deadlock") ||
    normalizedMessage.includes("scheduling")
  ) {
    return "os";
  }

  if (
    normalizedMessage.includes("cn") ||
    normalizedMessage.includes("network") ||
    normalizedMessage.includes("tcp") ||
    normalizedMessage.includes("udp") ||
    normalizedMessage.includes("edge devices")
  ) {
    return "cn";
  }

  if (
    normalizedMessage.includes("dsa") ||
    normalizedMessage.includes("stack") ||
    normalizedMessage.includes("queue") ||
    normalizedMessage.includes("array") ||
    normalizedMessage.includes("linked list")
  ) {
    return "dsa";
  }

  if (
    normalizedMessage.includes("java") ||
    normalizedMessage.includes("python") ||
    normalizedMessage.includes("javascript") ||
    normalizedMessage.includes("compile time") ||
    normalizedMessage.includes("runtime error") ||
    normalizedMessage.includes("syntax error")
  ) {
    return "programming";
  }

  return null;
};

const normalizeKeywordToken = (token) => {
  return String(token || "")
    .replace(/(ing|ed|es|s)$/i, "")
    .trim();
};

const extractKeywords = (value) => {
  const stopWords = new Set([
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "by",
    "for",
    "from",
    "how",
    "in",
    "is",
    "it",
    "of",
    "on",
    "or",
    "that",
    "the",
    "to",
    "what",
    "when",
    "where",
    "which",
    "with",
  ]);

  return [...new Set(
    normalizeText(value)
      .split(" ")
      .map(normalizeKeywordToken)
      .filter((word) => word && word.length > 2 && !stopWords.has(word))
  )];
};

const isLearningQuery = (message) => {
  const normalizedMessage = normalizeText(message);

  return LEARNING_QUERY_PATTERNS.some((pattern) =>
    normalizedMessage.includes(pattern)
  );
};

const isPracticeRequest = (message) => {
  const normalizedMessage = normalizeText(message);

  return PRACTICE_QUERY_PATTERNS.some((pattern) =>
    normalizedMessage.includes(pattern)
  );
};

const isNextQuestionRequest = (message) => {
  const normalizedMessage = normalizeText(message);

  return NEXT_QUESTION_PATTERNS.some((pattern) =>
    normalizedMessage.includes(pattern)
  );
};

const isExitPracticeRequest = (message) => {
  const normalizedMessage = normalizeText(message);

  return EXIT_PRACTICE_PATTERNS.some((pattern) =>
    normalizedMessage.includes(pattern)
  );
};

const getLearningQueryFallback = (message) => {
  const normalizedMessage = normalizeText(message);

  if (normalizedMessage.includes("multithreading")) {
    return normalizedMessage.replace("multithreading", "thread");
  }

  return null;
};

const buildGenericKeyPoints = (match) => {
  const points = [
    `${match.subtopic || match.topic} is a common ${match.topic} interview concept.`,
    "Focus on the definition, why it matters, and where it is used.",
  ];

  if (match.domain === "dbms") {
    points.push("Interviewers often ask how it affects database design or query behavior.");
  } else if (match.domain === "oop") {
    points.push("Be ready to explain it with a short object-oriented example.");
  } else if (match.domain === "os") {
    points.push("It is often linked with process management, memory, or execution behavior.");
  } else if (match.domain === "programming") {
    points.push("A short language-specific example usually makes the answer stronger.");
  }

  return points.slice(0, 3);
};

const buildLearningBlock = (match, relatedQuestion) => {
  const contentKey = normalizeText(match.subtopic || match.topic);
  const structuredContent = LEARNING_CONTENT[contentKey] || {};

  return {
    conceptTitle: match.subtopic || match.topic,
    shortExplanation: match.answer,
    keyPoints: structuredContent.keyPoints || buildGenericKeyPoints(match),
    example: structuredContent.example || null,
    relatedInterviewQuestion: relatedQuestion ? relatedQuestion.question : null,
  };
};

const getPracticeSession = (sessionId) => {
  if (!practiceSessions.has(sessionId)) {
    practiceSessions.set(sessionId, {
      active: false,
      awaitingAnswer: false,
      currentDomain: null,
      currentQuestionId: null,
      domain: null,
      topic: null,
      askedQuestionIds: [],
      currentQuestion: null,
    });
  }

  return practiceSessions.get(sessionId);
};

const clearPracticeSession = (session) => {
  session.active = false;
  session.awaitingAnswer = false;
  session.currentDomain = null;
  session.currentQuestionId = null;
  session.domain = null;
  session.topic = null;
  session.askedQuestionIds = [];
  session.currentQuestion = null;
};

const buildPracticeGuidance = (practiceQuestion) => {
  if (!practiceQuestion) {
    return "Focus on the core idea, explain why it matters, and keep the answer concise.";
  }

  return (
    DOMAIN_FEEDBACK_GUIDANCE[practiceQuestion.domain] ||
    "Focus on the core concept, one supporting point, and a short example if relevant."
  );
};

const buildPracticeExpectedAnswerFallback = (practiceQuestion, questionText) => {
  if (!practiceQuestion) {
    return "Focus on the core idea, explain why it matters, and keep the answer concise.";
  }

  const normalizedQuestion = normalizeText(questionText);
  const normalizedSubtopic = normalizeText(practiceQuestion.subtopic);
  const template =
    PRACTICE_EXPECTED_ANSWERS[normalizedQuestion] ||
    PRACTICE_EXPECTED_ANSWERS[normalizedSubtopic];

  return (
    template || {
      expectedAnswer: buildPracticeGuidance(practiceQuestion),
      keyConcepts: [],
    }
  );
};

const buildPracticeResponse = (practiceQuestion, questionText, extras = {}) => {
  return {
    matchedQuestion: questionText,
    answer: extras.answer || questionText,
    category: practiceQuestion.category,
    topic: practiceQuestion.topic,
    source: practiceQuestion.source,
    practice: {
      question: questionText,
      expectedAnswer: extras.expectedAnswer || null,
      feedback: extras.feedback || null,
      score: typeof extras.score === "number" ? extras.score : null,
    },
  };
};

const buildFallbackConcepts = (expectedAnswer) => {
  return extractKeywords(expectedAnswer)
    .slice(0, 6)
    .map((keyword) => [keyword]);
};

const resolvePracticeExpectation = (practiceQuestion, questionText) => {
  if (!practiceQuestion) {
    return {
      expectedAnswer:
        "Focus on the core idea, explain why it matters, and keep the answer concise.",
      keyConcepts: [],
    };
  }

  const explicitTemplate = buildPracticeExpectedAnswerFallback(
    practiceQuestion,
    questionText
  );

  if (explicitTemplate.keyConcepts && explicitTemplate.keyConcepts.length > 0) {
    return {
      expectedAnswer: explicitTemplate.expectedAnswer,
      keyConcepts: explicitTemplate.keyConcepts,
    };
  }

  if (practiceQuestion.content_type === "interview_question") {
    return {
      expectedAnswer: practiceQuestion.answer,
      keyConcepts: buildFallbackConcepts(practiceQuestion.answer),
    };
  }

  return {
    expectedAnswer: explicitTemplate.expectedAnswer,
    keyConcepts:
      explicitTemplate.keyConcepts ||
      buildFallbackConcepts(explicitTemplate.expectedAnswer),
  };
};

const resolvePracticePreferences = (message, session, options = {}) => {
  const detectedDomain = detectPracticeDomain(message);
  const shouldKeepCurrentDomain = options.keepCurrentDomain !== false;
  const preferredDomain =
    detectedDomain || (shouldKeepCurrentDomain ? session.domain : null);
  const domainChanged =
    Boolean(detectedDomain) &&
    Boolean(session.domain) &&
    detectedDomain !== session.domain;

  return {
    preferredDomain,
    preferredTopic:
      domainChanged || detectedDomain ? null : session.topic,
    domainChanged,
  };
};

const isPracticeSwitchRequest = (message, session) => {
  if (!session.active) {
    return false;
  }

  const normalizedMessage = normalizeText(message);
  const detectedDomain = detectPracticeDomain(message);

  if (
    normalizedMessage.includes("switch topic") ||
    normalizedMessage.includes("switch to")
  ) {
    return true;
  }

  return (
    isPracticeRequest(message) &&
    Boolean(detectedDomain) &&
    detectedDomain !== session.currentDomain
  );
};

const isClearlyNewNonAnswerIntent = (message) => {
  const normalizedMessage = normalizeText(message);

  if (!normalizedMessage) {
    return false;
  }

  return (
    normalizedMessage.startsWith("what is ") ||
    normalizedMessage.startsWith("define ") ||
    normalizedMessage.startsWith("explain ") ||
    normalizedMessage.startsWith("difference between ") ||
    normalizedMessage.startsWith("compare ") ||
    normalizedMessage.endsWith("?")
  );
};

const buildPracticeSearchMessage = (message) => {
  const normalizedMessage = normalizeText(message);
  const simplifiedMessage = normalizedMessage
    .replace(/^ask me\s+(an?\s+)?/i, "")
    .replace(/^quiz me\s+(on\s+)?/i, "")
    .replace(/^practice\s+/i, "")
    .replace(/^mock interview\s*/i, "")
    .replace(/\binterview question\b/gi, "")
    .replace(/\bmock question\b/gi, "")
    .replace(/\bquestion\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  return simplifiedMessage || normalizedMessage;
};

const resolvePracticeSearchMessage = (message, preferredDomain) => {
  const searchMessage = buildPracticeSearchMessage(message);

  if (!preferredDomain) {
    return searchMessage;
  }

  const normalizedSearchMessage = normalizeText(searchMessage);

  if (
    !normalizedSearchMessage ||
    normalizedSearchMessage === preferredDomain ||
    normalizedSearchMessage === `question on ${preferredDomain}` ||
    normalizedSearchMessage === `questions on ${preferredDomain}` ||
    normalizedSearchMessage === `questions ${preferredDomain}` ||
    normalizedSearchMessage === `on ${preferredDomain}`
  ) {
    return preferredDomain;
  }

  return searchMessage;
};

const startPracticeRound = (message, session, options = {}) => {
  const preferences = resolvePracticePreferences(message, session, options);
  const searchMessage = resolvePracticeSearchMessage(
    message,
    preferences.preferredDomain
  );

  if (preferences.domainChanged) {
    session.askedQuestionIds = [];
    session.topic = null;
  }

  let practiceQuestion = findPracticeQuestion(searchMessage, {
    excludeIds: session.askedQuestionIds,
    preferredDomain: preferences.preferredDomain,
    preferredTopic: preferences.preferredTopic,
  });

  if (!practiceQuestion && searchMessage !== normalizeText(message)) {
    practiceQuestion = findPracticeQuestion(message, {
      excludeIds: session.askedQuestionIds,
      preferredDomain: preferences.preferredDomain,
      preferredTopic: preferences.preferredTopic,
    });
  }

  if (!practiceQuestion) {
    session.awaitingAnswer = false;
    session.currentQuestionId = null;
    session.currentQuestion = null;

    return {
      matchedQuestion: null,
      answer: "I could not find a suitable practice question right now. Try a topic like OOP, DBMS, OS, CN, or DSA.",
      category: null,
      topic: null,
      source: null,
    };
  }

  const questionText =
    practiceQuestion.content_type === "practice_prompt"
      ? practiceQuestion.answer
      : practiceQuestion.question;
  const expectation = resolvePracticeExpectation(practiceQuestion, questionText);

  session.active = true;
  session.awaitingAnswer = true;
  session.currentDomain =
    practiceQuestion.domain ||
    preferences.preferredDomain ||
    session.currentDomain;
  session.domain = session.currentDomain;
  session.topic = practiceQuestion.topic || session.topic;
  session.currentQuestionId = practiceQuestion.id;
  session.currentQuestion = {
    id: practiceQuestion.id,
    category: practiceQuestion.category,
    topic: practiceQuestion.topic,
    source: practiceQuestion.source,
    question: questionText,
    expectedAnswer: expectation.expectedAnswer,
    keyConcepts: expectation.keyConcepts,
  };

  session.askedQuestionIds = [...new Set([...session.askedQuestionIds, practiceQuestion.id])];

  return buildPracticeResponse(practiceQuestion, questionText);
};

const getConceptCoverage = (message, keyConcepts) => {
  if (!Array.isArray(keyConcepts) || keyConcepts.length === 0) {
    return 0;
  }

  const normalizedAnswer = normalizeText(message);
  const answerKeywords = new Set(extractKeywords(message));
  const matchedConceptCount = keyConcepts.filter((conceptGroup) => {
    return conceptGroup.some((concept) => {
      const normalizedConcept = normalizeText(concept);

      if (normalizedAnswer.includes(normalizedConcept)) {
        return true;
      }

      return normalizedConcept
        .split(" ")
        .every((token) => answerKeywords.has(token));
    });
  }).length;

  return matchedConceptCount / keyConcepts.length;
};

const evaluatePracticeAnswer = (message, session) => {
  const currentQuestion = session.currentQuestion;

  if (!currentQuestion) {
    session.awaitingAnswer = false;

    return {
      matchedQuestion: null,
      answer: "There is no active practice question right now. Ask me to quiz you when you are ready.",
      category: null,
      topic: null,
      source: null,
    };
  }

  const expectedKeywords = extractKeywords(currentQuestion.expectedAnswer);
  const questionKeywords = extractKeywords(currentQuestion.question);
  const answerKeywords = new Set(extractKeywords(message));
  const matchedKeywordCount = expectedKeywords.filter((keyword) =>
    answerKeywords.has(keyword)
  ).length;
  const matchedQuestionKeywordCount = questionKeywords.filter((keyword) =>
    answerKeywords.has(keyword)
  ).length;
  const expectedCoverage = expectedKeywords.length
    ? matchedKeywordCount / expectedKeywords.length
    : 0;
  const questionCoverage = questionKeywords.length
    ? matchedQuestionKeywordCount / questionKeywords.length
    : 0;
  const conceptCoverage = getConceptCoverage(message, currentQuestion.keyConcepts);
  const score = Math.min(
    100,
    Math.round(
      conceptCoverage * 50 +
      expectedCoverage * 25 +
      questionCoverage * 15 +
      (matchedKeywordCount > 0 || conceptCoverage > 0 ? 10 : 0)
    )
  );

  let feedback = "Needs improvement. Try to cover the main idea and one or two supporting points.";

  if (score >= 75) {
    feedback = "Good answer. You covered most of the important points.";
  } else if (score >= 40) {
    feedback = "Partial answer. You touched some key points, but you can make it more complete.";
  }

  session.awaitingAnswer = true;

  return {
    matchedQuestion: currentQuestion.question,
    answer: currentQuestion.expectedAnswer,
    category: currentQuestion.category,
    topic: currentQuestion.topic,
    source: currentQuestion.source,
    practice: {
      question: currentQuestion.question,
      expectedAnswer: currentQuestion.expectedAnswer,
      feedback,
      score,
    },
  };
};

const getChatResponse = async (message, sessionId = "default-session") => {
  const session = getPracticeSession(sessionId);
  const practiceRequested = isPracticeRequest(message);
  const nextQuestionRequested = isNextQuestionRequest(message);
  const exitPracticeRequested = isExitPracticeRequest(message);
  const practiceSwitchRequested = isPracticeSwitchRequest(message, session);

  if (session.active && session.currentQuestionId) {
    if (exitPracticeRequested) {
      clearPracticeSession(session);

      return {
        matchedQuestion: null,
        answer: "Practice mode ended. You can now ask a new interview question.",
        category: null,
        topic: null,
        source: null,
      };
    }

    if (practiceSwitchRequested) {
      return startPracticeRound(message, session, {
        keepCurrentDomain: false,
      });
    }

    if (nextQuestionRequested) {
      const followUpMessage = session.currentDomain
        ? `ask me a ${session.currentDomain} interview question`
        : "ask me a question";

      return startPracticeRound(followUpMessage, session, {
        keepCurrentDomain: true,
      });
    }

    if (practiceRequested) {
      return startPracticeRound(message, session, { keepCurrentDomain: true });
    }

    if (!isClearlyNewNonAnswerIntent(message)) {
      return evaluatePracticeAnswer(message, session);
    }

    clearPracticeSession(session);
  }

  if (practiceRequested) {
    return startPracticeRound(message, session, { keepCurrentDomain: true });
  }

  if (nextQuestionRequested && session.active) {
    const followUpMessage = session.currentDomain
      ? `ask me a ${session.currentDomain} interview question`
      : "ask me a question";

    return startPracticeRound(followUpMessage, session, {
      keepCurrentDomain: true,
    });
  }

  if (session.active && session.awaitingAnswer) {
    return evaluatePracticeAnswer(message, session);
  }

  const learningRequested = isLearningQuery(message);
  let match = learningRequested
    ? findMostRelevantQuestion(message, {
        contentTypes: ["concept_explanation"],
      })
    : findMostRelevantQuestion(message);

  if (!match && learningRequested) {
    const fallbackMessage = getLearningQueryFallback(message);

    if (fallbackMessage) {
      match = findMostRelevantQuestion(fallbackMessage, {
        contentTypes: ["concept_explanation"],
      });
    }
  }

  if (!match) {
    return {
      matchedQuestion: null,
      answer: "No matching interview question was found in the database.",
      category: null,
      topic: null,
      source: null,
    };
  }

  const response = {
    matchedQuestion: match.question,
    answer: match.answer,
    category: match.category,
    topic: match.topic,
    source: match.source,
  };

  if (learningRequested && match.content_type === "concept_explanation") {
    const relatedQuestion = findRelatedInterviewQuestion(match);
    response.learning = buildLearningBlock(match, relatedQuestion);
  }

  return response;
};

module.exports = {
  getChatResponse,
};
