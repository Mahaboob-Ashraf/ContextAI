# Google Meets Integration - Setup Guide

## Overview

The Meets page allows you to:

- **Upload transcript files** (.txt, .vtt, .srt)
- **Join Google Meets** with auto-transcript monitoring
- **Analyze transcripts** with AI (Moderate or Deep Research mode)
- **Ask questions** about meeting content using RAG
- **Green theme** for easy visual distinction

## Features

### ✅ Implemented

- [x] Upload transcript files (manual)
- [x] Join Meet with Drive link (for future auto-monitoring)
- [x] AI-powered transcript analysis (2 modes)
- [x] RAG-powered Q&A for mapped transcripts
- [x] Gemini fallback for unmapped transcripts
- [x] Green WhatsApp-style layout
- [x] Transcript list management
- [x] Dashboard integration

### 📋 Modes

**Moderate (Fast)**

- Quick overview
- Main topics
- Action items
- Key takeaways

**Deep Research**

- In-depth context analysis
- Detailed topic breakdowns
- Decision reasoning
- Participation patterns
- Meeting effectiveness analysis

## Installation

### 1. Install Dependencies

```bash
cd backend
npm install multer
```

### 2. Start Meets API

```bash
npm run meets
# or
node meets_api.js
```

Server will run on **http://localhost:8003**

### 3. Access Meets Page

Navigate to the Meets page in the frontend (port 5173)

## Usage

### Upload Transcript

1. Click **"📄 Upload Transcript"** button
2. Enter meeting name (e.g., "Team Standup - Nov 16")
3. Select transcript file (.txt, .vtt, or .srt)
4. Click **"📤 Upload"**

Your transcript will appear in the sidebar!

### Join Google Meet (Future Auto-Monitoring)

1. Click **"🔗 Join Meet"** button
2. Enter meeting name
3. Paste Google Meet link
4. Paste Google Drive folder link (where transcripts are saved)
5. Click **"🚀 Join & Monitor"**

_Note: Auto-transcript fetching from Drive will be implemented in future updates_

### Analyze Transcript

1. Select a transcript from the sidebar
2. Choose analysis depth:
   - **✨ Moderate (Fast)** - Quick summary
   - **🔬 Deep Research** - Comprehensive analysis
3. Click **"⚡ Analyze Transcript"**
4. Wait for AI to generate summary

### Ask Questions

After analysis:

1. Type your question in the Q&A box
2. Click **"🤖 Ask AI"** or press Ctrl+Enter
3. Get instant answers based on:
   - **RAG retrieval** (if transcript is mapped)
   - **Summary context** (if unmapped)

## RAG Integration

### meets_mapping.json Format

Map transcripts to projects for RAG-powered Q&A:

```json
{
  "meet_1234567890": {
    "project_id": "product_team",
    "team_id": "engineering"
  }
}
```

### How It Works

**For Mapped Transcripts:**

```
Upload → Auto-ingest to RAG → Vector DB → Q&A uses RAG retrieval
```

**For Unmapped Transcripts:**

```
Upload → Analyze with Gemini → Q&A uses summary context
```

## File Storage

### Transcript Files

Location: `backend/contextai_meet_transcripts/`
Format: `transcript_[timestamp].txt/vtt/srt`

### Summaries

Location: `backend/contextai_meet_summaries/`
Format: `summary_meet_[transcriptId]_[timestamp].json`

### Metadata

Location: `backend/meets_metadata.json`
Contains: Transcript names, upload dates, file info

## API Endpoints

### GET /api/transcripts

Get all uploaded transcripts

### POST /api/upload

Upload a new transcript file

- Form data: `transcript` (file), `name` (string)

### POST /api/join

Join a Google Meet

- Body: `{ meetLink, driveLink, name }`

### POST /api/analyze

Analyze a transcript

- Body: `{ transcriptId, analysisDepth }`

### POST /api/qa

Ask a question about a transcript

- Body: `{ transcriptId, question }`
- Uses RAG if mapped, otherwise Gemini

### GET /api/summaries

Get all transcript summaries

### DELETE /api/transcripts/:transcriptId

Delete a transcript

## Transcript File Formats

### Supported Formats

- **.txt** - Plain text transcripts
- **.vtt** - WebVTT (Video Text Tracks)
- **.srt** - SubRip Subtitle format

### Example .vtt Format

```
WEBVTT

00:00:01.000 --> 00:00:05.000
John: Welcome everyone to today's standup.

00:00:06.000 --> 00:00:10.000
Sarah: Thanks! I completed the API integration.
```

### Example .txt Format

```
Team Standup - November 16, 2025

[00:01] John: Welcome everyone.
[00:02] Sarah: I completed the API integration yesterday.
[00:05] Mike: I'm working on the frontend UI updates.
```

## Green Theme Colors

- **Primary:** #25D366 (WhatsApp Green)
- **Secondary:** #34B7F1 (Light Blue)
- **Hover:** #1DA851 (Dark Green)
- **Dark Accent:** #075E54 (Deep Green)

## Tips

1. **Name your meetings clearly** - Use descriptive names with dates
2. **Choose the right analysis mode** - Moderate for quick reviews, Deep for important meetings
3. **Map critical transcripts** - Enable RAG for better Q&A on recurring meetings
4. **Use Drive integration** - For automatic transcript capture from Google Meet recordings

## Troubleshooting

### Transcript Won't Upload

- Check file size (max 10MB)
- Verify file extension (.txt, .vtt, .srt)
- Ensure meeting name is provided

### Analysis Taking Too Long

- Switch to "Moderate" mode for faster results
- Check if Gemini API keys are configured
- Verify internet connection

### Q&A Not Working

- Ensure transcript has been analyzed first
- Check meets_mapping.json for RAG configuration
- Verify RAG server is running (port 3000)

## Next Steps

1. **Upload your first transcript**
2. **Test both analysis modes**
3. **Try Q&A with different questions**
4. **Map important transcripts** to enable RAG

## Future Enhancements

- [ ] Auto-fetch transcripts from Google Drive
- [ ] Real-time Meet joining and recording
- [ ] Speaker diarization and identification
- [ ] Meeting sentiment analysis
- [ ] Action item extraction and tracking
- [ ] Meeting effectiveness scoring

---

**Team Gear5** | ContextAI Meets Analyzer
