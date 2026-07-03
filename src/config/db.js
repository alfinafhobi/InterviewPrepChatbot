const fs = require("fs");
const path = require("path");

const Database = require("better-sqlite3");
const {
  createInterviewQuestionsTable,
  EXTRA_INDEXES,
  REQUIRED_COLUMNS,
  TABLE_NAME,
} = require("../models/InterviewQuestion");

const DEFAULT_DB_PATH = path.join(process.cwd(), "data", "interview_prep_chatbot.db");

let databaseInstance = null;

const resolveDatabasePath = () => {
  const configuredPath = process.env.SQLITE_DB_PATH;

  if (!configuredPath) {
    return DEFAULT_DB_PATH;
  }

  return path.isAbsolute(configuredPath)
    ? configuredPath
    : path.join(process.cwd(), configuredPath);
};

const connectDB = async () => {
  if (databaseInstance) {
    return databaseInstance;
  }

  try {
    const databasePath = resolveDatabasePath();
    fs.mkdirSync(path.dirname(databasePath), { recursive: true });

    databaseInstance = new Database(databasePath);
    databaseInstance.pragma("journal_mode = WAL");
    createInterviewQuestionsTable(databaseInstance);
    migrateInterviewQuestionsTable(databaseInstance);

    console.log(`SQLite connected: ${databasePath}`);

    return databaseInstance;
  } catch (error) {
    console.error("SQLite connection error:", error.message);
    throw error;
  }
};

const migrateInterviewQuestionsTable = (database) => {
  const existingColumns = database
    .prepare(`PRAGMA table_info('${TABLE_NAME}')`)
    .all()
    .map((column) => column.name);

  for (const [columnName, columnDefinition] of REQUIRED_COLUMNS) {
    if (!existingColumns.includes(columnName)) {
      database.exec(
        `ALTER TABLE ${TABLE_NAME} ADD COLUMN ${columnName} ${columnDefinition}`
      );
    }
  }

  for (const [, createIndexSql] of EXTRA_INDEXES) {
    database.exec(createIndexSql);
  }
};

const getDatabase = () => {
  if (!databaseInstance) {
    throw new Error("Database is not connected. Call connectDB() first.");
  }

  return databaseInstance;
};

const closeDatabase = () => {
  if (databaseInstance) {
    databaseInstance.close();
    databaseInstance = null;
  }
};

module.exports = connectDB;
module.exports.getDatabase = getDatabase;
module.exports.closeDatabase = closeDatabase;
module.exports.resolveDatabasePath = resolveDatabasePath;
