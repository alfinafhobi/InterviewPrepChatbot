const express = require("express");
const chatRoutes = require("./routes/chatRoutes");

const app = express();

app.use(express.json());

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Interview chatbot backend is running.",
  });
});

app.use("/chat", chatRoutes);
app.use("/api/chat", chatRoutes);

module.exports = app;
