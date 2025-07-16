const express = require("express");
const Note = require("../models/notes");
const router = express.Router();

// Get all notes
router.get("/", async (req, res) => {
    
  try {
      const { sessionId } = req.query;

  if (!sessionId) {
    return res.status(400).json({ error: "Missing sessionId" });
  }
    const notes = await Note.find().sort({ createdAt: -1 });
    res.status(200).json(notes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new note

router.post('/', async (req, res) => {
  try {
    const { sessionId, title, content } = req.body;

    if (!sessionId || !title || !content) {
      return res.status(400).json({ error: 'sessionId, title and content are required' });
    }

    const note = new Note({ sessionId, title, content });
    await note.save();
    res.status(201).json(note);
  } catch (err) {
    console.error('❌ Error saving note:', err.message);
    res.status(500).json({ error: 'Failed to save note' });
  }
});


// Delete a note
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Note.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Note not found" });
    }
    res.json({ message: "Note deleted", note: deleted });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});



router.post("/summarize", async (req, res) => {
  try {
    const { sessionId } = req.body;
    const messages = await ChatMessage.find({ sessionId });

    const prompt = `Summarize this conversation and provide a 3-word title:\n\n${messages.map(m => `${m.sender}: ${m.text}`).join('\n')}`;
    const reply = await generateGeminiResponse(prompt);

    const lines = reply.split('\n').filter(Boolean);
    const summaryText = lines[0];
    const title = lines.find(line => line.toLowerCase().startsWith("title:"))?.replace(/title:\s*/i, '') || "Summary";

    const note = new Note({ title, content: summaryText });
    await note.save();
    res.json(note);
  } catch (err) {
    res.status(500).json({ message: "Failed to summarize", error: err.message });
  }
});



module.exports = router;

