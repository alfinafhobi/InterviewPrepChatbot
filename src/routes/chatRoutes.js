const express = require("express");
const { chatWithBot } = require("../controllers/chatController");

const router = express.Router();

router.post("/", chatWithBot);

module.exports = router;
