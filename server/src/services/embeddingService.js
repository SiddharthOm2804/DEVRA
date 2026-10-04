import axios from "axios";
import { config } from "../config/env.js";

const DEFAULT_VECTOR_DIM = 128;

/**
 * Calculates cosine similarity between two vector arrays
 */
export function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Deterministic semantic TF-IDF hashing vectorizer
 * Produces an L2-normalized 128-dimensional embedding vector without external API dependencies
 */
export function generateDeterministicEmbedding(text = "") {
  const vector = new Float32Array(DEFAULT_VECTOR_DIM);
  if (!text || typeof text !== "string") return Array.from(vector);

  // Normalize and tokenize code identifiers and keywords
  const normalized = text
    .replace(/([a-z])([A-Z])/g, "$1 $2") // split camelCase
    .toLowerCase();

  const tokens = normalized.match(/[a-z0-9_\-\.\/]{2,}/g) || [];
  if (tokens.length === 0) return Array.from(vector);

  // Frequency mapping with domain keyword weighting
  tokens.forEach((token) => {
    // Hash token to a bucket index 0..DEFAULT_VECTOR_DIM-1
    let hash = 5381;
    for (let i = 0; i < token.length; i++) {
      hash = (hash * 33) ^ token.charCodeAt(i);
    }
    const bucket = Math.abs(hash) % DEFAULT_VECTOR_DIM;

    // Weight boosted for architectural keywords
    let weight = 1.0;
    if (
      token.includes("auth") ||
      token.includes("login") ||
      token.includes("token") ||
      token.includes("jwt")
    ) {
      weight = 2.5;
    } else if (
      token.includes("pay") ||
      token.includes("charge") ||
      token.includes("stripe")
    ) {
      weight = 2.5;
    } else if (
      token.includes("db") ||
      token.includes("mongo") ||
      token.includes("model") ||
      token.includes("schema")
    ) {
      weight = 2.2;
    } else if (
      token.includes("route") ||
      token.includes("controller") ||
      token.includes("service") ||
      token.includes("api")
    ) {
      weight = 2.0;
    }

    vector[bucket] += weight;
  });

  // L2 Normalization
  let norm = 0;
  for (let i = 0; i < DEFAULT_VECTOR_DIM; i++) {
    norm += vector[i] * vector[i];
  }
  norm = Math.sqrt(norm);

  if (norm > 0) {
    for (let i = 0; i < DEFAULT_VECTOR_DIM; i++) {
      vector[i] /= norm;
    }
  }

  return Array.from(vector);
}

/**
 * Generate embedding using Google Gemini API
 */
async function getGeminiEmbedding(text) {
  const apiKey = config.ai.apiKey;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`;

  const response = await axios.post(
    url,
    {
      model: "models/text-embedding-004",
      content: {
        parts: [{ text: text.slice(0, 4000) }]
      }
    },
    { timeout: 15000 }
  );

  const values = response.data?.embedding?.values;
  if (!values || !Array.isArray(values)) {
    throw new Error("Invalid embedding response from Gemini.");
  }

  return values;
}

/**
 * Generate embedding using OpenAI API
 */
async function getOpenAIEmbedding(text) {
  const apiKey = config.ai.apiKey;
  const url = "https://api.openai.com/v1/embeddings";

  const response = await axios.post(
    url,
    {
      model: "text-embedding-3-small",
      input: text.slice(0, 4000)
    },
    {
      headers: { Authorization: `Bearer ${apiKey}` },
      timeout: 15000
    }
  );

  const values = response.data?.data?.[0]?.embedding;
  if (!values || !Array.isArray(values)) {
    throw new Error("Invalid embedding response from OpenAI.");
  }

  return values;
}

/**
 * Main embedding generator with automatic remote API / local fallback
 */
export async function generateEmbedding(text = "") {
  const apiKey = config.ai.apiKey;
  const provider = (config.ai.provider || "gemini").toLowerCase();

  if (!apiKey) {
    return generateDeterministicEmbedding(text);
  }

  try {
    if (provider === "openai") {
      return await getOpenAIEmbedding(text);
    } else {
      return await getGeminiEmbedding(text);
    }
  } catch (err) {
    // Graceful fallback to deterministic semantic vectorizer
    return generateDeterministicEmbedding(text);
  }
}

/**
 * Batch generate embeddings for multiple code chunks
 */
export async function batchGenerateEmbeddings(chunks = []) {
  const results = [];
  for (const chunk of chunks) {
    const text = typeof chunk === "string" ? chunk : chunk.content || "";
    const vec = await generateEmbedding(text);
    results.push(vec);
  }
  return results;
}
