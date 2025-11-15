import React from 'react'

export default function About(){
  return (
    <div className="page about">
      <h2>📚 About ContextAI</h2>
      
      <section className="about-section">
        <h3>🎯 What is ContextAI?</h3>
        <p>
          ContextAI is an intelligent chat analysis platform that transforms your WhatsApp conversations 
          into actionable insights. Using advanced AI technology, we summarize lengthy chat histories, 
          extract key information, analyze participant behavior, and provide interactive Q&A capabilities.
        </p>
      </section>

      <section className="about-section">
        <h3>✨ Features</h3>
        <ul className="feature-list">
          <li>🤖 <strong>AI-Powered Summarization</strong> - Get concise summaries of your chat history</li>
          <li>📊 <strong>Advanced Analytics</strong> - Track message counts, participation stats, and engagement patterns</li>
          <li>💬 <strong>Interactive Q&A</strong> - Ask questions about your conversations and get instant answers</li>
          <li>🔍 <strong>Smart Search</strong> - Find and filter chats across your entire message history</li>
          <li>📈 <strong>Visual Insights</strong> - Beautiful charts and progress bars for data visualization</li>
          <li>💾 <strong>Local Caching</strong> - Fast access to previously analyzed chats</li>
        </ul>
      </section>

      <section className="about-section">
        <h3>🛠️ Technology Stack</h3>
        <div className="tech-grid">
          <div className="tech-item">
            <div className="tech-icon">⚛️</div>
            <div className="tech-name">React 18</div>
            <div className="tech-desc">Modern UI framework</div>
          </div>
          <div className="tech-item">
            <div className="tech-icon">⚡</div>
            <div className="tech-name">Vite</div>
            <div className="tech-desc">Lightning-fast build tool</div>
          </div>
          <div className="tech-item">
            <div className="tech-icon">🤖</div>
            <div className="tech-name">Gemini AI</div>
            <div className="tech-desc">Google's advanced AI model</div>
          </div>
          <div className="tech-item">
            <div className="tech-icon">💬</div>
            <div className="tech-name">WhatsApp Web.js</div>
            <div className="tech-desc">WhatsApp integration</div>
          </div>
          <div className="tech-item">
            <div className="tech-icon">🎨</div>
            <div className="tech-name">Custom CSS</div>
            <div className="tech-desc">Glassmorphism & animations</div>
          </div>
          <div className="tech-item">
            <div className="tech-icon">🔧</div>
            <div className="tech-name">Node.js + Express</div>
            <div className="tech-desc">Backend API server</div>
          </div>
        </div>
      </section>

      <section className="about-section">
        <h3>🔌 Backend API Endpoints</h3>
        <div className="api-list">
          <div className="api-item">
            <code className="api-method">GET</code>
            <code className="api-path">/api/status</code>
            <span className="api-desc">WhatsApp connection status</span>
          </div>
          <div className="api-item">
            <code className="api-method">GET</code>
            <code className="api-path">/api/qr</code>
            <span className="api-desc">QR code for authentication</span>
          </div>
          <div className="api-item">
            <code className="api-method">GET</code>
            <code className="api-path">/api/chats</code>
            <span className="api-desc">List of WhatsApp chats</span>
          </div>
          <div className="api-item">
            <code className="api-method">POST</code>
            <code className="api-path">/api/messages</code>
            <span className="api-desc">Generate AI summary for chat</span>
          </div>
          <div className="api-item">
            <code className="api-method">POST</code>
            <code className="api-path">/api/chat-qa</code>
            <span className="api-desc">Ask questions about chat</span>
          </div>
          <div className="api-item">
            <code className="api-method">POST</code>
            <code className="api-path">/api/logout</code>
            <span className="api-desc">Logout from WhatsApp</span>
          </div>
        </div>
      </section>

      <section className="about-section">
        <h3>👥 Team Gear5</h3>
        <p className="team-intro">
          ContextAI is proudly developed by Team Gear5 from <strong>Neil Gogte Institute of Technology</strong>.
        </p>
        <div className="team-grid">
          <div className="team-member">
            <div className="member-icon">👨‍💻</div>
            <div className="member-name">Arshlaan</div>
            <div className="member-role">Developer</div>
          </div>
          <div className="team-member">
            <div className="member-icon">👨‍💻</div>
            <div className="member-name">Harsha</div>
            <div className="member-role">Developer</div>
          </div>
          <div className="team-member">
            <div className="member-icon">👨‍💻</div>
            <div className="member-name">Ashraf</div>
            <div className="member-role">Developer</div>
          </div>
          <div className="team-member">
            <div className="member-icon">👨‍💻</div>
            <div className="member-name">Prajith</div>
            <div className="member-role">Developer</div>
          </div>
        </div>
      </section>

      <section className="about-section">
        <h3>🎨 Design Philosophy</h3>
        <p>
          ContextAI features a retro-futuristic design with <strong>"Press Start 2P"</strong> pixel font 
          and glassmorphism effects. The purple-gold gradient theme creates a modern yet nostalgic aesthetic, 
          perfect for a hackathon project that stands out.
        </p>
      </section>

      <footer className="about-footer">
        <p>Crafted with ❤️ by Team Gear5</p>
        <p className="muted">Neil Gogte Institute of Technology • 2025</p>
      </footer>
    </div>
  )
}
