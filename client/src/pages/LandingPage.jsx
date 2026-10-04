import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  GitPullRequest,
  Box,
  Terminal,
  MessageSquareCode,
  Shield,
  Activity,
  CheckCircle2,
  FileCode,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Layers,
  Cpu,
  Zap,
  Code2,
  Bug,
  Flame,
  Check,
  ExternalLink,
  Copy,
  GitBranch,
  ShieldCheck,
  AlertTriangle,
  Server
} from "lucide-react";
import Navbar from "../components/Navbar";
import HeroCodebase3D from "../components/visualization/HeroCodebase3D";
import Codebase3DShowcase from "../components/visualization/Codebase3DShowcase";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import CodeSnippet from "../components/ui/CodeSnippet";
import DevraLogo from "../components/ui/DevraLogo";
import { checkHealth } from "../services/api";

export default function LandingPage() {
  const [serverHealth, setServerHealth] = useState({ status: "checking" });
  const [expandedReviewIndex, setExpandedReviewIndex] = useState(0);
  const [chatQuestion, setChatQuestion] = useState("Where is the authentication middleware registered?");
  const [chatAnswer, setChatAnswer] = useState({
    text: "The authentication middleware is initialized in `server/src/app.js` and enforced on all protected REST routes via the `jwtVerify` middleware in `server/src/middleware/auth.js`.",
    file: "server/src/middleware/auth.js:24",
    code: `// Verified Ground Truth Context
export const requireAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });
  const decoded = jwt.verify(token, config.jwtSecret);
  req.user = decoded;
  next();
};`
  });

  useEffect(() => {
    checkHealth().then((res) => {
      if (res.success) {
        setServerHealth(res.data);
      } else {
        setServerHealth({ status: "offline" });
      }
    });
  }, []);

  const sampleReviews = [
    {
      id: "rev-1",
      severity: "CRITICAL",
      severityVariant: "rose",
      title: "Arbitrary Code Execution via eval() in Auth Flow",
      rule: "security/no-eval-execution",
      file: "server/src/controllers/authController.js",
      line: 42,
      explanation: "Dynamic evaluation of untrusted user input allows unauthenticated remote code execution. Never pass request body variables to eval().",
      suggestedFix: `// Safe parameter extraction with schema validation
- const payload = eval(req.body.command);
+ const payload = JSON.parse(req.body.command);
+ if (typeof payload !== "object") throw new BadRequestError("Invalid payload schema");`
    },
    {
      id: "rev-2",
      severity: "HIGH",
      severityVariant: "amber",
      title: "Unbounded Global Cache Memory Leak",
      rule: "perf/unbounded-cache-size",
      file: "server/src/services/astService.js",
      line: 78,
      explanation: "Cache map has no maximum capacity or eviction strategy. High traffic worker processes will experience continuous heap exhaustion.",
      suggestedFix: `- const cache = new Map();
+ const cache = new LRUCache<string, AstGraph>({ max: 5000, ttl: 1000 * 60 * 15 });
+ process.once("beforeExit", () => cache.clear());`
    },
    {
      id: "rev-3",
      severity: "MEDIUM",
      severityVariant: "sky",
      title: "Missing Cleanup in React Timer Effect",
      rule: "react-hooks/exhaustive-cleanup",
      file: "client/src/components/MetricCounter.jsx",
      line: 31,
      explanation: "Interval timer created inside useEffect is not returned as a teardown handler, causing memory leaks upon unmounting component.",
      suggestedFix: `- useEffect(() => { setInterval(updateStats, 1000); }, []);
+ useEffect(() => {
+   const timer = setInterval(updateStats, 1000);
+   return () => clearInterval(timer);
+ }, []);`
    },
    {
      id: "rev-4",
      severity: "LOW",
      severityVariant: "emerald",
      title: "Non-strict Equality Operator in Status Check",
      rule: "style/strict-equality",
      file: "server/src/utils/statusCheck.js",
      line: 14,
      explanation: "Using loose equality (==) can cause unintentional type coercion bugs when comparing null vs undefined or numeric strings.",
      suggestedFix: `- if (res.status == 200) {
+ if (res.status === 200) {`
    }
  ];

  return (
    <div className="min-h-screen bg-[#080B11] text-slate-100 flex flex-col antialiased selection:bg-sky-500/25 selection:text-sky-200">
      {/* 1. Global Redesigned Sticky Navbar */}
      <Navbar />

      <main className="flex-1">
        {/* ==================================================
            2. HERO SECTION — HIGHEST PRIORITY
            ================================================== */}
        <section id="hero" className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-12 pb-20 sm:pt-20 sm:pb-28">
          {/* Subtle background ambient glow */}
          <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-sky-500/10 blur-[140px] rounded-full pointer-events-none" />
          <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-indigo-500/10 blur-[130px] rounded-full pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55 }}
              className="lg:col-span-6 space-y-6"
            >
              {/* Badge: AI ENGINEERING ASSISTANT */}
              <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-transparent border border-sky-500/25 text-xs font-mono text-sky-300">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-400" />
                </span>
                <span className="tracking-wider uppercase font-semibold">AI Engineering Assistant</span>
              </div>

              {/* Large Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.08]">
                Build Better. <br />
                <span className="bg-gradient-to-r from-sky-400 via-cyan-300 to-indigo-400 bg-clip-text text-transparent glow-text-cyan">
                  Ship Smarter.
                </span>
              </h1>

              {/* Description */}
              <p className="text-base sm:text-lg text-slate-400 max-w-xl leading-relaxed">
                Devra unifies deep AST architecture comprehension, automated pull request verification,
                interactive 3D spatial codebase graphs, and autonomous agent workflows into one unified cockpit.
              </p>

              {/* Primary & Secondary CTAs */}
              <div className="flex flex-wrap items-center gap-3.5 pt-2">
                <Link to="/dashboard">
                  <Button variant="primary" size="lg" icon={ArrowRight}>
                    Get Started
                  </Button>
                </Link>
                <a href="#codebase-3d">
                  <Button variant="secondary" size="lg" icon={Box}>
                    Explore Devra
                  </Button>
                </a>
              </div>

              {/* Monospace Operational Metrics & Heartbeat */}
              <div className="pt-6 flex flex-wrap items-center gap-6 text-xs font-mono text-slate-500 border-t border-slate-800/80">
                <div className="flex items-center gap-2">
                  <span className="text-slate-200 font-semibold">14</span> Repositories Monitored
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 font-semibold">96.4%</span> Code Quality
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sky-400 font-semibold">&lt; 1.2s</span> Review Latency
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      serverHealth.status === "ok" ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                    }`}
                  />
                  <span>API: {serverHealth.status === "ok" ? "Live" : "Standby"}</span>
                </div>
              </div>
            </motion.div>

            {/* Right: Living Software 3D Visualization */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.65, delay: 0.15 }}
              className="lg:col-span-6"
            >
              <HeroCodebase3D />
            </motion.div>
          </div>
        </section>

        {/* ==================================================
            3. DEVELOPER ECOSYSTEM & LANGUAGES SECTION
            ================================================== */}
        <section className="border-y border-slate-800/80 bg-[#090D15]/60 py-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <p className="text-center text-xs font-mono uppercase tracking-widest text-slate-500 mb-6">
              Native AST Intelligence Across Multi-Language Codebases
            </p>
            <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-14 text-slate-400 text-sm font-mono">
              <span className="flex items-center gap-2 hover:text-sky-300 transition-colors">
                <span className="w-2.5 h-2.5 rounded-full bg-[#3178c6]" />
                TypeScript
              </span>
              <span className="flex items-center gap-2 hover:text-sky-300 transition-colors">
                <span className="w-2.5 h-2.5 rounded-full bg-[#00add8]" />
                Go
              </span>
              <span className="flex items-center gap-2 hover:text-sky-300 transition-colors">
                <span className="w-2.5 h-2.5 rounded-full bg-[#3572a5]" />
                Python
              </span>
              <span className="flex items-center gap-2 hover:text-sky-300 transition-colors">
                <span className="w-2.5 h-2.5 rounded-full bg-[#dea584]" />
                Rust
              </span>
              <span className="flex items-center gap-2 hover:text-sky-300 transition-colors">
                <span className="w-2.5 h-2.5 rounded-full bg-[#61dafb]" />
                React 19
              </span>
              <span className="flex items-center gap-2 hover:text-sky-300 transition-colors">
                <span className="w-2.5 h-2.5 rounded-full bg-[#68a063]" />
                Node.js
              </span>
              <span className="flex items-center gap-2 hover:text-sky-300 transition-colors">
                <span className="w-2.5 h-2.5 rounded-full bg-[#e535ab]" />
                GraphQL
              </span>
              <span className="flex items-center gap-2 hover:text-sky-300 transition-colors">
                <span className="w-2.5 h-2.5 rounded-full bg-[#2496ed]" />
                Docker
              </span>
            </div>
          </div>
        </section>

        {/* ==================================================
            4. AI CODEBASE INTELLIGENCE CARDS
            ================================================== */}
        <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
          <div className="mb-14 space-y-3 text-center sm:text-left">
            <Badge variant="cyan" size="sm">COMPREHENSIVE CODE ENGINE</Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              AI Codebase Intelligence
            </h2>
            <p className="text-sm sm:text-base text-slate-400 max-w-2xl leading-relaxed">
              Deterministic AST tree scanning fused with semantic embeddings. Devra detects design smells,
              breaking API surface modifications, and cyclical leaks before they reach your pull requests.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <Card hover className="space-y-4 bg-[#0C101A] border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                <GitPullRequest className="w-5 h-5" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-white">Automated Code Reviews</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Real-time pull request inspection classifying defects across Critical, High, Medium, and Low risk thresholds with instant drop-in diff fixes.
                </p>
              </div>
              <Link to="/reviews" className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 font-mono font-medium">
                <span>Inspect reviews</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </Card>

            <Card hover className="space-y-4 bg-[#0C101A] border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Box className="w-5 h-5" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-white">3D Spatial Mapping</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  WebGL galaxy visualizing architecture clusters, dependency calls, and code health with interactive camera focus and node inspection.
                </p>
              </div>
              <a href="#codebase-3d" className="inline-flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 font-mono font-medium">
                <span>View 3D visualizer</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </a>
            </Card>

            <Card hover className="space-y-4 bg-[#0C101A] border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <MessageSquareCode className="w-5 h-5" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-white">Codebase Chat & RAG</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Ask deep structural questions and generate regression tests. Every response cites exact verified file paths and line ranges.
                </p>
              </div>
              <Link to="/chat" className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-mono font-medium">
                <span>Start AI session</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </Card>

            <Card hover className="space-y-4 bg-[#0C101A] border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Terminal className="w-5 h-5" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-white">VS Code Extension</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Native editor extension connecting your IDE directly to Devra’s cluster for inline diagnostics, side-by-side diffs, and chat.
                </p>
              </div>
              <Link to="/settings" className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-mono font-medium">
                <span>Extension setup</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </Card>
          </div>
        </section>

        {/* ==================================================
            5. DEDICATED 3D CODEBASE VISUALIZATION SECTION
            ================================================== */}
        <Codebase3DShowcase />

        {/* ==================================================
            6. AI CODE REVIEW SHOWCASE SECTION
            ================================================== */}
        <section id="ai-review" className="max-w-7xl mx-auto px-4 sm:px-6 py-20 border-t border-slate-800/80">
          <div className="mb-10 space-y-3">
            <Badge variant="rose" size="sm">PRECISE INLINE REVIEW ENGINE</Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Automated Pull Request Code Review
            </h2>
            <p className="text-sm sm:text-base text-slate-400 max-w-2xl leading-relaxed">
              Every pull request is automatically analyzed across 4 strict severity tiers:
              <strong className="text-rose-400 ml-1">CRITICAL</strong>,
              <strong className="text-amber-400 ml-1">HIGH</strong>,
              <strong className="text-sky-400 ml-1">MEDIUM</strong>, and
              <strong className="text-emerald-400 ml-1">LOW</strong>.
              Review explanations include file citations, impact summaries, and drop-in code remedies.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Expandable Issue Cards */}
            <div className="lg:col-span-6 space-y-3">
              {sampleReviews.map((rev, idx) => {
                const isExpanded = expandedReviewIndex === idx;
                return (
                  <div
                    key={rev.id}
                    onClick={() => setExpandedReviewIndex(idx)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      isExpanded
                        ? "bg-[#0E1422] border-sky-500/50 shadow-lg shadow-sky-500/5"
                        : "bg-[#0C101A] border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <Badge variant={rev.severityVariant} size="sm">
                          {rev.severity}
                        </Badge>
                        <h4 className="text-sm font-mono font-bold text-white truncate max-w-xs sm:max-w-md">
                          {rev.title}
                        </h4>
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-500 transition-transform ${
                          isExpanded ? "rotate-180 text-sky-400" : ""
                        }`}
                      />
                    </div>

                    <div className="mt-2 flex items-center gap-3 text-xs font-mono text-slate-400">
                      <span className="text-sky-300">{rev.file}</span>
                      <span>&bull;</span>
                      <span>Line {rev.line}</span>
                      <span>&bull;</span>
                      <span className="text-slate-500">{rev.rule}</span>
                    </div>

                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="mt-3 pt-3 border-t border-slate-800/80 text-xs text-slate-300 leading-relaxed"
                      >
                        <p>{rev.explanation}</p>
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Right: Active Selected Issue Code Diff */}
            <div className="lg:col-span-6 sticky top-20">
              <div className="rounded-xl border border-slate-800 bg-[#0C101A] overflow-hidden shadow-xl">
                <div className="px-4 py-3 bg-[#0E1424] border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <FileCode className="w-4 h-4 text-sky-400" />
                    <span className="text-white font-semibold">
                      {sampleReviews[expandedReviewIndex]?.file}
                    </span>
                    <span className="text-slate-500">&bull;</span>
                    <Badge variant={sampleReviews[expandedReviewIndex]?.severityVariant} size="sm">
                      {sampleReviews[expandedReviewIndex]?.severity}
                    </Badge>
                  </div>
                  <Link to="/reviews">
                    <Button variant="ghost" size="xs">
                      Inspect in Console
                    </Button>
                  </Link>
                </div>
                <div className="p-4 bg-[#070A0F]">
                  <CodeSnippet
                    code={sampleReviews[expandedReviewIndex]?.suggestedFix || ""}
                    language="typescript"
                    title={`Fix Suggestion &bull; Line ${sampleReviews[expandedReviewIndex]?.line}`}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==================================================
            7. AI CODEBASE CONVERSATIONAL CHAT (RAG)
            ================================================== */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-20 border-t border-slate-800/80">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-5 space-y-4">
              <Badge variant="purple" size="sm">VECTOR EMBEDDING SEARCH</Badge>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Conversational Codebase (RAG)
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Devra grounds every AI interaction in verified source chunks. Ask architectural questions,
                trace async call flows, or synthesize integration tests without risking hallucinated code.
              </p>
              <div className="space-y-2 pt-2">
                <span className="text-xs font-mono uppercase text-slate-500 tracking-wider block">
                  Quick Query Starters:
                </span>
                <div className="flex flex-wrap gap-2">
                  {[
                    "Where is auth registered?",
                    "Trace database call flow",
                    "List all rate-limited routes"
                  ].map((q) => (
                    <button
                      key={q}
                      onClick={() => setChatQuestion(q)}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-slate-300 hover:text-white transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
              <div className="pt-2">
                <Link to="/chat">
                  <Button variant="primary" size="md" icon={MessageSquareCode}>
                    Open AI Chat Studio
                  </Button>
                </Link>
              </div>
            </div>

            {/* Chat Simulator Preview */}
            <div className="lg:col-span-7">
              <div className="rounded-2xl border border-slate-800 bg-[#0C101A] shadow-2xl overflow-hidden font-mono text-xs">
                {/* Chat Header */}
                <div className="px-4 py-3 bg-[#0E1422] border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    <span className="text-white font-semibold">Devra Code Intelligence &bull; devra-core</span>
                  </div>
                  <span className="text-[10px] text-slate-500">128-d L2 Vector Index</span>
                </div>

                {/* Messages Body */}
                <div className="p-4 space-y-4 bg-[#080B11]">
                  {/* User query */}
                  <div className="flex gap-3 max-w-xl ml-auto flex-row-reverse">
                    <div className="w-7 h-7 rounded-lg bg-sky-500 flex items-center justify-center text-white shrink-0 text-[11px] font-bold">
                      You
                    </div>
                    <div className="p-3.5 rounded-2xl bg-sky-600 text-white leading-relaxed">
                      {chatQuestion}
                    </div>
                  </div>

                  {/* Devra AI Response */}
                  <div className="flex gap-3 max-w-2xl mr-auto">
                    <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center text-sky-400 shrink-0">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <div className="p-4 rounded-2xl bg-[#0F1422] border border-slate-800 text-slate-200 space-y-3 leading-relaxed">
                      <p>{chatAnswer.text}</p>

                      {/* Source Citation Badge */}
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-[10px] text-slate-500 uppercase">Citation:</span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/30 text-sky-300 text-[11px]">
                          <FileCode className="w-3 h-3" />
                          <span>{chatAnswer.file}</span>
                        </span>
                      </div>

                      {/* Code Block Snippet */}
                      <CodeSnippet
                        code={chatAnswer.code}
                        language="javascript"
                        title="middleware/auth.js"
                        showLineNumbers={false}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==================================================
            8. VS CODE EXTENSION & AUTONOMOUS AGENT MODE
            ================================================== */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-20 border-t border-slate-800/80">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left: VS Code Extension Card */}
            <div className="p-6 sm:p-8 rounded-2xl border border-slate-800 bg-[#0C101A] space-y-5 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Terminal className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-white">VS Code Native Extension</h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Bring Devra directly into your developer environment. Includes instant command palette actions,
                  context menu review triggers, side-by-side git diff comparisons, and a dedicated sidebar assistant.
                </p>
                <div className="pt-2 flex flex-wrap gap-2 text-xs font-mono text-slate-400">
                  <span className="px-2 py-1 rounded bg-slate-900 border border-slate-800">Inline Diagnostics</span>
                  <span className="px-2 py-1 rounded bg-slate-900 border border-slate-800">F5 Extension Debug</span>
                  <span className="px-2 py-1 rounded bg-slate-900 border border-slate-800">Side-by-Side Diffs</span>
                </div>
              </div>
              <Link to="/settings">
                <Button variant="secondary" size="sm" icon={ExternalLink}>
                  View Extension Guide
                </Button>
              </Link>
            </div>

            {/* Right: Autonomous Agent Mode Card */}
            <div className="p-6 sm:p-8 rounded-2xl border border-slate-800 bg-[#0C101A] space-y-5 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                  <Cpu className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-white">Autonomous Agent Mode</h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Provide high-level feature requests or refactoring goals. Devra synthesizes a complete step-by-step
                  implementation plan, presents unified diffs, and awaits your manual approval before applying file modifications safely.
                </p>
                <div className="pt-2 grid grid-cols-4 gap-2 text-[10px] font-mono text-center">
                  <div className="p-2 rounded bg-slate-900 border border-slate-800 text-sky-300">1. Plan</div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800 text-indigo-300">2. Review</div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800 text-amber-300">3. Diff</div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800 text-emerald-300">4. Apply</div>
                </div>
              </div>
              <Link to="/repositories">
                <Button variant="primary" size="sm" icon={ArrowRight}>
                  Launch Agent Session
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* ==================================================
            9. CALL TO ACTION (CTA)
            ================================================== */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
          <div className="relative rounded-3xl p-8 sm:p-14 overflow-hidden border border-slate-800 bg-gradient-to-b from-[#0E1424] to-[#0A0D15] text-center space-y-6 shadow-2xl">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-sky-500/15 blur-[120px] rounded-full pointer-events-none" />

            <DevraLogo size="lg" showText={true} className="justify-center" />

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
              Build Better. Ship Smarter.
            </h2>

            <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto leading-relaxed">
              Join elite software engineering teams deploying autonomous code reviews,
              3D architectural graphs, and vector codebase comprehension.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              <Link to="/dashboard">
                <Button variant="primary" size="lg" icon={ArrowRight}>
                  Enter Devra Console
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="secondary" size="lg">
                  Sign In With Demo
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ==================================================
          10. FOOTER WITH BRANDING & TAGLINE
          ================================================== */}
      <footer className="border-t border-slate-800/80 bg-[#070A10] px-4 sm:px-6 py-10 text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <DevraLogo size="sm" showText={true} />
            <span className="text-slate-600">&bull;</span>
            <span className="text-slate-400">Your AI Engineering Companion</span>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-slate-400">
            <Link to="/dashboard" className="hover:text-white transition-colors">Console</Link>
            <Link to="/repositories" className="hover:text-white transition-colors">Repositories</Link>
            <Link to="/reviews" className="hover:text-white transition-colors">Code Reviews</Link>
            <Link to="/chat" className="hover:text-white transition-colors">AI Chat</Link>
            <Link to="/settings" className="hover:text-white transition-colors">Settings</Link>
          </div>

          <div className="text-slate-500 text-center md:text-right">
            <span>&copy; {new Date().getFullYear()} Devra Platform. Enterprise Developer Tools.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
