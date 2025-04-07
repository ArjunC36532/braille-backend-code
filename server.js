// Backend (Express.js) - server.js
import express from "express";
import { OpenAI } from "openai";
import dotenv from "dotenv";
import multer from "multer";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 8080;

// ✅ Enable CORS only for your frontend
app.use(cors({
  origin: ['https://braille-translator-4v85.vercel.app', 'http://localhost:3000']
}));


// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Setup file upload
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Endpoint
app.post("/translate-voice", upload.single("audio"), async (req, res) => {
  if (!req.file) {
    return res.status(400).send("No audio file uploaded.");
  }

  try {
    const tempFilePath = path.join(__dirname, "temp_audio.webm");
    fs.writeFileSync(tempFilePath, req.file.buffer);

    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempFilePath),
      model: "whisper-1",
    });

    const transcript = transcription.text || "No transcription available.";
    const brailleTranslation = await translateTextToBraille(transcript);

    fs.unlinkSync(tempFilePath);

    res.json({ braille: brailleTranslation });
  } catch (error) {
    console.error("Error processing audio:", error.message);
    res.status(500).send("Error processing audio.");
  }
});

const translateTextToBraille = async (text) => {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: "You are a Braille translator. Only respond with the translated text." },
        { role: "user", content: `Translate the following text into Braille: ${text}` },
      ],
    });

    return response.choices[0]?.message?.content || "No translation available.";
  } catch (error) {
    console.error("Error translating text to Braille:", error.message);
    throw new Error("Error translating text to Braille.");
  }
};

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
