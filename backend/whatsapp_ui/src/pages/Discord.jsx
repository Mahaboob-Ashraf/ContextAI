import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function Discord() {
  const [botStatus, setBotStatus] = useState(null);
  const [guilds, setGuilds] = useState([]);
  const [selectedGuild, setSelectedGuild] = useState(null);
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [summaries, setSummaries] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [currentSummary, setCurrentSummary] = useState(null);
  const [question, setQuestion] = useState('');
  const [qaHistory, setQaHistory] = useState([]);
  const [isAsking, setIsAsking] = useState(false);

  // Analysis settings
  const [analysisDepth, setAnalysisDepth] = useState('moderate');
  const [messageLimit, setMessageLimit] = useState(100);

  useEffect(() => {
    loadBotStatus();
    loadGuilds();
    loadSummaries();
    const interval = setInterval(() => {
      loadGuilds();
      loadSummaries();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedGuild) {
      loadChannels(selectedGuild.id);
    }
  }, [selectedGuild]);

  // Load summary from localStorage when channel is selected
  useEffect(() => {
    if (selectedChannel && selectedGuild) {
      const storedSummaries = JSON.parse(localStorage.getItem('contextai_summaries') || '{}');
      
      // Find summary for this channel (match by channel name and guild name)
      const channelSummary = Object.values(storedSummaries).find(s => 
        s.source === 'discord' && 
        s.chatName === `#${selectedChannel.name} (${selectedGuild.name})`
      );
      
      if (channelSummary) {
        setCurrentSummary({
          id: channelSummary.chatId,
          summary: channelSummary.aiSummary,
          guildName: selectedGuild.name,
          channelName: selectedChannel.name,
        });
      } else {
        setCurrentSummary(null);
      }
      
      // Reset Q&A history when switching channels
      setQaHistory([]);
    }
  }, [selectedChannel, selectedGuild]);

  const loadBotStatus = async () => {
    try {
      const res = await axios.get('http://localhost:8004/api/status');
      setBotStatus(res.data);
    } catch (err) {
      console.error('Error loading bot status:', err);
    }
  };

  const loadGuilds = async () => {
    try {
      const res = await axios.get('http://localhost:8004/api/guilds');
      setGuilds(res.data.guilds || []);
    } catch (err) {
      console.error('Error loading guilds:', err);
    }
  };

  const loadChannels = async (guildId) => {
    try {
      const res = await axios.get(`http://localhost:8004/api/guilds/${guildId}/channels`);
      setChannels(res.data.channels || []);
    } catch (err) {
      console.error('Error loading channels:', err);
    }
  };

  const loadSummaries = async () => {
    try {
      const res = await axios.get('http://localhost:8004/api/summaries');
      setSummaries(res.data.summaries || []);
    } catch (err) {
      console.error('Error loading summaries:', err);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedGuild || !selectedChannel) {
      return;
    }

    setAnalyzing(true);
    try {
      const res = await axios.post('http://localhost:8004/api/analyze', {
        guildId: selectedGuild.id,
        channelId: selectedChannel.id,
        analysisDepth,
        messageLimit,
      });

      if (res.data.success) {
        const newSummary = {
          id: res.data.summaryId,
          summary: res.data.summary,
          guildName: selectedGuild.name,
          channelName: selectedChannel.name,
        };
        setCurrentSummary(newSummary);
        
        // Save to localStorage for Dashboard visibility
        const dashboardSummary = {
          chatId: res.data.summaryId,
          chatName: `#${selectedChannel.name} (${selectedGuild.name})`,
          isGroup: true,
          aiSummary: res.data.summary,
          textMessages: res.data.messageCount || messageLimit,
          participants: {},
          messages: [],
          source: 'discord',
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
    if (!currentSummary || !question.trim()) return;

    setIsAsking(true);
    try {
      const res = await axios.post('http://localhost:8004/api/qa', {
        summaryId: currentSummary.id,
        question,
        guildId: selectedGuild?.id,
        channelId: selectedChannel?.id,
      });

      if (res.data.success) {
        setQaHistory([...qaHistory, {
          question: res.data.question,
          answer: res.data.answer,
        }]);
        setQuestion('');
      }
    } catch (err) {
      console.error('Q&A error:', err);
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="page whatsapp discord-theme">
      {/* Status Bar (like WhatsApp) */}
      <div className="status-bar discord-status">
        <div className="status-left">
          <div className={`status-dot ${botStatus?.ready ? 'online' : 'offline'}`}></div>
          <span>{botStatus?.ready ? `✅ Discord Connected (${guilds.length} servers)` : '⏳ Connecting to Discord...'}</span>
        </div>
        {botStatus?.ready && (
          <div className="status-right">
            <div className="bot-info-compact">
              <img src={botStatus.user.avatar} alt="Bot" className="bot-avatar-small" />
              <span>{botStatus.user.username}</span>
            </div>
          </div>
        )}
      </div>

      {!botStatus || !botStatus.ready ? (
        <div className="loading-state">
          <div className="loading-spinner-container">
            <div className="spinner-large"></div>
            <div className="loading-dots">
              <span>.</span><span>.</span><span>.</span>
            </div>
          </div>
          <p className="loading-text">Connecting to Discord Bot</p>
          <p className="muted-small">Initializing Discord.js gateway...</p>
        </div>
      ) : (
        <div className="layout">
          {/* Left Sidebar - Server & Channel List (like WhatsApp chat list) */}
          <aside className="left discord-sidebar-main">
            <div className="sidebar-header">
              <h3>🎮 Servers</h3>
              <button className="icon-btn" onClick={loadGuilds} title="Refresh">🔄</button>
            </div>

            {/* Server List */}
            <div className="chat-list">
              {guilds.length === 0 ? (
                <div className="empty">
                  <p>No servers found</p>
                  <p className="muted">Invite the bot to a server</p>
                </div>
              ) : (
                guilds.map(guild => (
                  <div
                    key={guild.id}
                    className={`chat-item ${selectedGuild?.id === guild.id ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedGuild(guild);
                      setSelectedChannel(null);
                      setCurrentSummary(null);
                      setQaHistory([]);
                    }}
                  >
                    <div className="chat-icon">
                      {guild.icon ? (
                        <img src={guild.icon} alt={guild.name} className="guild-icon-img" />
                      ) : (
                        <div className="guild-icon-fallback">{guild.name.substring(0, 2).toUpperCase()}</div>
                      )}
                    </div>
                    <div className="chat-info">
                      <div className="name">{guild.name}</div>
                      <div className="meta">👥 {guild.memberCount.toLocaleString()} members</div>
                    </div>
                    {selectedGuild?.id === guild.id && <div className="summary-ready-dot"></div>}
                  </div>
                ))
              )}
            </div>

            {/* Channel List - Shows when server selected */}
            {selectedGuild && (
              <>
                <div className="sidebar-header" style={{ marginTop: '20px' }}>
                  <h3># Channels</h3>
                  <span className="muted">{channels.length}</span>
                </div>
                <div className="chat-list">
                  {channels.length === 0 ? (
                    <div className="empty">No accessible channels</div>
                  ) : (
                    channels.map(channel => (
                      <div
                        key={channel.id}
                        className={`chat-item compact ${selectedChannel?.id === channel.id ? 'selected' : ''}`}
                        onClick={() => {
                          setSelectedChannel(channel);
                          setCurrentSummary(null);
                          setQaHistory([]);
                        }}
                      >
                        <div className="chat-icon channel-icon">#</div>
                        <div className="chat-info">
                          <div className="name">{channel.name}</div>
                        </div>
                        {selectedChannel?.id === channel.id && <div className="summary-ready-dot"></div>}
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </aside>

          {/* Right Section - Analysis Panel (like WhatsApp chat content) */}
          <section className="right">
            {selectedChannel ? (
              <div className="chat-content">
                {/* Chat Header */}
                <div className="chat-header">
                  <h3>#{selectedChannel.name}</h3>
                  <span className="meta">📡 {selectedGuild.name} • 👥 {selectedGuild.memberCount.toLocaleString()} members</span>
                </div>

                {/* Analysis Controls (like WhatsApp analyze controls) */}
                <div className="analyze-controls">
                  <label className="limit-label">
                    📊 Analysis Depth:
                    <select value={analysisDepth} onChange={e => setAnalysisDepth(e.target.value)}>
                      <option value="moderate">✨ Moderate (Fast)</option>
                      <option value="deep">🔬 Deep Research</option>
                    </select>
                  </label>
                  
                  <label className="limit-label">
                    📝 Message Limit:
                    <select value={messageLimit} onChange={e => setMessageLimit(parseInt(e.target.value))}>
                      <option value="50">⚡ 50 (Quick)</option>
                      <option value="100">✨ 100 (Standard)</option>
                      <option value="200">🔍 200 (Extended)</option>
                      <option value="500">📈 500 (Full)</option>
                    </select>
                  </label>
                  
                  <button
                    className="analyze-btn"
                    onClick={handleAnalyze}
                    disabled={analyzing}
                  >
                    {analyzing ? '⏳ Analyzing...' : '⚡ Analyze Channel'}
                  </button>
                </div>

                {/* Loading State */}
                {analyzing && (
                  <div className="loading-indicator">
                    <div className="spinner"></div>
                    <p>Analyzing channel...</p>
                  </div>
                )}

                {/* Summary Display (like WhatsApp summary section) */}
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

                    {/* Q&A Section (like WhatsApp) */}
                    <div className="qa-section">
                      <h4>💬 Ask Questions</h4>
                      <p className="muted">Get precise answers about this channel</p>
                      
                      <div className="qa-input-row">
                        <textarea
                          placeholder="e.g., What were the main action items? Who was most active?"
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
                        {qaHistory.map((qa, i) => (
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

                {/* Empty State (like WhatsApp) */}
                {!currentSummary && !analyzing && (
                  <div className="empty-state">
                    <div className="empty-icon">🎮</div>
                    <p>No summary yet</p>
                    <p className="muted">Click "Analyze Channel" above to generate AI insights</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">💬</div>
                <p>Select a channel to analyze</p>
                <p className="muted">{selectedGuild ? 'Choose a channel from the sidebar' : 'First select a server, then choose a channel'}</p>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
