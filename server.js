// server.js
const express = require('express');
const tesseract = require("node-tesseract-ocr");
const multer = require('multer');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const path = require('path');
const upload = multer({ storage: multer.memoryStorage() });
const geminiRoutes = require('./routes/geminiRoutes');
const mongoose = require('mongoose');
const notesRoutes = require('./routes/notesRoutes');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));


const uploadRoutes = require('./routes/uploadRoutes');
app.use(express.static(path.join(__dirname, 'public')));
app.use(geminiRoutes);
app.set('view engine', "ejs");
app.use(express.static(path.join(__dirname + '/uploads')));
app.use(bodyParser.json());
app.use('/notes', notesRoutes);
app.use(bodyParser.urlencoded({ extended: true }));

const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Memory-based upload to Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'GeminiLens',
    allowed_formats: ['jpg', 'png', 'jpeg'],
  },
});

app.get('/', (req, res) => {
  res.render('index', {data:''});
});

// app.post('/extracttextfromimage', upload.single('file'), async (req, res) => {
//   try {
//     const imageUrl = req.file.path || req.file.url;
//     console.log("Uploaded to Cloudinary:", imageUrl);

//     process.env.PATH += ";C:\\Program Files\\Tesseract-OCR";

//     const config = {
//       lang: "eng",
//       oem: 1,
//       psm: 3,
//     };

//     tesseract
//       .recognize(req.file.buffer, config)
//       .then((text) => {
//         console.log("OCR Result:", text);
//         res.render( { data: text, imageUrl: imageUrl });
//       })
//       .catch((error) => {
//         console.log("OCR Error:", error.message);
//         res.render( { data: 'OCR error: ' + error.message, imageUrl: imageUrl });
//       });

//   } catch (error) {
//     console.error("Upload Error:", error.message);
//     res.render( { data: 'Upload failed: ' + error.message, imageUrl: null });
//   }
// });

const streamifier = require('streamifier');
const Chat= require('./models/chat');

app.post('/extracttextfromimage', upload.single('file'), async (req, res) => {
  try {
    const sessionId = req.query.sessionId; // ✅ Get sessionId from query

    if (!sessionId) {
      return res.status(400).send("❌ sessionId is missing");
    }

    process.env.PATH += ";C:\\Program Files\\Tesseract-OCR";

    const config = {
      lang: "eng",
      oem: 1,
      psm: 3,
    };

    // Upload to Cloudinary using stream
    const streamUpload = (buffer) => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'GeminiLens' },
          (error, result) => {
            if (result) resolve(result);
            else reject(error);
          }
        );
        streamifier.createReadStream(buffer).pipe(stream);
      });
    };

    const result = await streamUpload(req.file.buffer);
    const imageUrl = result.secure_url;

    // OCR Processing
    const text = await tesseract.recognize(req.file.buffer, config);
    console.log("OCR Result:", text);

    // Save to DB
    await Chat.findOneAndUpdate(
      { sessionId },
      { $set: { ocrText: text } },
      { new: true, upsert: true }
    );

    // Render index page with OCR result
    res.render('index', {
      data: text,
      imageUrl: imageUrl,
      sessionId: sessionId
    });

  } catch (error) {
    console.error("OCR or Upload Error:", error.message);
    res.render('index', {
      data: 'Error: ' + error.message,
      imageUrl: null,
      sessionId: null
    });
  }
});




app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

