import React, { useState, useEffect, useRef } from "react";
import {
  Send,
  Sparkles,
  FolderGit2,
  Plus,
  Terminal,
  Code2,
  Trash2,
  Cpu,
  Bot,
  Copy,
  Check,
  ExternalLink,
  Layers,
  FileCode,
  ShieldCheck,
  ChevronDown,
  X,
  Maximize2,
  AlertCircle,
  HelpCircle,
  Hash
} from "lucide-react";
import { chatApi, repositoryApi } from "../services/api";
import { useAuth } from "../context/AuthContext";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";

const QUICK_PROMPTS = [
  "Where is authentication implemented?",
  "Which files handle database access?",
  "Explain the request flow.",
  "How does the payment flow work?",
  "Where should I add a new API endpoint?"
];

// Helper to format assistant markdown text with code snippets and file links
function FormattedAssistantMessage({ text, onInspectSource }) {
  // Split message by code blocks ```...```
  const parts = text.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-3 leading-relaxed text-xs font-mono">
      {parts.map((part, idx) => {
        if (part.startsWith("```")) {
          const lines = part.slice(3, -3).trim().split("\n");
          let language = "code";
          let codeContent = part.slice(3, -3).trim();

          if (lines.length > 0 && /^[a-zA-Z0-9_\-]+$/.test(lines[0].trim())) {
            language = lines[0].trim();
            codeContent = lines.slice(1).join("\n");
          }

          return (
            <CodeBlockRenderer
              key={idx}
              code={codeContent}
              language={language}
            />
          );
        }

        // Standard text lines
        const paragraphs = part.split("\n\n");
        return (
          <div key={idx} className="space-y-2">
            {paragraphs.map((p, pIdx) => {
              if (!p.trim()) return null;

              // Check if line is a header
              if (p.startsWith("### ")) {
                return (
                  <h4 key={pIdx} className="text-sm font-bold text-white pt-1 text-sky-300">
                    {p.replace("### ", "")}
                  </h4>
                );
              }

              // Check if bullet point list
              if (p.includes("\n- ") || p.startsWith("- ") || p.startsWith("1. ")) {
                const items = p.split("\n");
                return (
                  <ul key={pIdx} className="space-y-1.5 pl-2">
                    {items.map((it, itIdx) => {
                      const cleanItem = it.replace(/^[-*]\s+|\d+\.\s+/, "");
                      return (
                        <li key={itIdx} className="flex items-start gap-2 text-slate-300">
                          <span className="text-sky-400 mt-0.5">&bull;</span>
                          <span className="flex-1">{renderInlineLinks(cleanItem, onInspectSource)}</span>
                        </li>
                      );
                    })}
                  </ul>
                );
              }

              return (
                <p key={pIdx} className="text-slate-300 whitespace-pre-wrap">
                  {renderInlineLinks(p, onInspectSource)}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// Highlight and make file references clickable e.g. [server/src/routes/authRoutes.js:12]
function renderInlineLinks(text, onInspectSource) {
  const parts = text.split(/(\[[a-zA-Z0-9_\-./]+(?::\d+(?:-\d+)?)?\])/g);
  return parts.map((seg, i) => {
    if (seg.startsWith("[") && seg.endsWith("]")) {
      const pathWithLine = seg.slice(1, -1);
      return (
        <button
          key={i}
          onClick={() => onInspectSource?.({ filePath: pathWithLine })}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-sky-500/10 border border-sky-500/30 text-sky-300 hover:text-white hover:bg-sky-500/20 font-semibold transition-colors mx-0.5"
          title="Click to view file context"
        >
          <FileCode className="w-3 h-3" />
          <span>{pathWithLine}</span>
        </button>
      );
    }
    return seg;
  });
}

// Syntax-styled code block with copy button
function CodeBlockRenderer({ code, language }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-[#070A0F] overflow-hidden my-3">
      <div className="px-4 py-2 bg-[#0C101A] border-b border-slate-800/80 flex items-center justify-between">
        <span className="text-[11px] font-mono uppercase text-sky-400 font-semibold">
          {language}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400 hover:text-white transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? "Copied!" : "Copy Code"}</span>
        </button>
      </div>
      <pre className="p-4 text-xs font-mono text-emerald-300/90 overflow-x-auto leading-relaxed">
        {code}
      </pre>
    </div>
  );
}

export default function ChatPage() {
  const { activeRepo } = useAuth();
  const [repositories, setRepositories] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState(null);
  const [inspectedReference, setInspectedReference] = useState(null);
  const [conversationId, setConversationId] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Load repositories and initial chat history
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const repoRes = await repositoryApi.getAll();
        if (repoRes.repositories && repoRes.repositories.length > 0) {
          setRepositories(repoRes.repositories);
          const current = repoRes.repositories.find((r) => r.name === activeRepo) || repoRes.repositories[0];
          setSelectedRepo(current);
          await loadHistory(current._id);
        }
      } catch (err) {
        setError("Failed to load repository workspace.");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [activeRepo]);

  // Load chat history for repository
  const loadHistory = async (repoId) => {
    if (!repoId) return;
    try {
      const res = await chatApi.getHistory(repoId);
      if (res.success && res.messages && res.messages.length > 0) {
        setMessages(res.messages);
        setConversationId(res.conversationId);
      } else {
        // Welcome message
        setMessages([
          {
            id: "welcome",
            role: "assistant",
            content: `### Devra Code Intelligence Ready

I have indexed the codebase for **${selectedRepo?.name || "your repository"}**. 
You can ask architectural questions, trace data pipelines, inspect security implementations, or query file locations.

Try one of the quick suggestions below or type your inquiry.`,
            sourceReferences: []
          }
        ]);
      }
    } catch (err) {
      console.warn("Could not load history:", err.message);
    }
  };

  // Handle repository switch
  const handleSelectRepository = async (repo) => {
    setSelectedRepo(repo);
    setMessages([]);
    await loadHistory(repo._id);
  };

  // Clear conversation history
  const handleClearHistory = async () => {
    if (!selectedRepo?._id) return;
    if (!window.confirm(`Clear chat conversation for ${selectedRepo.name}?`)) return;

    try {
      await chatApi.clearHistory(selectedRepo._id);
      setMessages([
        {
          id: "welcome-reset",
          role: "assistant",
          content: `Conversation history cleared for **${selectedRepo.name}**. What would you like to investigate?`,
          sourceReferences: []
        }
      ]);
      setConversationId(null);
    } catch (err) {
      setError("Failed to clear chat history.");
    }
  };

  // Send message to Codebase Chat
  const handleSend = async (customPrompt) => {
    const textToSend = customPrompt || inputText;
    if (!textToSend.trim() || !selectedRepo?._id || isTyping) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: textToSend,
      sourceReferences: []
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsTyping(true);
    setError(null);

    try {
      const res = await chatApi.sendMessage({
        repositoryId: selectedRepo._id,
        message: textToSend,
        conversationId
      });

      if (res.success && res.message) {
        setMessages((prev) => [...prev, res.message]);
        if (res.conversationId) setConversationId(res.conversationId);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to get AI answer.");
    } finally {
      setIsTyping(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col md:flex-row overflow-hidden bg-[#080B11]">
      {/* LEFT SIDEBAR: Codebase Workspaces & RAG Telemetry */}
      <aside className="w-full md:w-72 bg-[#090D15] border-r border-slate-800/80 p-4 flex flex-col justify-between shrink-0">
        <div className="space-y-5">
          {/* Active Workspace Header */}
          <div className="space-y-2">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">
              Active Repository Workspace
            </span>
            <div className="relative">
              <select
                value={selectedRepo?._id || ""}
                onChange={(e) => {
                  const r = repositories.find((x) => x._id === e.target.value);
                  if (r) handleSelectRepository(r);
                }}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-white focus:outline-none focus:border-sky-500 appearance-none pr-8 cursor-pointer"
              >
                {repositories.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.name} ({r.language})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
            </div>
          </div>

          {/* RAG Telemetry Card */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2.5 font-mono text-xs">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-sky-400" />
                <span>RAG Retrieval</span>
              </span>
              <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Ready
              </span>
            </div>

            <div className="divide-y divide-slate-800/60 text-[10px] text-slate-400">
              <div className="py-1.5 flex items-center justify-between">
                <span>Vector Dimension:</span>
                <span className="text-slate-200">128-d L2</span>
              </div>
              <div className="py-1.5 flex items-center justify-between">
                <span>Retrieval Mode:</span>
                <span className="text-sky-300">Semantic Cosine</span>
              </div>
              <div className="py-1.5 flex items-center justify-between">
                <span>Context Filter:</span>
                <span className="text-slate-200">Top-4 Chunks</span>
              </div>
            </div>
          </div>

          {/* Prompt Bank Shortcuts */}
          <div className="space-y-2 font-mono">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
              Architectural Queries
            </span>
            <div className="space-y-1.5">
              {QUICK_PROMPTS.slice(0, 3).map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(prompt)}
                  className="w-full text-left p-2.5 rounded-lg bg-slate-900/40 hover:bg-slate-800/80 border border-slate-800/60 text-[11px] text-slate-300 hover:text-white transition-colors truncate block"
                >
                  &rarr; {prompt}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="pt-4 border-t border-slate-800/80 space-y-2">
          <Button
            onClick={handleClearHistory}
            variant="outline"
            size="sm"
            className="w-full"
            icon={Trash2}
          >
            Clear Conversation
          </Button>
          <div className="text-[10px] font-mono text-slate-500 text-center">
            Devra v2.4 &bull; Codebase RAG
          </div>
        </div>
      </aside>

      {/* MAIN CHAT WORKSPACE */}
      <main className="flex-1 flex flex-col justify-between overflow-hidden bg-[#0A0E17]">
        {/* Workspace Top Header */}
        <div className="h-14 border-b border-slate-800/80 px-6 flex items-center justify-between bg-[#0B0F17] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold text-white font-mono tracking-wide">
                  Codebase Knowledge Assistant
                </h2>
                <Badge variant="cyan" size="sm">Semantic Vector Index</Badge>
              </div>
              <p className="text-[10px] font-mono text-slate-400">
                Scope: <span className="text-sky-300 font-semibold">{selectedRepo?.name}</span> &bull; Citations Enabled
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleClearHistory}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 transition-colors"
              title="Clear Thread"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages Stream Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-mono text-rose-400 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                {error}
              </span>
              <button onClick={() => setError(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
          )}

          {messages.map((msg, idx) => {
            const isUser = msg.role === "user";
            return (
              <div
                key={msg.id || idx}
                className={`flex gap-3 max-w-4xl ${
                  isUser ? "ml-auto flex-row-reverse" : "mr-auto"
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                    isUser
                      ? "bg-sky-500 text-white font-mono"
                      : "bg-[#0F1422] border border-slate-700 text-sky-400"
                  }`}
                >
                  {isUser ? "You" : <Cpu className="w-4 h-4" />}
                </div>

                {/* Message Bubble Container */}
                <div className="space-y-2 max-w-2xl sm:max-w-3xl">
                  <div
                    className={`p-5 rounded-2xl text-xs leading-relaxed ${
                      isUser
                        ? "bg-sky-600 text-white font-mono shadow-md"
                        : "bg-[#0D121F] border border-slate-800 text-slate-200 shadow-xl"
                    }`}
                  >
                    {isUser ? (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      <FormattedAssistantMessage
                        text={msg.content}
                        onInspectSource={(ref) => setInspectedReference(ref)}
                      />
                    )}
                  </div>

                  {/* Source References Citations Bar (When available) */}
                  {!isUser && msg.sourceReferences && msg.sourceReferences.length > 0 && (
                    <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                        <span className="flex items-center gap-1.5 text-sky-400 font-semibold">
                          <FileCode className="w-3.5 h-3.5" />
                          <span>Retrieved Source Citations ({msg.sourceReferences.length})</span>
                        </span>
                        <span>Zero Blind Sending</span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {msg.sourceReferences.map((ref, rIdx) => (
                          <button
                            key={rIdx}
                            onClick={() => setInspectedReference(ref)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-sky-500/50 text-[11px] font-mono text-slate-300 transition-colors group"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            <span className="group-hover:text-sky-300 font-medium">
                              {ref.fileName}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              (L{ref.lineRange})
                            </span>
                            <span className="text-[10px] text-sky-400 font-bold ml-1">
                              {ref.relevanceScore}% match
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <span className="text-[10px] font-mono text-slate-500 block px-1">
                    {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Just now"}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Real-time typing / AST traversal state */}
          {isTyping && (
            <div className="flex items-center gap-3 text-xs font-mono text-sky-400 pl-11">
              <div className="w-2 h-2 rounded-full bg-sky-400 animate-ping"></div>
              <span>Traversing AST &amp; calculating semantic vector similarity...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* BOTTOM INPUT DOCK & PROMPT PILLS */}
        <div className="p-4 border-t border-slate-800 bg-[#0B0F17] space-y-3 shrink-0">
          {/* Quick Prompts Row */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <span className="text-[10px] font-mono text-slate-500 uppercase shrink-0">
              Suggestions:
            </span>
            {QUICK_PROMPTS.map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSend(prompt)}
                disabled={isTyping}
                className="px-2.5 py-1 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white whitespace-nowrap text-[11px] font-mono transition-colors disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-end gap-2.5"
          >
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                rows={2}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={`Ask anything about ${selectedRepo?.name || "the codebase"}... (Press Enter to send, Shift+Enter for new line)`}
                className="w-full px-4 py-2.5 rounded-xl bg-[#080B11] border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono resize-none leading-relaxed"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={!inputText.trim() || isTyping}
              icon={Send}
              className="h-11 px-5"
            >
              Send
            </Button>
          </form>

          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 px-1">
            <span>Devra RAG &bull; Never sends full repository blindly &bull; Grounded in verified source chunks</span>
            <span>Enter to Send</span>
          </div>
        </div>
      </main>

      {/* INSPECTED SOURCE REFERENCE MODAL */}
      {inspectedReference && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0C101A] border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden shadow-2xl font-mono">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#080C14]">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-bold text-white">
                  {inspectedReference.filePath || inspectedReference.fileName}
                </span>
                {inspectedReference.lineRange && (
                  <Badge variant="cyan" size="sm">Lines {inspectedReference.lineRange}</Badge>
                )}
                {inspectedReference.relevanceScore && (
                  <Badge variant="emerald" size="sm">{inspectedReference.relevanceScore}% Match</Badge>
                )}
              </div>
              <button
                onClick={() => setInspectedReference(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Code Body */}
            <div className="p-4 overflow-y-auto flex-1 bg-[#06080E]">
              <pre className="text-xs text-emerald-300 leading-relaxed overflow-x-auto whitespace-pre">
                {inspectedReference.snippet || "// Source context ready"}
              </pre>
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-slate-800 bg-[#080C14] flex items-center justify-between text-xs">
              <span className="text-slate-500 text-[10px]">
                Ground truth context retrieved via semantic vector similarity
              </span>
              <Button
                onClick={() => setInspectedReference(null)}
                variant="secondary"
                size="sm"
              >
                Close Inspector
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
