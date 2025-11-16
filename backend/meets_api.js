/**
 * ContextAI - Google Meets Backend
 * Team Gear5
 */

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { GoogleGenerativeAI } = require("@google/generative-ai");

require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));

// RAG Server Integration
const INGEST_SERVER_URL = "http://localhost:3000/api/v1/ingest";
const MEETS_MAPPING_FILE = path.join(__dirname, "meets_mapping.json");

// Load Meets-to-Project mapping
let meetsMapping = {};
if (fs.existsSync(MEETS_MAPPING_FILE)) {
  try {
    meetsMapping = JSON.parse(fs.readFileSync(MEETS_MAPPING_FILE, "utf8"));
    console.log(`📋 Loaded ${Object.keys(meetsMapping).length} Meets mappings`);
  } catch (err) {
    console.warn("⚠️ Failed to load meets_mapping.json:", err.message);
  }
} else {
  console.log("📋 No meets_mapping.json found - RAG features disabled");
}

// Storage directories
const TRANSCRIPTS_DIR = path.join(__dirname, "contextai_meet_transcripts");
const SUMMARIES_DIR = path.join(__dirname, "contextai_meet_summaries");

if (!fs.existsSync(TRANSCRIPTS_DIR)) {
  fs.mkdirSync(TRANSCRIPTS_DIR, { recursive: true });
}
if (!fs.existsSync(SUMMARIES_DIR)) {
  fs.mkdirSync(SUMMARIES_DIR, { recursive: true });
}

// Initialize Gemini AI with multi-key support
const geminiAPIKeys = [];
const geminiModels = [];
let currentModelIndex = 0;

if (process.env.GEMINI_API_KEY) geminiAPIKeys.push(process.env.GEMINI_API_KEY);
if (process.env.GEMINI_API_KEY_2)
  geminiAPIKeys.push(process.env.GEMINI_API_KEY_2);
if (process.env.GEMINI_API_KEY_3)
  geminiAPIKeys.push(process.env.GEMINI_API_KEY_3);

if (geminiAPIKeys.length === 0) {
  console.warn("⚠️ No GEMINI_API_KEY found - AI analysis disabled");
} else {
  geminiAPIKeys.forEach((key, index) => {
    try {
      const genAI = new GoogleGenerativeAI(key);
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash-lite",
      });
      geminiModels.push(model);
      console.log(`🤖 Gemini AI #${index + 1} initialized`);
    } catch (err) {
      console.error(
        `❌ Failed to initialize API key #${index + 1}:`,
        err.message
      );
    }
  });
  console.log(
    `✅ Total active API keys: ${geminiModels.length}/${geminiAPIKeys.length}`
  );
}

function getGeminiModel() {
  if (geminiModels.length === 0) return null;
  currentModelIndex = (currentModelIndex + 1) % geminiModels.length;
  console.log(
    `   🔄 Using Gemini API #${currentModelIndex + 1} of ${geminiModels.length}`
  );
  return geminiModels[currentModelIndex];
}

// Retry helper for API calls
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 2000) {
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const isRetryable =
        error.message.includes("503") ||
        error.message.includes("500") ||
        error.message.includes("overloaded") ||
        error.message.includes("429") ||
        error.message.includes("RESOURCE_EXHAUSTED");

      if (attempt === maxRetries || !isRetryable) {
        throw lastError;
      }

      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.log(
        `⚠️ API error (attempt ${attempt}/${maxRetries}), retrying in ${
          delay / 1000
        }s...`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

// Metadata storage
const METADATA_FILE = path.join(__dirname, "meets_metadata.json");

function loadMetadata() {
  if (fs.existsSync(METADATA_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(METADATA_FILE, "utf8"));
    } catch (err) {
      return {};
    }
  }
  return {};
}

function saveMetadata(metadata) {
  fs.writeFileSync(METADATA_FILE, JSON.stringify(metadata, null, 2));
}

// API Endpoints

// Get all transcripts
app.get("/api/transcripts", (req, res) => {
  try {
    const metadata = loadMetadata();
    const transcripts = Object.values(metadata).sort(
      (a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)
    );
    res.json({ transcripts });
  } catch (err) {
    console.error("Error loading transcripts:", err);
    res.status(500).json({ error: "Failed to load transcripts" });
  }
});

// Upload transcript
app.post("/api/upload", async (req, res) => {
  try {
    const { name, transcript } = req.body;

    if (!transcript || !name) {
      return res
        .status(400)
        .json({ error: "Transcript text and name required" });
    }

    const transcriptId = `meet_${Date.now()}`;
    const metadata = loadMetadata();

    // Save transcript as text file
    const filename = `transcript_${Date.now()}.txt`;
    const filePath = path.join(TRANSCRIPTS_DIR, filename);
    fs.writeFileSync(filePath, transcript);

    metadata[transcriptId] = {
      id: transcriptId,
      name: name,
      filename: filename,
      uploadedAt: new Date().toISOString(),
      fileSize: Buffer.byteLength(transcript, "utf8"),
      type: "uploaded",
    };

    saveMetadata(metadata);

    // Auto-ingest to RAG if mapped
    const mapping = meetsMapping[transcriptId];
    if (mapping) {
      console.log(
        `[MEETS-INGEST] Transcript ${transcriptId} IS mapped. Sending to RAG server...`
      );

      const payload = {
        project_id: mapping.project_id,
        team_id: mapping.team_id,
        source: "meets",
        text: transcript,
      };

      axios
        .post(INGEST_SERVER_URL, payload)
        .then(() => {
          console.log(
            `[MEETS-INGEST] SUCCESS: Sent transcript ${name} to RAG server.`
          );
        })
        .catch((err) => {
          console.error(
            "[MEETS-INGEST] FAILED to send to RAG server:",
            err.message
          );
        });
    }

    console.log(`✅ Uploaded transcript: ${name}`);
    res.json({ success: true, transcriptId });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Upload failed", message: err.message });
  }
});

// Join Meet (placeholder - requires Google Meet bot integration)
app.post("/api/join", async (req, res) => {
  try {
    const { meetLink, driveLink, name } = req.body;

    if (!meetLink || !driveLink || !name) {
      return res
        .status(400)
        .json({ error: "meetLink, driveLink, and name required" });
    }

    const transcriptId = `meet_join_${Date.now()}`;
    const metadata = loadMetadata();

    metadata[transcriptId] = {
      id: transcriptId,
      name: name,
      meetLink: meetLink,
      driveLink: driveLink,
      uploadedAt: new Date().toISOString(),
      type: "joined",
      status: "monitoring",
    };

    saveMetadata(metadata);

    console.log(`🔗 Joined meet: ${name}`);
    console.log(`   Meet Link: ${meetLink}`);
    console.log(`   Drive Link: ${driveLink}`);

    res.json({
      success: true,
      transcriptId,
      message: "Meet joined - monitoring for transcript in Drive folder",
    });
  } catch (err) {
    console.error("Join error:", err);
    res.status(500).json({ error: "Join failed", message: err.message });
  }
});

// Analyze transcript
app.post("/api/analyze", async (req, res) => {
  try {
    const { transcriptId, analysisDepth = "moderate" } = req.body;

    if (!transcriptId) {
      return res.status(400).json({ error: "transcriptId required" });
    }

    const metadata = loadMetadata();
    const transcript = metadata[transcriptId];

    if (!transcript) {
      return res.status(404).json({ error: "Transcript not found" });
    }

    // Read transcript content
    const transcriptPath = path.join(TRANSCRIPTS_DIR, transcript.filename);
    if (!fs.existsSync(transcriptPath)) {
      return res.status(404).json({ error: "Transcript file not found" });
    }

    const content = fs.readFileSync(transcriptPath, "utf8");

    const model = getGeminiModel();
    if (!model) {
      return res.status(503).json({ error: "AI not configured" });
    }

    const isDeepAnalysis = analysisDepth === "deep";

    let prompt;
    if (isDeepAnalysis) {
      prompt = `Analyze this Google Meet transcript in DEEP RESEARCH mode:

Meeting: ${transcript.name}
Date: ${new Date(transcript.uploadedAt).toLocaleDateString()}

Transcript:
${content}

Provide an IN-DEPTH analysis with:
**📊 Meeting Overview**
* Meeting purpose and objectives
* Key participants and their roles
* Meeting duration and structure

**📋 Discussion Topics**
* Main topics covered with timestamps
* Technical discussions and decisions
* Problem-solving approaches

**✅ Decisions & Action Items**
* Decisions made with context and reasoning
* Action items with owners and deadlines
* Dependencies and blockers identified

**💡 Key Insights**
* Important quotes and moments
* Agreements reached
* Follow-up requirements

**🔍 Meeting Effectiveness**
* Participation patterns
* Time management
* Outcomes achieved

Keep well-structured with clear bullet points.`;
    } else {
      prompt = `Analyze this Google Meet transcript and provide a concise summary:

Meeting: ${transcript.name}
Date: ${new Date(transcript.uploadedAt).toLocaleDateString()}

Transcript:
${content}

Provide a summary with:
**📊 Overview**
* Meeting purpose
* Key participants

**📋 Main Topics**
* Topics discussed
* Important points

**✅ Action Items**
* Decisions made
* Next steps with owners

**💡 Key Takeaways**
* Important insights
* Follow-ups needed

Keep it concise and well-structured.`;
    }

    console.log(
      `🤖 Analyzing transcript: ${transcript.name} (${analysisDepth} mode)...`
    );

    const result = await retryWithBackoff(
      async () => await model.generateContent(prompt),
      3,
      2000
    );

    const response = await result.response;
    const summary = response.text();

    // Save summary
    const summaryId = `summary_${transcriptId}_${Date.now()}`;
    const summaryData = {
      id: summaryId,
      transcriptId,
      transcriptName: transcript.name,
      summary,
      analysisDepth,
      analyzedAt: new Date().toISOString(),
    };

    fs.writeFileSync(
      path.join(SUMMARIES_DIR, `${summaryId}.json`),
      JSON.stringify(summaryData, null, 2)
    );

    // Save to dashboard summaries
    const dashboardSummary = {
      chatId: summaryId,
      chatName: `📄 ${transcript.name}`,
      summary: summary,
      stats: {
        date: new Date(transcript.uploadedAt).toISOString(),
        type: transcript.type,
      },
      source: "meets",
      timestamp: new Date().toISOString(),
    };

    const summariesPath = path.join(__dirname, "summaries.json");
    let allSummaries = [];
    try {
      if (fs.existsSync(summariesPath)) {
        const data = fs.readFileSync(summariesPath, "utf8");
        allSummaries = JSON.parse(data);
      }
    } catch (err) {
      allSummaries = [];
    }

    allSummaries = allSummaries.filter((s) => s.chatId !== summaryId);
    allSummaries.unshift(dashboardSummary);
    fs.writeFileSync(summariesPath, JSON.stringify(allSummaries, null, 2));

    console.log(`✅ Analysis complete for: ${transcript.name}`);
    res.json({ success: true, summary, summaryId });
  } catch (err) {
    console.error("Analysis error:", err);
    res.status(500).json({ error: "Analysis failed", message: err.message });
  }
});

// Q&A on transcript - RAG POWERED
app.post("/api/qa", async (req, res) => {
  try {
    const { transcriptId, question } = req.body;

    if (!transcriptId || !question) {
      return res
        .status(400)
        .json({ error: "transcriptId and question required" });
    }

    console.log(`[MEETS-RAG] New Q&A Request`);
    console.log(`[MEETS-RAG] Question: ${question}`);

    // Check if we have RAG mapping for this transcript
    const mapping = meetsMapping[transcriptId];

    if (mapping) {
      // Use RAG server for mapped transcripts
      console.log(
        `[MEETS-RAG] Transcript ${transcriptId} is mapped. Using RAG server...`
      );

      const ragPayload = {
        project_id: mapping.project_id,
        team_id: mapping.team_id,
        question: question,
      };

      try {
        const ragResponse = await axios.post(
          "http://localhost:3000/api/v1/ask",
          ragPayload
        );

        console.log("[MEETS-RAG] Answer generated from RAG server");
        return res.json({
          success: true,
          question: question,
          answer: ragResponse.data.answer,
        });
      } catch (err) {
        console.error("❌ MEETS-RAG Error:", err.message);
        // Fall back to Gemini if RAG fails
      }
    }

    // Fallback: Use Gemini with summary (for unmapped transcripts or if RAG fails)
    const summaryFiles = fs
      .readdirSync(SUMMARIES_DIR)
      .filter((f) => f.startsWith(`summary_${transcriptId}_`));

    if (summaryFiles.length === 0) {
      return res
        .status(404)
        .json({ error: "No summary found - analyze transcript first" });
    }

    const latestSummary = summaryFiles.sort().reverse()[0];
    const summaryData = JSON.parse(
      fs.readFileSync(path.join(SUMMARIES_DIR, latestSummary), "utf8")
    );

    const model = getGeminiModel();
    if (!model) {
      return res.status(503).json({ error: "AI not configured" });
    }

    console.log("[MEETS-RAG] Using Gemini fallback with summary...");
    const prompt = `Meeting: ${summaryData.transcriptName}

Summary:
${summaryData.summary}

Question: ${question}

Provide a concise, direct answer based on the summary. If the information isn't in the summary, say so.`;

    const result = await retryWithBackoff(
      async () => await model.generateContent(prompt),
      3,
      2000
    );

    const response = await result.response;
    const answer = response.text();

    res.json({ success: true, question, answer });
  } catch (err) {
    console.error("Q&A error:", err);
    res.status(500).json({ error: "Q&A failed", message: err.message });
  }
});

// Get all summaries
app.get("/api/summaries", (req, res) => {
  try {
    const files = fs
      .readdirSync(SUMMARIES_DIR)
      .filter((f) => f.endsWith(".json"));
    const summaries = files
      .map((file) => {
        const data = JSON.parse(
          fs.readFileSync(path.join(SUMMARIES_DIR, file), "utf8")
        );
        return {
          id: data.id,
          transcriptId: data.transcriptId,
          transcriptName: data.transcriptName,
          analyzedAt: data.analyzedAt,
          summary: data.summary,
        };
      })
      .sort((a, b) => new Date(b.analyzedAt) - new Date(a.analyzedAt));

    res.json({ summaries });
  } catch (err) {
    console.error("Error loading summaries:", err);
    res.status(500).json({ error: "Failed to load summaries" });
  }
});

// Delete transcript
app.delete("/api/transcripts/:transcriptId", (req, res) => {
  try {
    const { transcriptId } = req.params;
    const metadata = loadMetadata();
    const transcript = metadata[transcriptId];

    if (!transcript) {
      return res.status(404).json({ error: "Transcript not found" });
    }

    // Delete file
    const filePath = path.join(TRANSCRIPTS_DIR, transcript.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete metadata
    delete metadata[transcriptId];
    saveMetadata(metadata);

    console.log(`🗑️ Deleted transcript: ${transcript.name}`);
    res.json({ success: true });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ error: "Delete failed" });
  }
});

const PORT = 8003;

app.listen(PORT, () => {
  console.log("🚀 ContextAI Meets Analyzer");
  console.log("===================================");
  console.log(`📡 API Server: http://localhost:${PORT}`);
  console.log("===================================");
  console.log("Team: Gear5\n");
});
