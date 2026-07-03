const { getChatResponse } = require("../services/chatService");

const getSessionId = (req) => {
  const forwardedFor = req.headers["x-forwarded-for"];
  const clientIp = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : String(forwardedFor || req.ip || req.socket?.remoteAddress || "local");
  const userAgent = String(req.headers["user-agent"] || "unknown-client");

  return `${clientIp}:${userAgent}`;
};

const chatWithBot = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid message.",
      });
    }

    const response = await getChatResponse(message.trim(), getSessionId(req));

    return res.status(200).json({
      success: true,
      data: response,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong while processing the chat request.",
    });
  }
};

module.exports = {
  chatWithBot,
};
