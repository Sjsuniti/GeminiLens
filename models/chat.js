// const mongoose = require("mongoose");

// const messageSchema = new mongoose.Schema({
//   sender: String,
//   text: String,
//   timestamp: { type: Date, default: Date.now }
// });

// const chatSchema = new mongoose.Schema({
//   sessionId: { type: String, required: true, unique: true },
//   title: String,
//   messages: [messageSchema],
//   ocrText: String,           // Store extracted OCR
//   summary: String,           // Store summary
//   createdAt: { type: Date, default: Date.now }
// });

// module.exports = mongoose.model("Chat", chatSchema);

const mongoose = require("mongoose");

// Message schema for individual chat messages
const messageSchema = new mongoose.Schema({
  sender: String,
  text: String,
  timestamp: { type: Date, default: Date.now }
});

// Main Chat schema
const chatSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true }, // unique session ID
  title: String,                                              // optional chat title
  messages: [messageSchema],                                  // array of messages
  ocrText: String,                                            // OCR extracted text
  summary: String,                                            // AI-generated summary
  createdAt: { type: Date, default: Date.now }                // auto timestamp
});

module.exports = mongoose.model("Chat", chatSchema);
