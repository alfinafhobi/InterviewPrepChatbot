export async function sendChatMessage(message) {
  const response = await fetch("/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result?.message ||
        "Sorry, I could not connect to the chatbot right now. Please try again."
    );
  }

  return result?.data || null;
}
