import React, { useEffect, useState } from 'react'
import axios from 'axios'

export default function WhatsApp() {
  const [status, setStatus] = useState({ connected: false })
  const [qrCode, setQrCode] = useState(null)
  const [chats, setChats] = useState(() => {
    try { return JSON.parse(localStorage.getItem('contextai_chats') || '[]') } catch (e) { return [] }
  })
  const [selected, setSelected] = useState(null)
  const [summaries, setSummaries] = useState(() => {
    try { return JSON.parse(localStorage.getItem('contextai_summaries') || '{}') } catch (e) { return {} }
  })
  const [qaHistory, setQaHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('contextai_qa_history') || '{}') } catch (e) { return {} }
  })
  const [viewedSummaries, setViewedSummaries] = useState(() => {
    try { return JSON.parse(localStorage.getItem('contextai_viewed_summaries') || '{}') } catch (e) { return {} }
  })
  const [loadingChats, setLoadingChats] = useState({})
  const [messageLimit, setMessageLimit] = useState(100)
  const [question, setQuestion] = useState('')
  const [askingQuestion, setAskingQuestion] = useState(false)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  
  // Bot mode state
  const [botEnabled, setBotEnabled] = useState(() => {
    try { return JSON.parse(localStorage.getItem('contextai_bot_enabled') || 'false') } catch (e) { return false }
  })
  const [botGroups, setBotGroups] = useState(() => {
    try { return JSON.parse(localStorage.getItem('contextai_bot_groups') || '[]') } catch (e) { return [] }
  })
  const [showBotSelector, setShowBotSelector] = useState(false)
  const [personalities, setPersonalities] = useState([])
  const [loadingPersonalities, setLoadingPersonalities] = useState(false)
  const [analysisDepth, setAnalysisDepth] = useState(() => {
    try { return localStorage.getItem('contextai_analysis_depth') || 'moderate' } catch (e) { return 'moderate' }
  })
  const [copyFeedback, setCopyFeedback] = useState({})

  useEffect(() => {
    checkStatus()
    const tick = setInterval(checkStatus, 3000)
    return () => clearInterval(tick)
  }, [])

  // Load personalities on mount
  useEffect(() => {
    if (status.connected) {
      loadPersonalities()
    }
  }, [status.connected])

  async function loadPersonalities() {
    if (loadingPersonalities) return
    setLoadingPersonalities(true)
    try {
      const res = await axios.get('http://localhost:8002/api/bot/personalities')
      if (res.data && res.data.personalities) {
        console.log('✅ Loaded personalities:', res.data.personalities)
        setPersonalities(res.data.personalities)
      }
    } catch (err) {
      console.warn('Failed to load personalities', err)
    } finally {
      setLoadingPersonalities(false)
    }
  }

  // Periodically reload summaries from localStorage to catch background completions
  useEffect(() => {
    const reloadSummaries = () => {
      try {
        const stored = JSON.parse(localStorage.getItem('contextai_summaries') || '{}')
        setSummaries(stored)
      } catch (e) {
        console.warn('Failed to reload summaries', e)
      }
    }
    
    // Check every 5 seconds for new summaries
    const summaryTick = setInterval(reloadSummaries, 5000)
    return () => clearInterval(summaryTick)
  }, [])

  // Auto-select chat if coming from Dashboard
  useEffect(() => {
    if (chats.length > 0) {
      const targetChatId = localStorage.getItem('contextai_selected_chat')
      if (targetChatId) {
        const targetChat = chats.find(c => c.id === targetChatId)
        if (targetChat) {
          setSelected(targetChat)
          localStorage.removeItem('contextai_selected_chat') // Clear after selection
        }
      }
    }
  }, [chats])

  // Sync bot config with backend when it changes
  useEffect(() => {
    if (!status.connected) return
    
    axios.post('http://localhost:8002/api/bot/config', {
      enabled: botEnabled,
      groups: botGroups
    }).catch(err => console.warn('Failed to sync bot config', err))
  }, [botEnabled, botGroups, status.connected])

  // Save analysis depth preference to localStorage
  useEffect(() => {
    localStorage.setItem('contextai_analysis_depth', analysisDepth)
  }, [analysisDepth])

  async function checkStatus() {
    try {
      const res = await axios.get('http://localhost:8002/api/status')
      setStatus(res.data || { connected: false })
      
      // Immediately load chats when connected (even if we have cached ones, refresh them)
      if (res.data && res.data.connected) {
        loadChats()
      } else if (res.data && res.data.hasQR) {
        loadQR()
      }
    } catch (err) {
      setStatus({ connected: false })
    }
  }

  async function loadQR() {
    try {
      const res = await axios.get('http://localhost:8002/api/qr')
      if (res.data && res.data.qr) setQrCode(res.data.qr)
    } catch (err) {
      console.warn('Failed to load QR', err)
    }
  }

  async function loadChats() {
    try {
      const res = await axios.get('http://localhost:8002/api/chats', {
        timeout: 65000 // 65 second timeout (server can use up to 60s for reconnecting)
      })
      if (res.data && Array.isArray(res.data.chats)) {
        // Sort by timestamp descending (most recent first)
        const sortedChats = res.data.chats.sort((a, b) => b.timestamp - a.timestamp)
        setChats(sortedChats)
        localStorage.setItem('contextai_chats', JSON.stringify(sortedChats))
      }
    } catch (err) {
      console.warn('Failed to load chats', err)
      
      // Check if it's a reconnecting state
      if (err.response && err.response.data && err.response.data.reconnecting) {
        console.log('WhatsApp is syncing after reconnection, will retry...')
        // Retry after 3 seconds
        setTimeout(() => {
          loadChats()
        }, 3000)
      }
      // Keep showing cached chats even if refresh fails
    }
  }

  async function logout() {
    if (!confirm('Logout from WhatsApp?')) return
    try {
      await axios.post('http://localhost:8002/api/logout')
      setChats([])
      setSelected(null)
      setSummaries({})
      setQaHistory({})
      setViewedSummaries({})
      localStorage.removeItem('contextai_chats')
      localStorage.removeItem('contextai_summaries')
      localStorage.removeItem('contextai_qa_history')
      localStorage.removeItem('contextai_viewed_summaries')
      setTimeout(checkStatus, 3000)
    } catch (err) {
      alert('Logout failed: ' + (err.message || 'unknown'))
    }
  }

  function selectChat(c) {
    setSelected(c)
    // Mark summary as viewed when user selects a chat with a summary
    if (summaries[c.id] && summaries[c.id].aiSummary && !viewedSummaries[c.id]) {
      const updated = { ...viewedSummaries, [c.id]: true }
      setViewedSummaries(updated)
      localStorage.setItem('contextai_viewed_summaries', JSON.stringify(updated))
    }
  }

  async function analyzeSelected() {
    if (!selected) return
    const chatId = selected.id
    
    if (loadingChats[chatId]) return
    
    setLoadingChats(prev => ({ ...prev, [chatId]: true }))
    
    // Start the analysis - don't await inside try to prevent cancellation
    const analysisPromise = axios.post('http://localhost:8002/api/messages', { 
      chatId, 
      limit: messageLimit,
      analysisDepth: analysisDepth // Send analysis depth to backend
    })
      .then(res => {
        if (res.data) {
          const s = {
            ...res.data,
            chatName: selected.name || res.data.chatName, // Ensure we use the name from chat list
            isGroup: selected.isGroup
          }
          
          // Save to localStorage immediately
          const existingSummaries = JSON.parse(localStorage.getItem('contextai_summaries') || '{}')
          const updated = { ...existingSummaries, [chatId]: s }
          localStorage.setItem('contextai_summaries', JSON.stringify(updated))
          
          // Update state if component is still mounted
          setSummaries(prev => ({ ...prev, [chatId]: s }))
          
          // Reset viewed status so green dot appears if user is viewing a different chat
          if (selected.id !== chatId) {
            setViewedSummaries(prev => {
              const updated = { ...prev, [chatId]: false }
              localStorage.setItem('contextai_viewed_summaries', JSON.stringify(updated))
              return updated
            })
          }
        }
      })
      .catch(err => {
        console.error('Analyze failed', err)
        // Only show alert if not a cancellation
        if (err.code !== 'ERR_CANCELED') {
          alert('Analyze failed: ' + (err.message || 'unknown'))
        }
      })
      .finally(() => {
        // Update loading state
        setLoadingChats(prev => {
          const next = { ...prev }
          delete next[chatId]
          return next
        })
      })
    
    // Don't block - let it run in background
    return analysisPromise
  }

  async function askQuestion() {
    if (!question.trim() || !selected) return
    
    const chatId = selected.id
    setAskingQuestion(true)
    
    const qaId = Date.now()
    const newQA = { id: qaId, question: question.trim(), answer: null, loading: true }
    
    setQaHistory(prev => {
      const chatQA = prev[chatId] || []
      return { ...prev, [chatId]: [...chatQA, newQA] }
    })
    
    setQuestion('')
    
    try {
      const res = await axios.post('http://localhost:8002/api/chat-qa', {
        chatId,
        question: newQA.question,
        messageLimit
      })
      
      if (res.data && res.data.answer) {
        setQaHistory(prev => {
          const chatQA = (prev[chatId] || []).map(qa =>
            qa.id === qaId ? { ...qa, answer: res.data.answer, contextMessages: res.data.contextMessages, loading: false } : qa
          )
          const updated = { ...prev, [chatId]: chatQA }
          localStorage.setItem('contextai_qa_history', JSON.stringify(updated))
          return updated
        })
      }
    } catch (err) {
      console.error('Q&A failed', err)
      setQaHistory(prev => {
        const chatQA = (prev[chatId] || []).map(qa =>
          qa.id === qaId ? { ...qa, answer: `Error: ${err.message}`, loading: false } : qa
        )
        return { ...prev, [chatId]: chatQA }
      })
    } finally {
      setAskingQuestion(false)
    }
  }

  function formatAISummary(text) {
    if (!text) return null
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-gold">$1</strong>')
      .replace(/(📋|✅|📌|💭|⭐|📊|👥|⚡|🔍)\s*([^\n]+)/g, '<div class="emoji-header">$1 $2</div>')
      .replace(/\*\s+([^*\n]+)/g, '<div class="bullet">• $1</div>')
      .replace(/^[-•]\s+(.+)$/gm, '<div class="bullet">• $1</div>')
      .replace(/\n\n/g, '<div class="spacer"></div>')
  }

  function copySummaryToClipboard(chatId) {
    const summary = summaries[chatId]
    if (!summary || !summary.aiSummary) return
    
    // Strip HTML tags and copy plain text
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = formatAISummary(summary.aiSummary)
    const plainText = tempDiv.innerText || tempDiv.textContent
    
    navigator.clipboard.writeText(plainText).then(() => {
      // Show feedback
      setCopyFeedback(prev => ({ ...prev, [chatId]: true }))
      setTimeout(() => {
        setCopyFeedback(prev => ({ ...prev, [chatId]: false }))
      }, 2000)
    }).catch(err => {
      console.error('Failed to copy:', err)
      alert('Failed to copy to clipboard')
    })
  }

  function toggleBot() {
    const newState = !botEnabled
    setBotEnabled(newState)
    localStorage.setItem('contextai_bot_enabled', JSON.stringify(newState))
    
    if (newState && botGroups.length === 0) {
      setShowBotSelector(true)
    }
  }

  function toggleBotGroup(group) {
    let updated
    if (botGroups.find(g => g.id === group.id)) {
      // Remove group
      updated = botGroups.filter(g => g.id !== group.id)
    } else {
      // Add group (max 3)
      if (botGroups.length >= 3) {
        alert('Maximum 3 groups allowed for bot mode')
        return
      }
      updated = [...botGroups, { id: group.id, name: group.name, personality: 'hyderabadi' }]
      
      // Trigger memory pre-load for newly added group
      if (botEnabled) {
        preloadGroupMemory(group.id)
      }
    }
    setBotGroups(updated)
    localStorage.setItem('contextai_bot_groups', JSON.stringify(updated))
  }

  async function preloadGroupMemory(groupId) {
    try {
      console.log(`🧠 Pre-loading memory for group ${groupId}...`)
      const response = await fetch('http://localhost:8002/api/bot/preload-memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId })
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log(`✅ Pre-loaded ${data.messagesLoaded} messages for ${data.groupName}`)
      }
    } catch (err) {
      console.error('Failed to pre-load memory:', err)
    }
  }

  function updateGroupPersonality(groupId, personality) {
    const updated = botGroups.map(g => 
      g.id === groupId ? { ...g, personality } : g
    )
    setBotGroups(updated)
    localStorage.setItem('contextai_bot_groups', JSON.stringify(updated))
  }

  function deleteQA(chatId, qaId) {
    setQaHistory(prev => {
      const chatQA = (prev[chatId] || []).filter(qa => qa.id !== qaId)
      const updated = { ...prev, [chatId]: chatQA }
      localStorage.setItem('contextai_qa_history', JSON.stringify(updated))
      return updated
    })
  }

  function removeBotGroup(groupId) {
    const updated = botGroups.filter(g => g.id !== groupId)
    setBotGroups(updated)
    localStorage.setItem('contextai_bot_groups', JSON.stringify(updated))
  }

  const filteredChats = chats
    .filter(c => {
      if (filter === 'individual' && c.isGroup) return false
      if (filter === 'group' && !c.isGroup) return false
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)) // Sort by most recent first

  const groupChats = chats.filter(c => c.isGroup)

  const currentSummary = selected ? summaries[selected.id] : null
  const currentQA = selected ? (qaHistory[selected.id] || []) : []

  return (
    <div className="page whatsapp">
      <div className="status-bar">
        <div className="status-left">
          <div className={`status-dot ${status.connected ? 'online' : 'offline'}`}></div>
          <span>{status.connected ? `✅ Connected (${status.chatCount || 0} chats)` : '⏳ Not connected'}</span>
        </div>
        <div className="status-right">
          {status.connected && (
            <>
              <div className="bot-controls">
                <button 
                  className={`bot-toggle ${botEnabled ? 'active' : ''}`}
                  onClick={toggleBot}
                  title={botEnabled ? 'Bot mode enabled' : 'Bot mode disabled'}
                >
                  🤖 Bot {botEnabled ? 'ON' : 'OFF'}
                </button>
                {botEnabled && (
                  <>
                    <button 
                      className="bot-config-btn"
                      onClick={() => setShowBotSelector(!showBotSelector)}
                      title="Configure bot groups"
                    >
                      ⚙️ {botGroups.length}/3
                    </button>
                    <div className="bot-groups-inline">
                      {botGroups.map(g => (
                        <div key={g.id} className="bot-group-tag">
                          <span>{g.name}</span>
                          <button onClick={() => removeBotGroup(g.id)} title="Remove">×</button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <button className="logout-btn" onClick={logout}>🚪 Logout</button>
            </>
          )}
        </div>
      </div>

      {/* Bot Group Selector Modal */}
      {showBotSelector && (
        <div className="bot-selector-overlay" onClick={() => setShowBotSelector(false)}>
          <div className="bot-selector-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🤖 Bot Configuration (Max 3 Groups)</h3>
              <button onClick={() => setShowBotSelector(false)}>×</button>
            </div>
            <div className="modal-body">
              
              {/* Selected Groups with Personality */}
              {botGroups.length > 0 && (
                <div className="selected-groups-section">
                  <h4>✅ Active Bot Groups</h4>
                  {botGroups.map(g => (
                    <div key={g.id} className="selected-group-card">
                      <div className="group-info">
                        <div className="group-icon">👥</div>
                        <div className="group-details">
                          <div className="group-name-header">{g.name}</div>
                          <div className="personality-selector">
                            <label>🎭 Personality:</label>
                            <select 
                              value={g.personality || 'hyderabadi'}
                              onChange={e => updateGroupPersonality(g.id, e.target.value)}
                              onClick={e => e.stopPropagation()}
                            >
                              {personalities.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <button 
                          className="remove-group-btn" 
                          onClick={() => removeBotGroup(g.id)}
                          title="Remove from bot"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Available Groups */}
              {botGroups.length < 3 && (
                <div className="available-groups-section">
                  <h4>➕ Add Groups ({botGroups.length}/3)</h4>
                  <p className="muted">Select groups where the bot will auto-respond when you're mentioned</p>
                  <div className="group-selection-list">
                    {groupChats.length === 0 ? (
                      <p className="muted">No group chats found</p>
                    ) : (
                      groupChats
                        .filter(g => !botGroups.find(bg => bg.id === g.id))
                        .map(g => (
                          <div 
                            key={g.id}
                            className="group-select-item"
                            onClick={() => toggleBotGroup(g)}
                          >
                            <div className="group-icon">👥</div>
                            <div className="group-name">{g.name}</div>
                            <div className="add-icon">+</div>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {status.hasQR && qrCode && (
        <div className="qr-section">
          <h3>📱 Scan QR Code</h3>
          <p className="muted">Open WhatsApp → Settings → Linked Devices → Link a Device</p>
          <img src={qrCode} alt="QR Code" className="qr-image" />
        </div>
      )}

      {status.connected && (
        <div className="layout">
          <aside className="left">
            <div className="sidebar-header">
              <h3>💬 Chats</h3>
              <button className="icon-btn" onClick={loadChats} title="Refresh">🔄</button>
            </div>

            <input
              type="text"
              placeholder="🔍 Search..."
              className="search-input"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />

            <div className="filter-tabs">
              <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>All</button>
              <button className={filter === 'individual' ? 'active' : ''} onClick={() => setFilter('individual')}>👤</button>
              <button className={filter === 'group' ? 'active' : ''} onClick={() => setFilter('group')}>👥</button>
            </div>

            <div className="chat-list">
              {filteredChats.map(c => (
                <div
                  key={c.id}
                  className={`chat-item ${selected && selected.id === c.id ? 'selected' : ''}`}
                  onClick={() => selectChat(c)}
                >
                  <div className="chat-icon">{c.isGroup ? '👥' : '👤'}</div>
                  <div className="chat-info">
                    <div className="name">{c.name}</div>
                    <div className="meta">{c.isGroup ? 'Group' : 'Individual'}</div>
                  </div>
                  {summaries[c.id] && summaries[c.id].aiSummary && !viewedSummaries[c.id] && <div className="summary-ready-dot" title="New summary ready"></div>}
                </div>
              ))}
              {filteredChats.length === 0 && <div className="empty">No chats found</div>}
            </div>
          </aside>

          <section className="right">
            {selected ? (
              <div className="chat-content">
                <div className="chat-header">
                  <h3>{selected.name}</h3>
                  <span className="meta">{selected.isGroup ? '👥 Group Chat' : '👤 Individual Chat'}</span>
                </div>

                <div className="analyze-controls">
                  <label className="limit-label">
                    📊 Messages to Analyze:
                    <select value={messageLimit} onChange={e => setMessageLimit(Number(e.target.value))}>
                      <option value="50">⚡ 50 (Fast)</option>
                      <option value="100">✨ 100 (Recommended)</option>
                      <option value="200">🔍 200 (Detailed)</option>
                      <option value="500">📈 500 (Deep)</option>
                      <option value="1000">💎 1000 (Batch)</option>
                    </select>
                  </label>
                  
                  <label className="limit-label">
                    🧠 Analysis Depth:
                    <select value={analysisDepth} onChange={e => setAnalysisDepth(e.target.value)}>
                      <option value="moderate">✨ Moderate (Fast)</option>
                      <option value="deep">🔬 Deep (Research Mode)</option>
                    </select>
                  </label>
                  
                  <button
                    className="analyze-btn"
                    onClick={analyzeSelected}
                    disabled={loadingChats[selected.id]}
                  >
                    {loadingChats[selected.id] ? '⏳ Analyzing...' : '⚡ Analyze Chat'}
                  </button>
                </div>

                {loadingChats[selected.id] && (
                  <div className="loading-indicator">
                    <div className="spinner"></div>
                    <p>Analyzing chat...</p>
                  </div>
                )}

                {currentSummary && !loadingChats[selected.id] && (
                  <div className="summary-section">
                    {currentSummary.aiSummary && (
                      <div className="ai-summary-box">
                        <div className="summary-header">
                          <h4>🤖 AI Summary <span className="msg-count">({currentSummary.textMessages} msgs)</span></h4>
                          <button 
                            className="copy-summary-btn" 
                            onClick={() => copySummaryToClipboard(selected.id)}
                            title="Copy summary to clipboard"
                          >
                            {copyFeedback[selected.id] ? '✓ Copied!' : '📋 Copy'}
                          </button>
                        </div>
                        <div dangerouslySetInnerHTML={{ __html: formatAISummary(currentSummary.aiSummary) }} />
                      </div>
                    )}

                    <div className="stats-grid">
                      <div className="stat-card">
                        <div className="stat-label">📅 Period</div>
                        <div className="stat-value">
                          {currentSummary.dateRange
                            ? `${currentSummary.dateRange.oldest} - ${currentSummary.dateRange.newest}`
                            : 'N/A'}
                        </div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-label">💬 Messages</div>
                        <div className="stat-value">{currentSummary.textMessages}</div>
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: `${Math.min((currentSummary.textMessages / 100) * 100, 100)}%` }}></div>
                        </div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-label">👥 Participants</div>
                        <div className="stat-value">{Object.keys(currentSummary.participants || {}).length}</div>
                        <div className="progress-bar">
                          <div className="progress-fill purple" style={{ width: `${Math.min((Object.keys(currentSummary.participants || {}).length / 10) * 100, 100)}%` }}></div>
                        </div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-label">📈 Avg/Person</div>
                        <div className="stat-value">
                          {Math.round(currentSummary.textMessages / Math.max(Object.keys(currentSummary.participants || {}).length, 1))}
                        </div>
                      </div>
                    </div>

                    {currentSummary.participants && Object.keys(currentSummary.participants).length <= 20 && (
                      <div className="participants-section">
                        <h4>👥 Top Contributors</h4>
                        <div className="participants-list">
                          {Object.entries(currentSummary.participants)
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 8)
                            .map(([name, count]) => {
                              const maxCount = Math.max(...Object.values(currentSummary.participants))
                              const percentage = (count / maxCount) * 100
                              const isPhone = /^\d+$/.test(name) || /^[\d\s\-\+\(\)]+$/.test(name)
                              const displayName = isPhone && name.length > 8 ? '+' + name.replace(/\D/g, '') : name
                              
                              return (
                                <div key={name} className="participant-item">
                                  <div className="participant-info">
                                    <span className={isPhone ? 'phone-name' : ''}>{displayName}</span>
                                    <span className="msg-count">{count} msgs</span>
                                  </div>
                                  <div className="progress-bar">
                                    <div className="progress-fill gradient" style={{ width: `${percentage}%` }}></div>
                                  </div>
                                </div>
                              )
                            })}
                        </div>
                      </div>
                    )}

                    <div className="qa-section">
                      <h4>💬 Ask Questions</h4>
                      <p className="muted">Get precise answers about this conversation (2-4 sentences)</p>
                      
                      <div className="qa-input-row">
                        <textarea
                          placeholder="e.g., What were the main decisions? Who mentioned the deadline?"
                          value={question}
                          onChange={e => setQuestion(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                              e.preventDefault()
                              askQuestion()
                            }
                          }}
                          rows="2"
                        />
                        <button onClick={askQuestion} disabled={askingQuestion || !question.trim()}>
                          {askingQuestion ? '⏳ Asking...' : '🤖 Ask AI'}
                        </button>
                      </div>

                      <div className="qa-history">
                        {currentQA.map(qa => (
                          <div key={qa.id} className="qa-item">
                            <div className="qa-question-header">
                              <div className="qa-question">
                                ❓ {qa.question}
                              </div>
                              <button 
                                className="delete-qa-btn"
                                onClick={() => deleteQA(selected.id, qa.id)}
                                title="Delete this Q&A"
                              >
                                🗑️
                              </button>
                            </div>
                            <div className="qa-answer">
                              {qa.loading ? (
                                <div className="qa-loading">
                                  <div className="spinner-small"></div> Thinking...
                                </div>
                              ) : (
                                <>
                                  <div className="qa-meta">🤖 {qa.contextMessages || '?'} msgs:</div>
                                  <div dangerouslySetInnerHTML={{ __html: qa.answer?.replace(/\n/g, '<br>') }} />
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {!currentSummary && !loadingChats[selected.id] && (
                  <div className="empty-state">
                    <div className="empty-icon">📱</div>
                    <p>No summary yet</p>
                    <p className="muted">Click "Analyze Chat" above to generate</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">💬</div>
                <p>Select a chat to analyze</p>
                <p className="muted">Choose from the sidebar</p>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
