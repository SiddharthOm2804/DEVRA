import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Copy,
  Check,
  Search,
  ChevronUp,
  ChevronDown,
  X,
  Maximize2,
  Minimize2,
  FileCode,
  AlertCircle,
  FileQuestion,
  RefreshCw,
  Hash,
  ArrowRight
} from "lucide-react";
import Badge from "./Badge";

/**
 * Lightweight, regex-based syntax tokenization for JavaScript, TypeScript, Python, Go, Rust, HTML, CSS, JSON, Markdown, YAML
 * Retains zero extra bundle overhead while delivering authentic code-editor aesthetics.
 */
function tokenizeLine(line, ext = "") {
  if (!line) return [{ type: "plain", text: "" }];

  const tokens = [];
  let remaining = line;

  // Specific common patterns
  const patterns = [
    // Comments
    { type: "comment", regex: /^(\/\/.*|#.*|\/\*.*?\*\/|<!--.*?-->)/ },
    // Strings
    { type: "string", regex: /^("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)/ },
    // Keywords
    {
      type: "keyword",
      regex: /^(import|export|default|from|function|return|const|let|var|if|else|switch|case|break|continue|for|while|do|async|await|try|catch|finally|throw|class|extends|new|this|typeof|instanceof|interface|type|enum|implements|public|private|protected|static|readonly|as|package|struct|func|def|self|yield|match|fn|mut|pub|use|crate|mod|where|impl)\b/
    },
    // Booleans / null / undefined
    { type: "boolean", regex: /^(true|false|null|undefined|nil|None|True|False)\b/ },
    // Numbers
    { type: "number", regex: /^(0x[0-9a-fA-F]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b/ },
    // JSX / HTML tags
    { type: "tag", regex: /^(<\/?[a-zA-Z0-9_\-\.:]+|\/?>)/ },
    // Function calls
    { type: "function", regex: /^([a-zA-Z_$][a-zA-Z0-9_$]*)(?=\s*\()/ },
    // Punctuation / Operators
    { type: "operator", regex: /^(=>|===|!==|==|!=|<=|>=|&&|\|\||\+\+|--|[+\-*/%=&|^!~?:<>])/ },
    { type: "punctuation", regex: /^([{}()\[\],;.])/ },
    // Plain identifiers / whitespace
    { type: "plain", regex: /^([a-zA-Z_$][a-zA-Z0-9_$]*|[^\s\w"'`#\/<>{}\(\)\[\],;.=+\-*%&|^!~?:]+|\s+)/ }
  ];

  while (remaining.length > 0) {
    let matched = false;
    for (const { type, regex } of patterns) {
      const match = remaining.match(regex);
      if (match && match[0].length > 0) {
        tokens.push({ type, text: match[0] });
        remaining = remaining.slice(match[0].length);
        matched = true;
        break;
      }
    }
    if (!matched) {
      tokens.push({ type: "plain", text: remaining[0] });
      remaining = remaining.slice(1);
    }
  }

  return tokens;
}

const TOKEN_COLOR_MAP = {
  comment: "text-slate-500 italic",
  string: "text-emerald-300",
  keyword: "text-purple-400 font-semibold",
  boolean: "text-amber-400 font-medium",
  number: "text-amber-300",
  tag: "text-sky-400 font-medium",
  function: "text-sky-300",
  operator: "text-cyan-400",
  punctuation: "text-slate-400",
  plain: "text-slate-200"
};

/**
 * Professional Source Code Viewer with Syntax Highlighting, Line Navigation,
 * In-file Search, Copy, and Expandable Viewport.
 */
export default function SourceCodeViewer({
  file,
  loading = false,
  error = null,
  onRetry = null,
  targetLine = null,
  isExpanded = false,
  onToggleExpand = null
}) {
  const [copied, setCopied] = useState(false);
  const [copiedPath, setCopiedPath] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentMatchIdx, setCurrentMatchIdx] = useState(0);
  const [jumpLineInput, setJumpLineInput] = useState("");
  const [highlightedLine, setHighlightedLine] = useState(targetLine);

  const codeContainerRef = useRef(null);
  const lineRefs = useRef(new Map());

  // Synchronize target line from external caller (e.g. symbol click)
  useEffect(() => {
    if (targetLine !== null && targetLine !== undefined) {
      setHighlightedLine(Number(targetLine));
      scrollToLine(Number(targetLine));
    }
  }, [targetLine]);

  // Split lines safely handling CRLF and LF
  const rawLines = useMemo(() => {
    if (!file?.content && file?.content !== "") return [];
    return file.content.split(/\r\n|\r|\n/);
  }, [file?.content]);

  // Find search matches
  const searchMatches = useMemo(() => {
    if (!searchQuery.trim() || rawLines.length === 0) return [];
    const query = searchQuery.toLowerCase();
    const matches = [];
    rawLines.forEach((line, lineIdx) => {
      let startPos = 0;
      const lower = line.toLowerCase();
      while (startPos < lower.length) {
        const found = lower.indexOf(query, startPos);
        if (found === -1) break;
        matches.push({ lineIndex: lineIdx, charIndex: found, length: query.length });
        startPos = found + query.length;
      }
    });
    return matches;
  }, [searchQuery, rawLines]);

  // Clamp active search match index
  useEffect(() => {
    if (searchMatches.length === 0) {
      setCurrentMatchIdx(0);
    } else if (currentMatchIdx >= searchMatches.length) {
      setCurrentMatchIdx(0);
    }
  }, [searchMatches.length]);

  const scrollToLine = (lineNum) => {
    const el = lineRefs.current.get(lineNum);
    if (el && codeContainerRef.current) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const handleNextMatch = () => {
    if (searchMatches.length === 0) return;
    const next = (currentMatchIdx + 1) % searchMatches.length;
    setCurrentMatchIdx(next);
    const targetLineNum = searchMatches[next].lineIndex + 1;
    setHighlightedLine(targetLineNum);
    scrollToLine(targetLineNum);
  };

  const handlePrevMatch = () => {
    if (searchMatches.length === 0) return;
    const prev = (currentMatchIdx - 1 + searchMatches.length) % searchMatches.length;
    setCurrentMatchIdx(prev);
    const targetLineNum = searchMatches[prev].lineIndex + 1;
    setHighlightedLine(targetLineNum);
    scrollToLine(targetLineNum);
  };

  const handleJumpToLine = (e) => {
    e?.preventDefault();
    const parsed = parseInt(jumpLineInput, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= rawLines.length) {
      setHighlightedLine(parsed);
      scrollToLine(parsed);
      setJumpLineInput("");
    }
  };

  const handleCopyCode = () => {
    if (!file?.content) return;
    navigator.clipboard.writeText(file.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyPath = () => {
    if (!file?.path) return;
    navigator.clipboard.writeText(file.path);
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 2000);
  };

  // State 1: Loading
  if (loading) {
    return (
      <div className="rounded-xl border border-slate-800 bg-[#0A0D14] p-8 text-center space-y-3 font-mono text-xs">
        <div className="w-8 h-8 rounded-full border-2 border-sky-500/20 border-t-sky-400 animate-spin mx-auto" />
        <p className="text-slate-300 font-semibold tracking-wide">Loading source code...</p>
        <p className="text-[11px] text-slate-500">Fetching verified file contents from repository</p>
      </div>
    );
  }

  // State 2: Error
  if (error) {
    return (
      <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-5 space-y-3 font-mono text-xs text-rose-200">
        <div className="flex items-center gap-2 text-rose-400 font-bold">
          <AlertCircle className="w-4 h-4" />
          <span>Source Code Unavailable</span>
        </div>
        <p className="text-[11px] text-rose-300/90 leading-relaxed">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 font-semibold text-[11px] flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Loading</span>
          </button>
        )}
      </div>
    );
  }

  // State 3: Binary file
  if (file?.isBinary) {
    return (
      <div className="rounded-xl border border-slate-800 bg-[#0A0D14] p-6 text-center space-y-2 font-mono text-xs text-slate-400">
        <FileQuestion className="w-8 h-8 mx-auto text-slate-500" />
        <p className="text-slate-200 font-semibold">Binary File</p>
        <p className="text-[11px] text-slate-400">Source preview is not available for this binary file.</p>
        <span className="text-[10px] text-slate-500">
          Size: {(file.size / 1024).toFixed(1)} KB &bull; Ref: {file.ref}
        </span>
      </div>
    );
  }

  // State 4: Truncated large file notice
  // If file is valid, render code viewer
  const fileExt = file?.extension || (file?.name ? file.name.split(".").pop() : "");

  return (
    <div
      className={`rounded-xl border border-slate-800 bg-[#080B11] text-xs font-mono flex flex-col transition-all duration-200 ${
        isExpanded ? "fixed inset-4 z-50 shadow-2xl bg-[#080B11]/98 backdrop-blur-md" : "w-full"
      }`}
      style={{ maxHeight: isExpanded ? "calc(100vh - 2rem)" : "500px" }}
    >
      {/* Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 bg-slate-900/90 border-b border-slate-800 text-slate-300">
        <div className="flex items-center gap-2 truncate max-w-[260px] sm:max-w-[340px]">
          <FileCode className="w-4 h-4 text-sky-400 shrink-0" />
          <span className="font-bold text-white truncate" title={file?.name}>
            {file?.name || "Source"}
          </span>
          {file?.language && (
            <Badge variant="cyan" size="sm">
              {file.language}
            </Badge>
          )}
          {file?.ref && (
            <span className="text-[10px] text-slate-500 hidden sm:inline truncate">
              @{file.ref}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Copy Path */}
          <button
            onClick={handleCopyPath}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Copy file path"
          >
            {copiedPath ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Hash className="w-3.5 h-3.5" />}
          </button>

          {/* Copy Code */}
          <button
            onClick={handleCopyCode}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors flex items-center gap-1"
            title="Copy source code"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[10px] text-emerald-400 hidden sm:inline">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span className="text-[10px] hidden sm:inline">Copy</span>
              </>
            )}
          </button>

          {/* Expand / Minimize Toggle */}
          {onToggleExpand && (
            <button
              onClick={onToggleExpand}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              title={isExpanded ? "Collapse viewer" : "Expand to fullscreen"}
            >
              {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Sub-toolbar: Search & Jump to Line */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-[#0D121D] border-b border-slate-800/80 text-[11px]">
        {/* In-File Search */}
        <div className="flex items-center gap-1.5 flex-1 min-w-[160px]">
          <Search className="w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Find in file..."
            className="bg-transparent text-slate-200 placeholder-slate-500 focus:outline-none text-[11px] w-full"
          />
          {searchQuery && (
            <div className="flex items-center gap-1 text-[10px] text-slate-400 shrink-0">
              <span>
                {searchMatches.length === 0 ? "0" : currentMatchIdx + 1}/{searchMatches.length}
              </span>
              <button
                onClick={handlePrevMatch}
                disabled={searchMatches.length === 0}
                className="p-0.5 rounded hover:bg-slate-800 disabled:opacity-40"
                title="Previous match"
              >
                <ChevronUp className="w-3 h-3" />
              </button>
              <button
                onClick={handleNextMatch}
                disabled={searchMatches.length === 0}
                className="p-0.5 rounded hover:bg-slate-800 disabled:opacity-40"
                title="Next match"
              >
                <ChevronDown className="w-3 h-3" />
              </button>
              <button
                onClick={() => setSearchQuery("")}
                className="p-0.5 rounded hover:bg-slate-800"
                title="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Jump to Line Form */}
        <form onSubmit={handleJumpToLine} className="flex items-center gap-1 shrink-0">
          <span className="text-slate-500 text-[10px]">Line:</span>
          <input
            type="number"
            min="1"
            max={rawLines.length || 1}
            value={jumpLineInput}
            onChange={(e) => setJumpLineInput(e.target.value)}
            placeholder="Jump..."
            className="w-14 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-200 text-center focus:outline-none focus:border-sky-500"
          />
          <button
            type="submit"
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
            title="Go to line"
          >
            <ArrowRight className="w-3 h-3" />
          </button>
        </form>
      </div>

      {/* Large File Banner if applicable */}
      {file?.isTruncated && (
        <div className="px-3 py-1.5 bg-amber-500/10 border-b border-amber-500/20 text-amber-300 text-[10px] flex items-center justify-between">
          <span>File is large (&gt;1MB). Showing first 256 KB inline preview.</span>
          <span className="font-semibold">{(file.size / 1024 / 1024).toFixed(2)} MB total</span>
        </div>
      )}

      {/* Code Table Viewport */}
      <div
        ref={codeContainerRef}
        className="flex-1 overflow-auto p-2 bg-[#080B11] text-slate-200 font-mono text-[11px] leading-relaxed select-text"
      >
        {rawLines.length === 0 ? (
          <div className="py-8 text-center text-slate-500 italic">
            This file is empty (0 lines).
          </div>
        ) : (
          <table className="w-full border-collapse">
            <tbody>
              {rawLines.map((lineText, idx) => {
                const lineNum = idx + 1;
                const isTarget = highlightedLine === lineNum;
                const tokens = tokenizeLine(lineText, fileExt);

                return (
                  <tr
                    key={lineNum}
                    ref={(el) => {
                      if (el) lineRefs.current.set(lineNum, el);
                      else lineRefs.current.delete(lineNum);
                    }}
                    onClick={() => setHighlightedLine(lineNum)}
                    className={`cursor-pointer transition-colors ${
                      isTarget
                        ? "bg-sky-500/20 border-l-2 border-sky-400"
                        : "hover:bg-slate-900/60"
                    }`}
                  >
                    {/* Line Number Column */}
                    <td className="pr-3.5 py-0.5 text-right text-slate-600 select-none text-[10px] w-10 font-mono align-top">
                      {lineNum}
                    </td>

                    {/* Syntax Highlighted Line Content */}
                    <td className="py-0.5 whitespace-pre font-mono text-slate-200 overflow-x-auto align-top">
                      {tokens.map((tok, tIdx) => (
                        <span
                          key={tIdx}
                          className={TOKEN_COLOR_MAP[tok.type] || "text-slate-200"}
                        >
                          {tok.text}
                        </span>
                      ))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Status Footer */}
      <div className="px-3 py-1.5 bg-slate-900/90 border-t border-slate-800 text-[10px] text-slate-500 flex items-center justify-between">
        <span className="truncate">Path: {file?.path}</span>
        <span className="shrink-0 ml-2">
          {rawLines.length} {rawLines.length === 1 ? "line" : "lines"} &bull; UTF-8
        </span>
      </div>
    </div>
  );
}
