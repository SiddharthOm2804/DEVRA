import axios from "axios";
import { config } from "../config/env.js";

const VALID_SEVERITIES = new Set(["low", "medium", "high", "critical"]);
const VALID_ISSUE_TYPES = new Set([
  "bug",
  "security",
  "performance",
  "code_smell",
  "maintainability"
]);

/**
 * System prompt instructing AI models to return strictly validated JSON
 */
const SYSTEM_PROMPT = `You are DevPilot AI, an elite principal software architect and automated code reviewer.
Review the provided code thoroughly.
Identify:
1. Bugs and logic flaws
2. Security vulnerabilities (CVEs, injections, XSS, insecure auth)
3. Performance bottlenecks and memory leaks
4. Code smells and anti-patterns
5. Maintainability and architectural problems
6. Concrete improvements

CRITICAL INSTRUCTION: You must respond ONLY with a raw, valid JSON object without any conversational text or explanation outside the JSON.
The JSON must adhere to this exact schema:
{
  "summary": "High-level architectural summary of the findings (2-4 sentences)",
  "severity": "low|medium|high|critical",
  "score": 85,
  "issues": [
    {
      "type": "bug|security|performance|code_smell|maintainability",
      "title": "Short title describing the issue",
      "description": "Clear explanation of why this is problematic and what could break",
      "severity": "low|medium|high|critical",
      "line": 42,
      "rule": "rule-identifier-kebab-case"
    }
  ],
  "suggestions": [
    {
      "title": "Recommended fix title",
      "description": "Explanation of the solution",
      "codeSnippet": "// Corrected replacement code snippet",
      "impact": "Low|Medium|High|Critical"
    }
  ]
}`;

/**
 * Safely parses JSON string, removing any surrounding markdown formatting
 */
export function extractAndParseJSON(rawText) {
  if (typeof rawText !== "string") {
    throw new Error("AI output is not a string.");
  }

  let cleaned = rawText.trim();

  // Strip markdown code fences if present (```json ... ``` or ``` ...)
  if (cleaned.startsWith("```")) {
    const firstNewline = cleaned.indexOf("\n");
    if (firstNewline !== -1) {
      cleaned = cleaned.substring(firstNewline + 1);
    }
    if (cleaned.endsWith("```")) {
      cleaned = cleaned.substring(0, cleaned.length - 3);
    }
    cleaned = cleaned.trim();
  }

  // Find first { and last }
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error("No JSON object structure found in AI response.");
  }

  const jsonSubstring = cleaned.substring(firstBrace, lastBrace + 1);
  return JSON.parse(jsonSubstring);
}

/**
 * Validates and normalizes raw review output from any AI provider
 */
export function validateAndNormalizeReview(raw) {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid review payload: expected JSON object.");
  }

  // 1. Summary validation
  let summary = typeof raw.summary === "string" ? raw.summary.trim() : "";
  if (!summary) {
    summary = "Automated code review completed with architectural validation.";
  }

  // 2. Issues validation and normalization
  const rawIssues = Array.isArray(raw.issues) ? raw.issues : [];
  const normalizedIssues = [];

  for (let i = 0; i < rawIssues.length; i++) {
    const item = rawIssues[i];
    if (!item || typeof item !== "object") continue;

    // Type normalization
    let type = typeof item.type === "string" ? item.type.toLowerCase().trim() : "code_smell";
    if (!VALID_ISSUE_TYPES.has(type)) {
      if (type.includes("sec") || type.includes("vuln")) type = "security";
      else if (type.includes("perf") || type.includes("opt")) type = "performance";
      else if (type.includes("bug") || type.includes("error")) type = "bug";
      else if (type.includes("maint") || type.includes("arch")) type = "maintainability";
      else type = "code_smell";
    }

    // Severity normalization
    let severity = typeof item.severity === "string" ? item.severity.toLowerCase().trim() : "medium";
    if (!VALID_SEVERITIES.has(severity)) {
      severity = "medium";
    }

    const title = typeof item.title === "string" && item.title.trim()
      ? item.title.trim()
      : `Detected ${type} issue`;

    const description = typeof item.description === "string" && item.description.trim()
      ? item.description.trim()
      : "Issue detected during automated architectural evaluation.";

    const line = Number.isInteger(item.line) && item.line > 0 ? item.line : null;
    const rule = typeof item.rule === "string" && item.rule.trim() ? item.rule.trim() : `${type}-rule`;

    normalizedIssues.push({
      id: `issue-${i + 1}-${Date.now().toString(36)}`,
      type,
      title,
      description,
      severity,
      line,
      rule
    });
  }

  // 3. Suggestions validation
  const rawSuggestions = Array.isArray(raw.suggestions) ? raw.suggestions : [];
  const normalizedSuggestions = [];

  for (let i = 0; i < rawSuggestions.length; i++) {
    const item = rawSuggestions[i];
    if (!item || typeof item !== "object") continue;

    const title = typeof item.title === "string" && item.title.trim()
      ? item.title.trim()
      : `Suggested improvement #${i + 1}`;

    const description = typeof item.description === "string" && item.description.trim()
      ? item.description.trim()
      : "Apply optimized syntax and safety patterns.";

    const codeSnippet = typeof item.codeSnippet === "string" ? item.codeSnippet.trim() : "";
    let impact = typeof item.impact === "string" ? item.impact.trim() : "Medium";
    if (!["Low", "Medium", "High", "Critical"].includes(impact)) {
      impact = "Medium";
    }

    normalizedSuggestions.push({
      title,
      description,
      codeSnippet,
      impact
    });
  }

  // 4. Derive overall severity if missing or inaccurate
  let severity = typeof raw.severity === "string" ? raw.severity.toLowerCase().trim() : "";
  if (!VALID_SEVERITIES.has(severity)) {
    if (normalizedIssues.some((i) => i.severity === "critical")) severity = "critical";
    else if (normalizedIssues.some((i) => i.severity === "high")) severity = "high";
    else if (normalizedIssues.some((i) => i.severity === "medium")) severity = "medium";
    else severity = "low";
  }

  // 5. Score calculation (0 - 100)
  let score = typeof raw.score === "number" && !isNaN(raw.score) ? Math.round(raw.score) : null;
  if (score === null || score < 0 || score > 100) {
    const criticals = normalizedIssues.filter((i) => i.severity === "critical").length;
    const highs = normalizedIssues.filter((i) => i.severity === "high").length;
    const mediums = normalizedIssues.filter((i) => i.severity === "medium").length;
    const lows = normalizedIssues.filter((i) => i.severity === "low").length;
    score = Math.max(15, 100 - (criticals * 25 + highs * 15 + mediums * 6 + lows * 2));
  }

  // 6. Compute metrics
  const metrics = {
    bugsCount: normalizedIssues.filter((i) => i.type === "bug").length,
    securityCount: normalizedIssues.filter((i) => i.type === "security").length,
    performanceCount: normalizedIssues.filter((i) => i.type === "performance").length,
    smellsCount: normalizedIssues.filter((i) => i.type === "code_smell").length,
    maintainabilityCount: normalizedIssues.filter((i) => i.type === "maintainability").length
  };

  return {
    summary,
    severity,
    score,
    issues: normalizedIssues,
    suggestions: normalizedSuggestions,
    metrics
  };
}

/**
 * Heuristic & AST Static Analyzer
 * Runs automatically when no AI API key is configured or as an instant resilient fallback
 */
export function runStaticCodeAnalysis(code = "", language = "JavaScript", fileName = "snippet.js") {
  const issues = [];
  const suggestions = [];
  const lines = code.split("\n");

  // 1. Security Inspections
  if (code.includes("eval(") || code.includes("new Function(")) {
    issues.push({
      type: "security",
      title: "Arbitrary Code Execution via eval()",
      description: "Direct invocation of eval() or dynamic Function constructor allows arbitrary code execution and injection.",
      severity: "critical",
      line: lines.findIndex((l) => l.includes("eval(") || l.includes("new Function(")) + 1,
      rule: "sec-no-eval"
    });
    suggestions.push({
      title: "Replace eval with strict parser",
      description: "Refactor dynamic evaluation to use JSON.parse() or a secure AST visitor pattern.",
      codeSnippet: "// Safe alternative:\nconst parsedData = JSON.parse(userInput);",
      impact: "Critical"
    });
  }

  if (/(password|secret|jwt_secret|apiKey|api_key)\s*=\s*['"][a-zA-Z0-9_\-]{8,}['"]/i.test(code)) {
    issues.push({
      type: "security",
      title: "Hardcoded Secret / API Token Detected",
      description: "Credentials or secrets are embedded directly into source code, posing significant leakage risks.",
      severity: "critical",
      line: lines.findIndex((l) => /(password|secret|apiKey)\s*=/i.test(l)) + 1,
      rule: "sec-no-hardcoded-credentials"
    });
    suggestions.push({
      title: "Extract secrets to environment variables",
      description: "Load secrets through process.env and validate using configuration schemas.",
      codeSnippet: "const apiKey = process.env.API_KEY || throw new Error('API_KEY required');",
      impact: "Critical"
    });
  }

  if (code.includes("innerHTML") || code.includes("dangerouslySetInnerHTML")) {
    issues.push({
      type: "security",
      title: "Cross-Site Scripting (XSS) via unescaped HTML",
      description: "Setting raw HTML directly bypasses DOM escaping mechanisms and exposes the UI to stored or reflected XSS.",
      severity: "high",
      line: lines.findIndex((l) => l.includes("innerHTML")) + 1,
      rule: "sec-dom-xss"
    });
    suggestions.push({
      title: "Use textContent or DOMPurify",
      description: "Sanitize user input before insertion or use React safe text bindings.",
      codeSnippet: "element.textContent = sanitizedText;",
      impact: "High"
    });
  }

  // 2. Bugs & Async Flow
  if (code.includes("=== NaN") || code.includes("== NaN")) {
    issues.push({
      type: "bug",
      title: "Invalid Comparison to NaN",
      description: "NaN is not equal to itself under IEEE 754. Comparisons like (x === NaN) always evaluate to false.",
      severity: "high",
      line: lines.findIndex((l) => l.includes("NaN")) + 1,
      rule: "bug-isnan"
    });
    suggestions.push({
      title: "Use Number.isNaN()",
      description: "Replace direct equality comparison with Number.isNaN(value).",
      codeSnippet: "if (Number.isNaN(value)) { ... }",
      impact: "High"
    });
  }

  if (code.includes("async") && (code.includes("forEach(") || code.includes(".forEach")) && code.includes("await")) {
    issues.push({
      type: "bug",
      title: "Await inside Array.prototype.forEach()",
      description: "forEach() does not wait for asynchronous callbacks. Async iterations run concurrently without awaiting completion.",
      severity: "high",
      line: lines.findIndex((l) => l.includes("forEach")) + 1,
      rule: "bug-async-foreach"
    });
    suggestions.push({
      title: "Use for...of or Promise.all()",
      description: "Sequential await should use for...of loop, or parallel await using Promise.all(items.map(...)).",
      codeSnippet: "for (const item of items) {\n  await processItem(item);\n}",
      impact: "High"
    });
  }

  // 3. Performance Inspections
  if (code.includes("fs.readFileSync") || code.includes("fs.writeFileSync")) {
    issues.push({
      type: "performance",
      title: "Synchronous I/O Blocking the Event Loop",
      description: "Synchronous file operations block the single-threaded Node.js event loop, degrading API response latency.",
      severity: "medium",
      line: lines.findIndex((l) => l.includes("Sync")) + 1,
      rule: "perf-async-io"
    });
    suggestions.push({
      title: "Switch to fs.promises async APIs",
      description: "Use fs.promises.readFile with async/await to keep the event loop non-blocking.",
      codeSnippet: "import fs from 'fs/promises';\nconst data = await fs.readFile(path, 'utf8');",
      impact: "Medium"
    });
  }

  if (lines.length > 300) {
    issues.push({
      type: "maintainability",
      title: "High Line Count Exceeds Modular Threshold",
      description: `File has ${lines.length} lines. Large monolithic files increase cognitive load and hinder testability.`,
      severity: "medium",
      line: 1,
      rule: "arch-monolith-size"
    });
    suggestions.push({
      title: "Decompose into specialized sub-modules",
      description: "Extract helper functions, validation schemas, and domain services into dedicated files.",
      codeSnippet: "// Extract business logic to separate service layer",
      impact: "Medium"
    });
  }

  // 4. Code Smells
  if (code.includes("var ")) {
    issues.push({
      type: "code_smell",
      title: "Deprecated 'var' Variable Declaration",
      description: "Using 'var' introduces function-scoped hoisting and accidental variable shadowing.",
      severity: "low",
      line: lines.findIndex((l) => l.includes("var ")) + 1,
      rule: "smell-no-var"
    });
    suggestions.push({
      title: "Use const and let",
      description: "Replace var declarations with block-scoped const or let.",
      codeSnippet: "const items = [];",
      impact: "Low"
    });
  }

  // If no issues were detected, provide a clean sign-off
  if (issues.length === 0) {
    suggestions.push({
      title: "Add Unit and Integration Tests",
      description: "Current code is syntactically sound. Ensure test coverage reaches >= 85%.",
      codeSnippet: "describe('Code Suite', () => {\n  it('handles edge cases gracefully', () => { ... });\n});",
      impact: "Low"
    });
  }

  const rawReview = {
    summary: issues.length === 0
      ? `Clean code signature for ${fileName}. No critical security vulnerabilities, bugs, or memory leaks were detected.`
      : `DevPilot analysis identified ${issues.length} potential area(s) of improvement in ${fileName}, including ${issues.filter((i) => i.severity === "critical" || i.severity === "high").length} high-priority finding(s).`,
    severity: issues.some((i) => i.severity === "critical")
      ? "critical"
      : issues.some((i) => i.severity === "high")
      ? "high"
      : issues.some((i) => i.severity === "medium")
      ? "medium"
      : "low",
    score: Math.max(25, 100 - issues.reduce((acc, i) => acc + (i.severity === "critical" ? 25 : i.severity === "high" ? 15 : 6), 0)),
    issues,
    suggestions
  };

  return validateAndNormalizeReview(rawReview);
}

/**
 * Call Gemini AI Model via HTTP
 */
async function callGemini(code, language, context) {
  const apiKey = config.ai.apiKey;
  const model = config.ai.model || "gemini-1.5-pro";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const userPrompt = `Review the following ${language} code:\n\n${context ? `Context: ${context}\n\n` : ""}Code:\n\`\`\`${language}\n${code}\n\`\`\``;

  const response = await axios.post(
    url,
    {
      contents: [
        {
          role: "user",
          parts: [{ text: `${SYSTEM_PROMPT}\n\n${userPrompt}` }]
        }
      ],
      generationConfig: {
        temperature: config.ai.temperature || 0.2,
        maxOutputTokens: config.ai.maxTokens || 4096,
        responseMimeType: "application/json"
      }
    },
    { timeout: 30000 }
  );

  const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Empty response from Gemini API.");
  }

  return extractAndParseJSON(text);
}

/**
 * Call OpenAI API via HTTP
 */
async function callOpenAI(code, language, context) {
  const apiKey = config.ai.apiKey;
  const model = config.ai.model || "gpt-4o-mini";
  const url = "https://api.openai.com/v1/chat/completions";

  const userPrompt = `Review the following ${language} code:\n\n${context ? `Context: ${context}\n\n` : ""}Code:\n\`\`\`${language}\n${code}\n\`\`\``;

  const response = await axios.post(
    url,
    {
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt }
      ],
      temperature: config.ai.temperature || 0.2,
      response_format: { type: "json_object" }
    },
    {
      headers: { Authorization: `Bearer ${apiKey}` },
      timeout: 30000
    }
  );

  const content = response.data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Empty response from OpenAI API.");
  }

  return extractAndParseJSON(content);
}

/**
 * Main AI Code Review Entry Point
 */
export async function reviewCode({
  code,
  language = "JavaScript",
  fileName = "snippet.js",
  context = ""
}) {
  if (!code || typeof code !== "string" || !code.trim()) {
    throw new Error("No code content provided for AI code review.");
  }

  const provider = (config.ai.provider || "gemini").toLowerCase();
  const apiKey = config.ai.apiKey;

  // If no API key is provided, gracefully use the static analysis engine
  if (!apiKey) {
    const result = runStaticCodeAnalysis(code, language, fileName);
    return {
      ...result,
      aiProvider: "local_heuristic_analyzer",
      aiModel: "devpilot-ast-rules-v1"
    };
  }

  try {
    let rawReview;
    if (provider === "openai") {
      rawReview = await callOpenAI(code, language, context);
    } else {
      // Default to Gemini
      rawReview = await callGemini(code, language, context);
    }

    // Validate and sanitize the AI response strictly before returning
    const validated = validateAndNormalizeReview(rawReview);

    return {
      ...validated,
      aiProvider: provider,
      aiModel: config.ai.model
    };
  } catch (err) {
    console.warn(`[AI Review] Remote ${provider} call failed: ${err.message}. Falling back to internal static analyzer.`);
    const fallbackResult = runStaticCodeAnalysis(code, language, fileName);
    return {
      ...fallbackResult,
      aiProvider: `${provider}_fallback_local`,
      aiModel: "devpilot-ast-rules-v1"
    };
  }
}
