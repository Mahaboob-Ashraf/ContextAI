import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

function loadLocalSummaries() {
  try {
    const raw = localStorage.getItem('contextai_summaries')
    if (!raw) return {}
    return JSON.parse(raw)
  } catch (e) {
    return {}
  }
}

function saveLocalSummaries(obj) {
  try {
    localStorage.setItem('contextai_summaries', JSON.stringify(obj))
  } catch (e) {
    console.warn('Failed to save summaries', e)
  }
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [summaries, setSummaries] = useState({})
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  
  // AI Q&A state
  const [aiQuestion, setAiQuestion] = useState('')
  const [aiAnswer, setAiAnswer] = useState(null)
  const [askingAI, setAskingAI] = useState(false)
  const [showAIPanel, setShowAIPanel] = useState(false)

  useEffect(() => {
    const local = loadLocalSummaries()
    setSummaries(local)
  }, [])

  // Simple local search over cached summaries
  useEffect(() => {
    const keys = Object.keys(summaries)
    if (!query) {
      setResults(keys.map(k => summaries[k]).reverse())
      return
    }
    const q = query.toLowerCase()
    const filtered = keys
      .map(k => summaries[k])
      .filter(s => {
        return (
          (s.aiSummary && s.aiSummary.toLowerCase().includes(q)) ||
          (s.chatName && s.chatName.toLowerCase().includes(q)) ||
          (s.messages && s.messages.join(' ').toLowerCase().includes(q))
        )
      })
    setResults(filtered.reverse())
  }, [query, summaries])

  async function refreshFromServer() {
    // Simply reload from localStorage - much faster
    setLoading(true)
    try {
      const local = loadLocalSummaries()
      setSummaries(local)
    } catch (err) {
      console.warn('Failed to refresh from localStorage', err)
    } finally {
      setLoading(false)
    }
  }

  function clearCache() {
    if (!confirm('Clear all cached summaries?')) return
    localStorage.removeItem('contextai_summaries')
    setSummaries({})
    setResults([])
    setAiAnswer(null)
  }

  function deleteSummary(chatId) {
    if (!confirm('Delete this summary from cache?')) return
    const updated = { ...summaries }
    delete updated[chatId]
    setSummaries(updated)
    saveLocalSummaries(updated)
  }

  function goToChat(chatId) {
    // Save the chatId to localStorage so WhatsApp page can auto-select it
    localStorage.setItem('contextai_selected_chat', chatId)
    navigate('/whatsapp')
  }

  async function askAI() {
    if (!aiQuestion.trim()) return
    if (Object.keys(summaries).length === 0) {
      alert('No summaries available. Analyze some chats first!')
      return
    }

    setAskingAI(true)
    setAiAnswer(null)
    
    try {
      const res = await axios.post('http://localhost:8002/api/dashboard-qa', {
        summaries,
        question: aiQuestion
      })
      
      if (res.data && res.data.answer) {
        setAiAnswer({
          question: aiQuestion,
          answer: res.data.answer,
          analyzedChats: res.data.analyzedChats
        })
        setShowAIPanel(true)
      }
    } catch (err) {
      console.error('AI Q&A failed', err)
      alert('AI Q&A failed: ' + (err.response?.data?.error || err.message || 'Unknown error'))
    } finally {
      setAskingAI(false)
    }
  }

  function formatAIAnswer(text) {
    if (!text) return null
    return text.split('\n').map((line, i) => {
      if (line.trim().startsWith('**') && line.trim().endsWith('**')) {
        return <div key={i} className="ai-header">{line.replace(/\*\*/g, '')}</div>
      }
      if (line.trim().startsWith('- ') || line.trim().startsWith('• ')) {
        return <div key={i} className="ai-bullet">{line.replace(/^[-•]\s*/, '• ')}</div>
      }
      if (line.trim()) {
        return <div key={i} className="ai-text">{line}</div>
      }
      return <br key={i} />
    })
  }

  return (
    <div className="page dashboard">
      <h2>📊 Dashboard</h2>
      <p className="muted">Search, analyze, and ask AI questions across all your chat summaries.</p>

      {/* AI Q&A Section */}
      <div className="ai-qa-section">
        <div className="ai-qa-header">
          <h3>🤖 Ask AI Anything</h3>
          <p className="muted-small">Ask questions about patterns, correlations, or insights across all {Object.keys(summaries).length} cached chats</p>
        </div>
        
        <div className="ai-qa-input-row">
          <input
            type="text"
            placeholder="e.g., 'What are common topics across all chats?' or 'Which chat has the most active discussion?'"
            value={aiQuestion}
            onChange={e => setAiQuestion(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && askAI()}
            className="ai-question-input"
          />
          <button onClick={askAI} disabled={askingAI} className="ask-ai-btn">
            {askingAI ? '🤔 Thinking...' : '✨ Ask AI'}
          </button>
        </div>

        {aiAnswer && showAIPanel && (
          <div className="ai-answer-panel">
            <div className="ai-answer-header">
              <span className="ai-answer-label">💡 AI Analysis ({aiAnswer.analyzedChats} chats analyzed)</span>
              <button className="close-ai-btn" onClick={() => setShowAIPanel(false)}>✕</button>
            </div>
            <div className="ai-answer-question">❓ {aiAnswer.question}</div>
            <div className="ai-answer-content">
              {formatAIAnswer(aiAnswer.answer)}
            </div>
          </div>
        )}
      </div>

      {/* Search Section */}
      <div className="search-row">
        <input 
          placeholder="🔍 Search summaries by keyword..." 
          value={query} 
          onChange={e => setQuery(e.target.value)} 
          className="search-input-dashboard"
        />
        <button onClick={refreshFromServer} disabled={loading} className="refresh-btn">
          {loading ? '⏳ Refreshing...' : '🔄 Refresh'}
        </button>
        <button onClick={clearCache} className="clear-btn">🗑️ Clear Cache</button>
      </div>

      {/* Results Grid */}
      <div className="results">
        {results.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">📭</div>
            <div>No summaries yet</div>
            <div className="muted-small">Visit WhatsApp page and analyze a chat to get started</div>
          </div>
        ) : (
          results.map(s => (
            <div key={s.chatId} className="summary-card">
              {/* Card Actions */}
              <button className="card-delete-btn" onClick={() => deleteSummary(s.chatId)} title="Delete">
                🗑️
              </button>
              <button className="card-goto-btn" onClick={() => goToChat(s.chatId)} title="Go to chat">
                🔗
              </button>
              
              {/* Card Content */}
              <div className="summary-head">
                <div className="chat-name">{s.isGroup ? '👥' : '👤'} {s.chatName}</div>
                <div className="meta">
                  💬 {s.textMessages} msgs • 
                  👥 {Object.keys(s.participants || {}).length} participants
                </div>
              </div>
              <div className="summary-body">
                {s.aiSummary ? (
                  <div className="ai-summary">
                    {s.aiSummary.split('\n').slice(0, 6).map((l, i) => (
                      <div key={i} className="summary-line">
                        {l.trim() && `• ${l.replace(/^[-•*]\s*/, '')}`}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-summary">(no AI summary)</div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
