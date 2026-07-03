import { useEffect, useRef, useState } from "react";
import { sendChatMessage } from "./api/chatApi";
import ChatMessage from "./components/ChatMessage";

const initialMessages = [
  {
    id: 1,
    role: "bot",
    text: "Ask me interview questions about behavioral rounds, programming languages, OOP, DBMS, OS, CN, or DSA.",
  },
];

function App() {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [practiceState, setPracticeState] = useState({
    isActive: false,
    awaitingAnswer: false,
  });
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const addMessage = (message) => {
    setMessages((currentMessages) => [...currentMessages, message]);
  };

  const updatePracticeState = (data) => {
    if (!data?.practice) {
      return;
    }

    const feedback = String(data.practice.feedback || "").trim();

    setPracticeState({
      isActive: true,
      awaitingAnswer: !feedback,
    });
  };

  const submitMessage = async (messageText) => {
    const trimmedMessage = messageText.trim();

    if (!trimmedMessage || isLoading) {
      return;
    }

    addMessage({
      id: Date.now(),
      role: "user",
      text: trimmedMessage,
    });

    setInput("");
    setIsLoading(true);

    try {
      const data = await sendChatMessage(trimmedMessage);

      addMessage({
        id: Date.now() + 1,
        role: "bot",
        text:
          data?.answer ||
          "I could not find a helpful response for that question yet.",
        details: data,
      });
      updatePracticeState(data);
    } catch (error) {
      addMessage({
        id: Date.now() + 1,
        role: "bot",
        text:
          error.message ||
          "Sorry, something went wrong while talking to the chatbot.",
        isError: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await submitMessage(input);
  };

  const handleNextQuestion = async () => {
    await submitMessage("next question");
  };

  const handlePrefillInput = (messageText) => {
    setInput(messageText);
    inputRef.current?.focus();
  };

  return (
    <main className="page-shell">
      <section className="chat-panel">
        <header className="chat-header">
          <div className="header-block">
            <h1>Interview Preparation Chatbot</h1>
          </div>
          <p className="header-copy">
            Ask behavioral, programming, and CS interview questions.
          </p>

          {practiceState.isActive ? (
            <div className="practice-indicator">
              <span className="practice-indicator-dot" />
              <span className="practice-indicator-text">
                Practice Mode Active
                {practiceState.awaitingAnswer
                  ? " - answer the current question"
                  : " - ready for the next question"}
              </span>
            </div>
          ) : null}
        </header>

        <div className="chat-messages">
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              onPrefillInput={handlePrefillInput}
            />
          ))}

          {isLoading ? (
            <ChatMessage
              message={{
                id: "thinking",
                role: "bot",
                text: "Thinking...",
              }}
            />
          ) : null}

          <div ref={messagesEndRef} className="messages-end" />
        </div>

        {practiceState.isActive ? (
          <div className="practice-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={handleNextQuestion}
              disabled={isLoading}
            >
              Next Question
            </button>
          </div>
        ) : null}

        <form className="chat-form" onSubmit={handleSubmit}>
          <label className="sr-only" htmlFor="chat-input">
            Ask your interview question
          </label>
          <input
            id="chat-input"
            type="text"
            placeholder="Ask an interview question..."
            value={input}
            ref={inputRef}
            onChange={(event) => setInput(event.target.value)}
            className="chat-input"
          />
          <button type="submit" className="send-button" disabled={isLoading}>
            Send
          </button>
        </form>
      </section>
    </main>
  );
}

export default App;
