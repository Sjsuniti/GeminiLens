const express = require('express');
const axios = require('axios');
const router = express.Router();
const Chat = require('../models/chat');
require('dotenv').config();

router.use(express.json());

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

async function generateGeminiResponse(prompt, context = "") {
  const fullPrompt = context ? `${context}\n\nUser: ${prompt}` : prompt;

  const body = {
    contents: [{ parts: [{ text: fullPrompt }] }]
  };

  const response = await axios.post(GEMINI_API_URL, body, {
    headers: {
      'Content-Type': 'application/json',
      'X-goog-api-key': GEMINI_API_KEY
    }
  });

  return response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response";
}

// Save message to DB
// async function saveMessage(sessionId, sender, text) {
//   let chat = await Chat.findOne({ sessionId });
//   if (!chat) {
//      const defaultTitle = message.split(' ').slice(0, 3).join(' ') + '...';
//     chat = new Chat({ sessionId, messages: [], title: defaultTitle });
//   }
//   chat.messages.push({ sender, text });
//   await chat.save();
// }

async function saveMessage(sessionId, sender, text) {
  let chat = await Chat.findOne({ sessionId });

  if (!chat) {
    const defaultTitle = text.split(' ').slice(0, 3).join(' ') + '...';
    chat = new Chat({ sessionId, messages: [], title: defaultTitle });
  }

  chat.messages.push({ sender, text });
  await chat.save();
}



router.post('/chat', async (req, res) => {
  const { message, context, sessionId } = req.body;
  if (!message || !sessionId) return res.status(400).json({ reply: "Missing message or sessionId" });

  try {
    const reply = await generateGeminiResponse(message, context);
    await saveMessage(sessionId, 'user', message);
    await saveMessage(sessionId, 'ai', reply);

    res.json({ reply });
  } catch (err) {
    console.error("Gemini error:", err.message);
    res.status(500).json({ reply: "Gemini error: " + err.message });
  }
});

router.get('/history/:sessionId', async (req, res) => {
  try {
    const chat = await Chat.findOne({ sessionId: req.params.sessionId });
    res.json({ history: chat?.messages || [],
            summary: chat?.summary || '',
      ocrText: chat?.ocrText || ''
     });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch history" });
  }
});
router.get('/sessions', async (req, res) => {
  try {
    const sessions = await Chat.find({}, 'sessionId title createdAt')
      .sort({ createdAt: -1 })
      .limit(10);
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch sessions" });
  }
});   
router.post('/summarize', async (req, res) => {
  const { sessionId } = req.body;

  if (!sessionId) {
    return res.status(400).json({ summary: "Session ID is required" });
  }

  try {
    const chat = await Chat.findOneAndUpdate(
  { sessionId }
);

    if (!chat || chat.messages.length === 0) {
      return res.status(404).json({ summary: "No messages to summarize" });
    }

    const fullChat = chat.messages.map(msg => {
      return `${msg.sender === 'user' ? 'User' : 'AI'}: ${msg.text}`;
    }).join('\n');

    const summaryPrompt = `Summarize the following conversation between user and AI:\n\n${fullChat}`;

    const summary = await generateGeminiResponse(summaryPrompt);

        await Chat.findOneAndUpdate(
      { sessionId },
      { $set: { summary } },
      { new: true }
    );

    res.json({ summary });

  } catch (err) {
    console.error("Summary generation error:", err.message);
    res.status(500).json({ summary: "Failed to generate summary" });
  }
});




module.exports = router;


//geminiRoutes