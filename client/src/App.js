import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import "./App.css";
import Chat from "./pages/Chat";
import Upload from "./pages/Upload";
import Dashboard from "./pages/Dashboard";

function App() {
  const [chats, setChats] = useState(() => {
    const saved = localStorage.getItem("biz_agent_chats");
    if (saved) return JSON.parse(saved);
    return [
      {
        id: "chat-1",
        title: "New Chat",
        messages: [],
        dashboard: null,
        datasetName: null,
        dashboardRequested: false,
        updatedAt: Date.now(),
      },
    ];
  });
  const [activeChatId, setActiveChatId] = useState(() => {
    const saved = localStorage.getItem("biz_agent_active");
    return saved || "chat-1";
  });

  useEffect(() => {
    localStorage.setItem("biz_agent_chats", JSON.stringify(chats));
    localStorage.setItem("biz_agent_active", activeChatId);
  }, [chats, activeChatId]);

  const activeChat = useMemo(
    () => chats.find((c) => c.id === activeChatId) || chats[0],
    [chats, activeChatId]
  );

  const updateActiveChat = (nextMessages) => {
    setChats((prev) =>
      prev.map((c) =>
        c.id === activeChat.id
          ? { ...c, messages: nextMessages, updatedAt: Date.now() }
          : c
      )
    );
  };

  const startNewChat = () => {
    const id = `chat-${Date.now()}`;
    const fresh = {
      id,
      title: "New Chat",
      messages: [],
      dashboard: null,
      datasetName: null,
      dashboardRequested: false,
      updatedAt: Date.now(),
    };
    setChats((prev) => [fresh, ...prev]);
    setActiveChatId(id);
  };

  const selectChat = (id) => setActiveChatId(id);

  const renameChat = (id, title) => {
    setChats((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title } : c))
    );
  };

  const deleteChat = (id) => {
    setChats((prev) => {
      const next = prev.filter((c) => c.id !== id);
      if (next.length === 0) {
        const fallback = {
          id: `chat-${Date.now()}`,
          title: "New Chat",
          messages: [],
          dashboard: null,
          updatedAt: Date.now(),
        };
        setActiveChatId(fallback.id);
        return [fallback];
      }
      if (activeChatId === id) {
        setActiveChatId(next[0].id);
      }
      return next;
    });
  };

  const renameChatIfNeeded = (firstQuery) => {
    setChats((prev) =>
      prev.map((c) => {
        if (c.id !== activeChat.id) return c;
        if (c.title !== "New Chat") return c;
        return { ...c, title: firstQuery.slice(0, 32) };
      })
    );
  };

  const refreshDashboardForActive = async () => {
    if (!activeChat?.datasetName || !activeChat?.dashboardRequested) {
      setChats((prev) =>
        prev.map((c) =>
          c.id === activeChat.id
            ? { ...c, dashboard: null, updatedAt: Date.now() }
            : c
        )
      );
      return;
    }
    try {
      const res = await axios.get(
        `http://localhost:8000/dashboard-data/?chat_id=${encodeURIComponent(
          activeChat.id
        )}`
      );
      setChats((prev) =>
        prev.map((c) =>
          c.id === activeChat.id
            ? { ...c, dashboard: res.data, updatedAt: Date.now() }
            : c
        )
      );
    } catch (err) {
      setChats((prev) =>
        prev.map((c) =>
          c.id === activeChat.id
            ? { ...c, dashboard: null, updatedAt: Date.now() }
            : c
        )
      );
    }
  };

  const handleUpload = ({ filename }) => {
    setChats((prev) =>
      prev.map((c) =>
        c.id === activeChat.id
          ? {
              ...c,
              datasetName: filename || "Dataset",
              updatedAt: Date.now(),
            }
          : c
      )
    );
    refreshDashboardForActive();
  };

  const handleDashboardRequested = (query) => {
    const wantsDashboard = /dashboard|report|overview/i.test(query);
    if (!wantsDashboard) return;
    setChats((prev) =>
      prev.map((c) =>
        c.id === activeChat.id
          ? { ...c, dashboardRequested: true, updatedAt: Date.now() }
          : c
      )
    );
  };

  const loadHistoryForActive = async () => {
    const res = await axios.get("http://localhost:8000/history/?limit=50");
    const history = res.data.messages || [];
    const grouped = [];
    for (let i = 0; i < history.length; i += 2) {
      const user = history[i];
      const assistant = history[i + 1];
      if (user && assistant) {
        grouped.push({ q: user.content, a: assistant.content });
      }
    }
    setChats((prev) =>
      prev.map((c) =>
        c.id === activeChat.id
          ? { ...c, messages: grouped, updatedAt: Date.now() }
          : c
      )
    );
  };

  const formatUpdatedAt = (ts) => {
    if (!ts) return "";
    const date = new Date(ts);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfThat = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.round(
      (startOfToday - startOfThat) / (1000 * 60 * 60 * 24)
    );
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  return (
    <div className="app-shell">
      <div className="bg-orb orb-one" />
      <div className="bg-orb orb-two" />
      <div className="layout">
        <aside className="sidebar">
          <div className="sidebar-brand">Business AI Agent</div>
          <button className="btn btn-dark w-100" onClick={startNewChat}>
            New Chat
          </button>
          <button className="btn btn-outline-light w-100" onClick={loadHistoryForActive}>
            Load History
          </button>
          <button className="btn btn-outline-light w-100" onClick={refreshDashboardForActive}>
            Refresh Dashboard
          </button>
          <div className="sidebar-section">Chats</div>
          <div className="chat-list">
            {chats.map((chat) => (
              <div
                key={chat.id}
                className={`chat-pill ${
                  chat.id === activeChatId ? "active" : ""
                }`}
              >
                <button
                  className="chat-pill-main"
                  onClick={() => selectChat(chat.id)}
                >
                  <div className="chat-pill-title">{chat.title}</div>
                  <div className="chat-pill-meta">{formatUpdatedAt(chat.updatedAt)}</div>
                  {chat.datasetName ? (
                    <div className="chat-pill-badge">
                      Dataset: {chat.datasetName}
                    </div>
                  ) : null}
                </button>
                <div className="chat-pill-actions">
                  <button
                    className="chat-pill-action"
                    onClick={() => {
                      const next = window.prompt("Rename chat", chat.title);
                      if (next) renameChat(chat.id, next);
                    }}
                    title="Rename chat"
                  >
                    Rename
                  </button>
                  <button
                    className="chat-pill-action danger"
                    onClick={() => deleteChat(chat.id)}
                    title="Delete chat"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <div className="main-panel">
          <header className="hero">
            <div className="container hero-inner">
          <div className="hero-copy">
            <span className="badge hero-badge">Business AI Agent</span>
            <h1 className="display-5 fw-bold mb-3">
              Your executive analyst, on demand.
            </h1>
            <p className="lead text-muted mb-4">
              Upload business files, activate the agent, and receive polished
              reports and instant answers with professional clarity.
            </p>
            <div className="hero-actions">
              <div className="action-chip">Agentic Workflow</div>
              <div className="action-chip">Gemini + LangChain</div>
              <div className="action-chip">Chroma Vector DB</div>
            </div>
            <div className="hero-metrics">
              <div className="metric-card">
                <div className="metric-title">Data Sources</div>
                <div className="metric-value">CSV + PDF</div>
              </div>
              <div className="metric-card">
                <div className="metric-title">Response Time</div>
                <div className="metric-value">Seconds</div>
              </div>
              <div className="metric-card">
                <div className="metric-title">Security</div>
                <div className="metric-value">Local First</div>
              </div>
            </div>
          </div>
          <div className="hero-panel">
            <Upload chatId={activeChatId} onUploaded={handleUpload} />
          </div>
            </div>
          </header>
          <main className="container content-stack">
            <div className="section-intro">
              <div className="section-pill">Live Operations</div>
              <h2>Command the agent in real time</h2>
              <p>
                Every answer comes with traceable tool calls and export-ready
                reports for leadership reviews.
              </p>
            </div>
            <Dashboard
              data={activeChat?.dashboard}
              required={Boolean(activeChat?.datasetName)}
              requested={Boolean(activeChat?.dashboardRequested)}
            />
            <Chat
              messages={activeChat?.messages || []}
              setMessages={updateActiveChat}
              onFirstQuery={renameChatIfNeeded}
              onMessageSent={refreshDashboardForActive}
              onDashboardRequested={handleDashboardRequested}
              chatId={activeChatId}
            />
          </main>
        </div>
      </div>
    </div>
  );
}

export default App;
