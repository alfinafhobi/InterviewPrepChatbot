function ChatMessage({ message, onPrefillInput }) {
  const isUser = message.role === "user";
  const details = message.details;
  const learning = details?.learning;
  const practice = details?.practice;
  const score = Number(practice?.score);
  const feedbackTone = Number.isFinite(score)
    ? score > 70
      ? "score-good"
      : score >= 40
        ? "score-partial"
        : "score-needs-improvement"
    : "score-neutral";
  const modeLabel = learning
    ? "Learning Mode"
    : practice
      ? "Practice Mode"
      : "Chat Mode";

  return (
    <article className={`message-row ${isUser ? "user-row" : "bot-row"}`}>
      <div
        className={`message-bubble ${isUser ? "user-bubble" : "bot-bubble"} ${
          message.isError ? "error-bubble" : ""
        }`}
      >
        {!isUser ? <span className="mode-badge">{modeLabel}</span> : null}

        <p className={isUser ? "" : "message-answer"}>{message.text}</p>

        {!isUser && details ? (
          <div className="message-details">
            {learning ? (
              <section className="learning-card">
                {learning.conceptTitle ? (
                  <div className="learning-block">
                    <span className="detail-label">Concept Title</span>
                    <p className="learning-title">{learning.conceptTitle}</p>
                  </div>
                ) : null}

                {learning.shortExplanation ? (
                  <div className="learning-block">
                    <span className="detail-label">Short Explanation</span>
                    <p className="learning-text">
                      {learning.shortExplanation}
                    </p>
                  </div>
                ) : null}

                {learning.keyPoints?.length ? (
                  <div className="learning-block">
                    <span className="detail-label">Key Points</span>
                    <ul className="learning-list">
                      {learning.keyPoints.map((point) => (
                        <li key={point}>{point}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {learning.example ? (
                  <div className="learning-example">
                    <span className="detail-label">Example</span>
                    <p className="learning-text">{learning.example}</p>
                  </div>
                ) : null}

                {learning.relatedInterviewQuestion ? (
                  <div className="learning-block">
                    <span className="detail-label">
                      Related Interview Question
                    </span>
                    <button
                      type="button"
                      className="learning-related-button"
                      onClick={() =>
                        onPrefillInput?.(learning.relatedInterviewQuestion)
                      }
                    >
                      {learning.relatedInterviewQuestion}
                    </button>
                  </div>
                ) : null}
              </section>
            ) : null}

            {practice ? (
              <section className="practice-card">
                {practice.question ? (
                  <div className="practice-block">
                    <span className="detail-label">Practice Question</span>
                    <p className="practice-question">{practice.question}</p>
                  </div>
                ) : null}

                {practice.feedback ? (
                  <div className="practice-summary-row">
                    <span className={`feedback-badge ${feedbackTone}`}>
                      {practice.feedback}
                    </span>

                    {typeof practice.score === "number" ? (
                      <span className="practice-score">
                        Score: {practice.score}
                      </span>
                    ) : null}
                  </div>
                ) : null}

                {practice.expectedAnswer ? (
                  <div className="practice-block">
                    <span className="detail-label">Correct Answer Summary</span>
                    <p className="practice-answer-summary">
                      {practice.expectedAnswer}
                    </p>
                  </div>
                ) : null}
              </section>
            ) : null}

            {details.matchedQuestion ? (
              <div className="matched-question">
                <span className="detail-label">Matched Question</span>
                <p className="matched-question-text">
                  {details.matchedQuestion}
                </p>
              </div>
            ) : null}

            <div className="meta-chips">
              {details.topic ? (
                <span className="meta-chip">{details.topic}</span>
              ) : null}

              {details.category ? (
                <span className="meta-chip">{details.category}</span>
              ) : null}

              {details.source ? (
                <span className="meta-chip">{details.source}</span>
              ) : null}
            </div>

            <div className="detail-grid">
              {details.topic ? (
                <div className="detail-item">
                  <span className="detail-label">Topic</span>
                  <span className="detail-value">{details.topic}</span>
                </div>
              ) : null}

              {details.category ? (
                <div className="detail-item">
                  <span className="detail-label">Category</span>
                  <span className="detail-value">{details.category}</span>
                </div>
              ) : null}

              {details.source ? (
                <div className="detail-item">
                  <span className="detail-label">Source</span>
                  <span className="detail-value">{details.source}</span>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}

export default ChatMessage;
