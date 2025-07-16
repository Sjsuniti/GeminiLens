const express = require('express');
const router = express.Router();
const Chat = require('../model/chat'); // Assuming chat history stored in DB
const { generateGeminiSummary } = require('../utils/gemini');

router.post('/', async (req, res) => {
  const { sessionId } = req.body;

  try {
    const chatSession = await Chat.findOne({ sessionId });
    if (!chatSession || !chatSession.history || chatSession.history.length === 0) {
      return res.status(404).json({ summary: 'No messages found in session' });
    }

    const textToSummarize = chatSession.history.map(entry => `${entry.sender === 'user' ? 'User' : 'Gemini'}: ${entry.text}`).join('\n');

    const summary = await generateGeminiSummary(textToSummarize); // using Gemini or other LLM
      chatSession.summary = summary;
    await chatSession.save();
    res.json({ summary });
  } catch (err) {
    console.error('Summary Error:', err);
    res.status(500).json({ summary: 'Failed to generate summary.' });
  }
});

module.exports = router;
