# Interview Preparation Chatbot

A full-stack interview preparation chatbot built with Node.js, Express, SQLite, React, and Vite. The project is centered around a single chatbot interface and supports three core flows: normal interview Q&A, structured concept learning, and chatbot-driven interview practice.

The system uses local retrieval over SQLite data and does not rely on any external AI API.

## Features

- Chatbot Mode
  Ask interview questions across behavioral, programming, OOP, DBMS, OS, CN, and DSA topics.
- Learning Mode
  Concept-style queries return a structured learning block with a concept title, short explanation, key points, example, and a related interview question when available.
- Practice Mode
  The chatbot can ask interview questions, keep lightweight in-memory practice state, evaluate answers, and continue within the same domain.
- Retrieval-first backend
  Answers are selected from local SQLite data using query understanding, source control, and weighted scoring.
- Beginner-friendly structure
  The backend follows a simple route -> controller -> service -> repository flow, and the frontend remains a single-page React app.

## Tech Stack

- Backend: Node.js, Express
- Database: SQLite with `better-sqlite3`
- Frontend: React, Vite
- Development: Nodemon

## Architecture Overview

The project is split into two main parts:

- Backend
  Handles chat requests, retrieval, learning formatting, and practice session logic.
- Frontend
  Provides a single-page chat UI that displays user messages, bot replies, learning cards, and practice feedback.

Request flow:

1. `POST /chat` or `POST /api/chat`
2. Express route
3. Controller validation
4. Chat service
5. Repository retrieval from SQLite
6. Structured response back to the UI

## Folder Structure

```text
InterviewPrepChatbot/
|-- client/
|   |-- src/
|   |   |-- api/
|   |   |   `-- chatApi.js
|   |   |-- components/
|   |   |   `-- ChatMessage.jsx
|   |   |-- App.jsx
|   |   |-- main.jsx
|   |   `-- styles.css
|   |-- package.json
|   `-- vite.config.js
|-- data/
|   `-- interview_prep_chatbot.db
|-- src/
|   |-- config/
|   |   `-- db.js
|   |-- controllers/
|   |   `-- chatController.js
|   |-- data/
|   |   |-- datasets/
|   |   |   |-- Mock_interview_questions.json
|   |   |   `-- Software Questions.csv
|   |   |-- utils/
|   |   |   `-- interviewDatasetImporter.js
|   |   |-- interviewKnowledge.js
|   |   |-- seedInterviewData.js
|   |   |-- seedMockInterviewQuestions.js
|   |   |-- seedSyntheticInterviewQuestions.js
|   |   |-- seedTechnicalInterviewQuestions.js
|   |   `-- syntheticInterviewQuestions.js
|   |-- models/
|   |   `-- InterviewQuestion.js
|   |-- repositories/
|   |   `-- interviewQuestionRepository.js
|   |-- routes/
|   |   `-- chatRoutes.js
|   |-- services/
|   |   `-- chatService.js
|   |-- app.js
|   `-- server.js
|-- .env
|-- .env.example
|-- package.json
`-- README.md
```

## How Retrieval Works

The chatbot uses a retrieval-based approach over the `interview_questions` table in SQLite.

At a high level:

1. The user query is normalized.
2. Keywords are extracted from the query.
3. The backend detects likely intent such as:
   - definition
   - explanation
   - comparison
   - practice
4. The backend detects likely domain such as:
   - behavioral
   - programming
   - oop
   - dbms
   - os
   - cn
   - dsa
5. SQLite fetches candidate rows using broad matching across:
   - question
   - answer
   - topic
   - tags
   - keywords
   - domain
   - subtopic
6. Candidates are scored in JavaScript.
   Higher weight is given to question matches, keyword matches, domain matches, and topic matches.
7. The best result is returned only if it passes a minimum relevance threshold.

### Source Rules

Normal Chat Mode and Learning Mode use:

- `synthetic_dataset`
- `starter_data`
- `technical_dataset`

Normal retrieval does **not** use `mock_dataset`.

Source preference for normal retrieval:

1. `synthetic_dataset`
2. `starter_data`
3. `technical_dataset` only if the match is strong enough

Practice Mode is stricter:

- it uses `synthetic_dataset` only
- it stays within the active practice domain unless the user explicitly switches topics

## Data Sources

The SQLite database can contain multiple sources:

- `synthetic_dataset`
- `starter_data`
- `technical_dataset`
- `mock_dataset`

Current usage:

- Chat/Learning: `synthetic_dataset`, `starter_data`, `technical_dataset`
- Practice: `synthetic_dataset` only
- `mock_dataset` remains in the database but is excluded from normal chat/learning retrieval

## How To Run

### 1. Install dependencies

From the project root:

```bash
npm install
```

Install frontend dependencies:

```bash
cd client
npm install
cd ..
```

### 2. Configure environment

Create a `.env` file in the project root:

```env
PORT=5000
SQLITE_DB_PATH=data/interview_prep_chatbot.db
```

### 3. Seed the database

Seed the curated synthetic data:

```bash
npm run seed:synthetic
```

Optional additional datasets:

```bash
npm run seed
npm run seed:technical
npm run seed:mock
```

### 4. Start the backend

```bash
npm run dev
```

Backend runs on:

```text
http://localhost:5000
```

### 5. Start the frontend

In a second terminal:

```bash
npm run client:dev
```

Frontend runs on:

```text
http://localhost:5173
```

## API

Health check:

```text
GET /api/health
```

Chat endpoints:

```text
POST /chat
POST /api/chat
```

Request body:

```json
{
  "message": "What is polymorphism in OOP?"
}
```

## Sample Queries

Chatbot Mode:

- `What is normalization in DBMS?`
- `Difference between process and thread`
- `What is insertion sort?`
- `What is merge sort?`
- `Hashmap`
- `Explain polymorphism`

Learning Mode:

- `What is dynamic programming?`
- `What is hashing in DSA?`
- `Explain deadlock`
- `What is multithreading?`

Practice Mode:

- `Ask me questions on OOP`
- `Practice DBMS`
- `Ask me interview questions about behavioral rounds`
- `Next question`
- `Stop practice`

## Future Improvements

- Add bookmarks for useful answers
- Add lightweight progress tracking
- Improve learning examples for more CS topics
- Add more curated synthetic entries for advanced interview questions
- Add unit tests for retrieval, learning formatting, and practice session handling
- Add exportable practice summaries

## Notes

- The chatbot remains the core interface of the system.
- The project is intentionally simple, modular, and beginner-friendly.
- SQLite is the only database used.
- No external AI API is used for answering questions.
