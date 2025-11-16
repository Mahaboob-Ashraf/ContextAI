import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function Meets() {
  const [transcripts, setTranscripts] = useState([]);
  const [selectedTranscript, setSelectedTranscript] = useState(null);
  const [summaries, setSummaries] = useState({});
  const [qaHistory, setQaHistory] = useState({});
  const [analyzing, setAnalyzing] = useState(false);
  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [analysisDepth, setAnalysisDepth] = useState('moderate');
  
  // Upload state
  const [uploadMode, setUploadMode] = useState(false);
  const [uploadText, setUploadText] = useState('');
  const [uploadName, setUploadName] = useState('');
  const [uploading, setUploading] = useState(false);
  
  // Meet link joining state
  const [joinMode, setJoinMode] = useState(false);
  const [meetLink, setMeetLink] = useState('');
  const [driveLink, setDriveLink] = useState('');
  const [meetName, setMeetName] = useState('');
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    loadTranscripts();
    loadSummaries();
  }, []);

  // Load summary from localStorage when transcript is selected
  useEffect(() => {
    if (selectedTranscript) {
      const storedSummaries = JSON.parse(localStorage.getItem('contextai_summaries') || '{}');
      
      // Find summary for this transcript
      const transcriptSummary = Object.values(storedSummaries).find(s => 
        s.source === 'meets' && 
        s.chatName === `${selectedTranscript.name} (Meet)`
      );
      
      if (transcriptSummary) {
        setSummaries(prev => ({
          ...prev,
          [selectedTranscript.id]: {
            id: transcriptSummary.chatId,
            summary: transcriptSummary.aiSummary,
            transcriptName: selectedTranscript.name,
          }
        }));
      }
    }
  }, [selectedTranscript]);

  const loadTranscripts = async () => {
    try {
      const res = await axios.get('http://localhost:8003/api/transcripts');
      if (res.data && res.data.transcripts) {
        setTranscripts(res.data.transcripts);
      }
    } catch (err) {
      console.error('Failed to load transcripts:', err);
    }
  };

  const loadSummaries = async () => {
    try {
      const res = await axios.get('http://localhost:8003/api/summaries');
      if (res.data && res.data.summaries) {
        const summaryMap = {};
        res.data.summaries.forEach(s => {
          // Use transcriptId as key so we can look it up with selectedTranscript.id
          summaryMap[s.transcriptId] = s;
        });
        setSummaries(summaryMap);
      }
    } catch (err) {
      console.error('Failed to load summaries:', err);
    }
  };

  const handleDeleteTranscript = async (transcriptId, transcriptName) => {
    if (!confirm(`Delete transcript "${transcriptName}"? This will also delete associated summaries.`)) {
      return;
    }

    try {
      const res = await axios.delete(`http://localhost:8003/api/transcripts/${transcriptId}`);
      if (res.data.success) {
        // Clear selection if this was selected
        if (selectedTranscript?.id === transcriptId) {
          setSelectedTranscript(null);
        }
        
        // Remove from local state
        setTranscripts(prev => prev.filter(t => t.id !== transcriptId));
        setSummaries(prev => {
          const updated = { ...prev };
          delete updated[transcriptId];
          return updated;
        });
        
        // Remove from localStorage
        const storedSummaries = JSON.parse(localStorage.getItem('contextai_summaries') || '{}');
        const summaryId = Object.keys(storedSummaries).find(key => {
          const s = storedSummaries[key];
          return s.source === 'meets' && s.chatName === `${transcriptName} (Meet)`;
        });
        if (summaryId) {
          delete storedSummaries[summaryId];
          localStorage.setItem('contextai_summaries', JSON.stringify(storedSummaries));
        }
      }
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Failed to delete transcript: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!uploadText.trim() || !uploadName.trim()) return;

    setUploading(true);

    try {
      const res = await axios.post('http://localhost:8003/api/upload', {
        transcript: uploadText.trim(),
        name: uploadName.trim(),
      });

      if (res.data.success) {
        setUploadMode(false);
        setUploadText('');
        setUploadName('');
        loadTranscripts();
      }
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleJoinMeet = async (e) => {
    e.preventDefault();
    if (!meetLink.trim() || !driveLink.trim() || !meetName.trim()) return;

    setJoining(true);
    try {
      const res = await axios.post('http://localhost:8003/api/join', {
        meetLink: meetLink.trim(),
        driveLink: driveLink.trim(),
        name: meetName.trim(),
      });

      if (res.data.success) {
        setJoinMode(false);
        setMeetLink('');
        setDriveLink('');
        setMeetName('');
        loadTranscripts();
      }
    } catch (err) {
      console.error('Join failed:', err);
    } finally {
      setJoining(false);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedTranscript) return;

    setAnalyzing(true);
    try {
      const res = await axios.post('http://localhost:8003/api/analyze', {
        transcriptId: selectedTranscript.id,
        analysisDepth,
      });

      if (res.data.success) {
        const summary = {
          id: res.data.summaryId,
          summary: res.data.summary,
          transcriptName: selectedTranscript.name,
        };
        setSummaries(prev => ({ ...prev, [selectedTranscript.id]: summary }));
        
        // Save to localStorage for Dashboard visibility
        const dashboardSummary = {
          chatId: res.data.summaryId,
          chatName: `${selectedTranscript.name} (Meet)`,
          isGroup: true,
          aiSummary: res.data.summary,
          textMessages: 0,
          participants: {},
          messages: [],
          source: 'meets',
          timestamp: new Date().toISOString(),
        };
        
        const existingSummaries = JSON.parse(localStorage.getItem('contextai_summaries') || '{}');
        existingSummaries[res.data.summaryId] = dashboardSummary;
        localStorage.setItem('contextai_summaries', JSON.stringify(existingSummaries));
        
        loadSummaries();
      }
    } catch (err) {
      console.error('Analysis error:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAskQuestion = async () => {
    if (!selectedTranscript || !question.trim()) return;

    const transcriptId = selectedTranscript.id;
    setIsAsking(true);

    try {
      const res = await axios.post('http://localhost:8003/api/qa', {
        transcriptId,
        question: question.trim(),
      });

      if (res.data.success) {
        const newQA = {
          question: res.data.question,
          answer: res.data.answer,
        };
        setQaHistory(prev => ({
          ...prev,
          [transcriptId]: [...(prev[transcriptId] || []), newQA]
        }));
        setQuestion('');
      }
    } catch (err) {
      console.error('Q&A error:', err);
    } finally {
      setIsAsking(false);
    }
  };

  const currentSummary = selectedTranscript ? summaries[selectedTranscript.id] : null;
  const currentQA = selectedTranscript ? (qaHistory[selectedTranscript.id] || []) : [];

  return (
    <div className="page whatsapp meets-theme">
      {/* Status Bar */}
      <div className="status-bar meets-status">
        <div className="status-left">
          <div className="status-dot online"></div>
          <span>✅ Google Meets Analyzer ({transcripts.length} transcripts)</span>
        </div>
        <div className="status-right">
          <button 
            className="meets-action-btn upload-btn"
            onClick={() => { setUploadMode(true); setJoinMode(false); }}
          >
            📄 Upload Transcript
          </button>
          <button 
            className="meets-action-btn join-btn"
            onClick={() => { setJoinMode(true); setUploadMode(false); }}
          >
            🔗 Join Meet
          </button>
        </div>
      </div>

      {/* Upload Modal */}
      {uploadMode && (
        <div className="modal-overlay" onClick={() => setUploadMode(false)}>
          <div className="modal-content meets-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📄 Upload Transcript</h3>
              <button onClick={() => setUploadMode(false)}>×</button>
            </div>
            <form onSubmit={handleFileUpload} className="modal-body">
              <div className="form-group">
                <label>Meeting Name:</label>
                <input
                  type="text"
                  placeholder="e.g., Team Standup - Nov 16"
                  value={uploadName}
                  onChange={e => setUploadName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Transcript Text:</label>
                <textarea
                  placeholder="Paste your meeting transcript here..."
                  value={uploadText}
                  onChange={e => setUploadText(e.target.value)}
                  rows="10"
                  style={{
                    width: '100%',
                    background: 'rgba(26, 26, 26, 0.7)',
                    border: '2px solid rgba(37, 211, 102, 0.3)',
                    color: 'white',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontFamily: 'Courier New, monospace',
                    resize: 'vertical',
                  }}
                  required
                />
              </div>
              <button type="submit" className="submit-btn" disabled={uploading}>
                {uploading ? '⏳ Uploading...' : '📤 Upload'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Join Meet Modal */}
      {joinMode && (
        <div className="modal-overlay" onClick={() => setJoinMode(false)}>
          <div className="modal-content meets-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🔗 Join Google Meet</h3>
              <button onClick={() => setJoinMode(false)}>×</button>
            </div>
            <form onSubmit={handleJoinMeet} className="modal-body">
              <div className="form-group">
                <label>Meeting Name:</label>
                <input
                  type="text"
                  placeholder="e.g., Product Review Meeting"
                  value={meetName}
                  onChange={e => setMeetName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Google Meet Link:</label>
                <input
                  type="url"
                  placeholder="https://meet.google.com/xxx-xxxx-xxx"
                  value={meetLink}
                  onChange={e => setMeetLink(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Google Drive Folder Link (for auto-transcript):</label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/drive/folders/..."
                  value={driveLink}
                  onChange={e => setDriveLink(e.target.value)}
                  required
                />
                <p className="muted-small">Transcripts will be monitored from this folder</p>
              </div>
              <button type="submit" className="submit-btn" disabled={joining}>
                {joining ? '⏳ Joining...' : '🚀 Join & Monitor'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Main Layout */}
      <div className="layout">
        {/* Left Sidebar - Transcript List */}
        <aside className="left meets-sidebar-main">
          <div className="sidebar-header">
            <h3>📋 Transcripts</h3>
            <button className="icon-btn" onClick={loadTranscripts} title="Refresh">🔄</button>
          </div>

          <div className="chat-list">
            {transcripts.length === 0 ? (
              <div className="empty">
                <p>No transcripts yet</p>
                <p className="muted">Upload a transcript or join a meet</p>
              </div>
            ) : (
              transcripts.map(transcript => (
                <div
                  key={transcript.id}
                  className={`chat-item ${selectedTranscript?.id === transcript.id ? 'selected' : ''}`}
                  onClick={() => setSelectedTranscript(transcript)}
                >
                  <div className="chat-icon">📄</div>
                  <div className="chat-info">
                    <div className="name">{transcript.name}</div>
                    <div className="meta">
                      📅 {new Date(transcript.uploadedAt).toLocaleDateString()} • 
                      {transcript.type === 'uploaded' ? '📤 Uploaded' : '🔗 Joined'}
                    </div>
                  </div>
                  {summaries[transcript.id] && <div className="summary-ready-dot"></div>}
                  <button
                    className="chat-item-delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTranscript(transcript.id, transcript.name);
                    }}
                    title="Delete transcript"
                  >
                    🗑️
                  </button>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Right Section - Analysis Panel */}
        <section className="right">
          {selectedTranscript ? (
            <div className="chat-content">
              {/* Header */}
              <div className="chat-header">
                <h3>{selectedTranscript.name}</h3>
                <span className="meta">📅 {new Date(selectedTranscript.uploadedAt).toLocaleString()}</span>
              </div>

              {/* Analysis Controls */}
              <div className="analyze-controls">
                <label className="limit-label">
                  🧠 Analysis Depth:
                  <select value={analysisDepth} onChange={e => setAnalysisDepth(e.target.value)}>
                    <option value="moderate">✨ Moderate (Fast)</option>
                    <option value="deep">🔬 Deep Research</option>
                  </select>
                </label>
                
                <button
                  className="analyze-btn"
                  onClick={handleAnalyze}
                  disabled={analyzing}
                >
                  {analyzing ? '⏳ Analyzing...' : '⚡ Analyze Transcript'}
                </button>
              </div>

              {/* Loading State */}
              {analyzing && (
                <div className="loading-indicator">
                  <div className="spinner"></div>
                  <p>Analyzing transcript...</p>
                </div>
              )}

              {/* Summary Display */}
              {currentSummary && !analyzing && (
                <div className="summary-section">
                  <div className="ai-summary-box">
                    <div className="summary-header">
                      <h4>🤖 AI Summary</h4>
                    </div>
                    <div className="summary-content-text">
                      {currentSummary.summary.split('\n').map((line, i) => (
                        <p key={i} className="summary-line">
                          {line.trim() && (
                            line.startsWith('**') ? (
                              <strong>{line.replace(/\*\*/g, '')}</strong>
                            ) : line.startsWith('*') ? (
                              <span className="bullet-point">{line.replace(/^\*\s*/, '• ')}</span>
                            ) : (
                              line
                            )
                          )}
                        </p>
                      ))}
                    </div>
                  </div>

                  {/* Q&A Section */}
                  <div className="qa-section">
                    <h4>💬 Ask Questions</h4>
                    <p className="muted">Get precise answers about this meeting</p>
                    
                    <div className="qa-input-row">
                      <textarea
                        placeholder="e.g., What were the key decisions? Who were the action item owners?"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                            e.preventDefault();
                            handleAskQuestion();
                          }
                        }}
                        rows="2"
                      />
                      <button
                        onClick={handleAskQuestion}
                        disabled={isAsking || !question.trim()}
                      >
                        {isAsking ? '⏳ Asking...' : '🤖 Ask AI'}
                      </button>
                    </div>

                    <div className="qa-history">
                      {currentQA.map((qa, i) => (
                        <div key={i} className="qa-item">
                          <div className="qa-question">
                            ❓ {qa.question}
                          </div>
                          <div className="qa-answer">
                            💡 {qa.answer}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Empty State */}
              {!currentSummary && !analyzing && (
                <div className="empty-state">
                  <div className="empty-icon">📄</div>
                  <p>No summary yet</p>
                  <p className="muted">Click "Analyze Transcript" above to generate AI insights</p>
                </div>
              )}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <p>Select a transcript to analyze</p>
              <p className="muted">Choose from the sidebar or upload a new one</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
