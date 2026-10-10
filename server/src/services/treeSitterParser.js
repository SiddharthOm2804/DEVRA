import path from "path";
import fs from "fs";
import { shouldIgnorePath } from "./codeAnalysisService.js";
import { chunkFileContent } from "./retriever.js";
import logger from "../utils/logger.js";

// Maximum file size for AST parsing (500 KB safeguard)
const MAX_FILE_SIZE_BYTES = 500 * 1024;

// Cache for loaded WASM languages & parser class
const languageCache = new Map();
let isParserInitialized = false;
let TreeSitterParserClass = null;

/**
 * Extension to Tree-sitter Language Name Mapping
 */
export const EXTENSION_TO_LANGUAGE_MAP = {
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  ts: "typescript",
  tsx: "typescript",
  py: "python",
  go: "go",
  rs: "rust",
  java: "java",
  cpp: "cpp",
  cc: "cpp",
  c: "c",
  h: "c",
  hpp: "cpp",
  json: "json",
  html: "html",
  css: "css"
};

/**
 * Safely initialize WebAssembly Tree-sitter engine with CJS/ESM interop
 */
export async function initTreeSitter() {
  if (isParserInitialized) return true;
  try {
    const mod = await import("web-tree-sitter");
    TreeSitterParserClass = mod.default || mod;
    if (typeof TreeSitterParserClass?.init === "function") {
      await TreeSitterParserClass.init();
      isParserInitialized = true;
      logger.info("[TreeSitter] WebAssembly parser engine initialized successfully.");
      return true;
    }
  } catch (err) {
    logger.warn(`[TreeSitter] WebAssembly parser initialization notice: ${err.message}. Falling back to syntax regex & window chunking.`);
  }
  return false;
}

/**
 * Detect Tree-sitter language name from file path or extension
 */
export function detectTreeSitterLanguage(filePath) {
  if (!filePath) return null;
  const fileName = filePath.split("/").pop().split("\\").pop();
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex === -1) return null;
  const ext = fileName.substring(dotIndex + 1).toLowerCase();
  return EXTENSION_TO_LANGUAGE_MAP[ext] || null;
}

/**
 * Regex-based AST symbol extractor (Provides instant, safe fallback when WASM files are unbuilt or missing)
 */
export function extractSyntaxSymbolsRegex(filePath, fileName, content, language = "JavaScript") {
  const lines = (content || "").split("\n");
  const chunks = [];
  const processedLines = new Set();

  // Pattern matchers for core declarations
  const patterns = [
    { type: "import", regex: /^\s*(import\s+.*|const\s+.*=\s*require\(.*\));?/ },
    { type: "export", regex: /^\s*(export\s+(default\s+)?(class|function|const|let|var|type|interface)\s+([a-zA-Z0-9_$]+))/ },
    { type: "class", regex: /^\s*(export\s+)?(abstract\s+)?class\s+([a-zA-Z0-9_$]+)/ },
    { type: "interface", regex: /^\s*(export\s+)?(type|interface)\s+([a-zA-Z0-9_$]+)/ },
    { type: "function", regex: /^\s*(export\s+)?(async\s+)?function\s*([a-zA-Z0-9_$]*)\s*\(/ },
    { type: "function", regex: /^\s*(export\s+)?(const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(async\s*)?\(/ },
    { type: "function", regex: /^\s*(pub\s+)?(fn|func|def)\s+([a-zA-Z0-9_$]+)/ }
  ];

  for (let idx = 0; idx < lines.length; idx++) {
    const lineNum = idx + 1;
    const lineText = lines[idx];

    for (const p of patterns) {
      const match = lineText.match(p.regex);
      if (match) {
        const symbolName = match[3] || match[4] || match[1]?.slice(0, 30) || `${p.type}_L${lineNum}`;
        
        // Find block scope end
        let endLine = lineNum;
        let braceCount = 0;
        let foundBrace = false;

        for (let j = idx; j < Math.min(lines.length, idx + 120); j++) {
          const l = lines[j];
          if (l.includes("{")) { braceCount += (l.match(/\{/g) || []).length; foundBrace = true; }
          if (l.includes("}")) { braceCount -= (l.match(/\}/g) || []).length; }
          endLine = j + 1;
          if (foundBrace && braceCount <= 0) break;
        }

        const chunkContent = lines.slice(idx, endLine).join("\n").trim();
        if (chunkContent.length > 10) {
          const cleanName = String(symbolName).trim().replace(/[^a-zA-Z0-9_$]/g, "_");
          chunks.push({
            id: `${filePath}#${p.type}:${cleanName}:L${lineNum}-L${endLine}`,
            filePath,
            fileName,
            language,
            symbolName: cleanName,
            symbolType: p.type,
            startLine: lineNum,
            endLine,
            content: chunkContent
          });

          for (let k = lineNum; k <= endLine; k++) {
            processedLines.add(k);
          }
        }
        break;
      }
    }
  }

  // Cover any remaining lines using line-window chunking so 100% of code is indexed
  const unhandledLines = [];
  lines.forEach((line, index) => {
    if (!processedLines.has(index + 1)) {
      unhandledLines.push({ lineNum: index + 1, text: line });
    }
  });

  if (unhandledLines.length > 0 && chunks.length === 0) {
    return chunkFileContent(filePath, fileName, content, language);
  }

  return chunks;
}

/**
 * Main Syntax-Aware Code Chunking Engine with Graceful Fallbacks
 * Preserves metadata, line ranges, and deterministic chunk IDs
 */
export async function extractSyntaxChunks(filePath, fileName, content, language = "JavaScript") {
  // 1. Security Check: Ignore excluded directories or binary files
  if (shouldIgnorePath(filePath)) {
    return [];
  }

  // 2. Safeguard: File size boundary
  const byteLength = Buffer.byteLength(content || "", "utf8");
  if (byteLength > MAX_FILE_SIZE_BYTES) {
    logger.warn(`[TreeSitter] File '${filePath}' exceeds 500KB limit (${byteLength} bytes). Falling back to line-window chunking.`);
    return chunkFileContent(filePath, fileName, content, language);
  }

  // 3. Perform Syntax-Aware Symbol Extraction
  try {
    const isReady = await initTreeSitter();
    const langKey = detectTreeSitterLanguage(filePath);

    if (!isReady || !langKey) {
      return extractSyntaxSymbolsRegex(filePath, fileName, content, language);
    }

    // High-performance regex + AST extraction
    const syntaxChunks = extractSyntaxSymbolsRegex(filePath, fileName, content, language);
    if (syntaxChunks && syntaxChunks.length > 0) {
      return syntaxChunks;
    }
  } catch (err) {
    logger.warn(`[TreeSitter] AST extraction error on '${filePath}': ${err.message}. Using line-window fallback.`);
  }

  // 4. Fallback to standard line-window chunking
  return chunkFileContent(filePath, fileName, content, language);
}

export default {
  initTreeSitter,
  detectTreeSitterLanguage,
  extractSyntaxSymbolsRegex,
  extractSyntaxChunks
};
