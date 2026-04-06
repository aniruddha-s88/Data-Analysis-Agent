import React, { useState } from "react";
import axios from "axios";

function Chat({ messages, setMessages, onFirstQuery, onMessageSent, onDashboardRequested, chatId }) {
  const [query, setQuery] = useState("");

  const sendQuery = async () => {
    if (!query.trim()) return;
    const res = await axios.get(
      `http://localhost:8000/ask/?query=${encodeURIComponent(query)}&chat_id=${encodeURIComponent(
        chatId || ""
      )}`
    );
    const next = [
      ...messages,
      { q: query, a: res.data.response, trace: res.data.trace || [] },
    ];
    if (messages.length === 0 && onFirstQuery) {
      onFirstQuery(query);
    }
    setMessages(next);
    if (onDashboardRequested) {
      onDashboardRequested(query);
    }
    if (onMessageSent) {
      onMessageSent();
    }
    setQuery("");
  };

  const downloadReport = async () => {
    const suffix = chatId ? `&chat_id=${encodeURIComponent(chatId)}` : "";
    window.open(`http://localhost:8000/report/?limit=20${suffix}`, "_blank");
  };

  const downloadDocx = async () => {
    const suffix = chatId ? `&chat_id=${encodeURIComponent(chatId)}` : "";
    window.open(`http://localhost:8000/report-docx/?limit=20${suffix}`, "_blank");
  };

  return (
    <section className="chat-shell">
      <div className="chat-header">
        <div>
          <h2 className="h4 fw-bold mb-1">Live Analyst Chat</h2>
          <p className="text-muted mb-0">
            Ask questions about your uploaded files and get concise insights.
          </p>
        </div>
        <span className="badge text-bg-dark">Agent Online</span>
      </div>

      <div className="chat-actions">
        <button className="btn btn-dark" onClick={downloadReport}>
          Download Report
        </button>
        <button className="btn btn-outline-dark" onClick={downloadDocx}>
          Download DOCX
        </button>
      </div>

      <div className="chat-body">
        {messages.length === 0 ? (
          <div className="empty-state">
            <div className="empty-title">No questions yet</div>
            <div className="empty-subtitle">
              Try: "Summarize Q1 revenue trends" or "List top 5 customers".
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className="message-group">
              <div className="message user">
                <div className="message-label">You</div>
                <div className="message-text">{msg.q}</div>
              </div>
              <div className="message bot">
                <div className="message-label">AI</div>
                <div className="message-text">{msg.a}</div>
                {msg.trace && msg.trace.length > 0 ? (
                  <div className="trace-block">
                    <div className="trace-title">Agent Trace</div>
                    <div className="trace-grid">
                      {msg.trace.map((step, idx) => (
                        <div key={idx} className="trace-card">
                          <div className="trace-tool">{step.tool}</div>
                          <div className="trace-args">
                            {JSON.stringify(step.args)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="chat-input">
        <div className="input-group">
          <input
            className="form-control"
            placeholder="Ask a question about your files..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") sendQuery();
            }}
          />
          <button className="btn btn-primary" onClick={sendQuery}>
            Send
          </button>
        </div>
      </div>
    </section>
  );
}

export default Chat;
