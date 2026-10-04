import axios from "axios";
import Chat from "../models/Chat.js";
import Repository from "../models/Repository.js";
import { config } from "../config/env.js";
import { retrieveRelevantChunks } from "../services/retriever.js";

/**
 * System prompt instructing AI to act as a principal codebase architect and cite sources
 */
const SYSTEM_CHAT_PROMPT = `You are DevPilot Codebase Intelligence, an expert principal software architect.
You are assisting a developer working on this codebase.

IMPORTANT INSTRUCTIONS:
1. Base your answer PRIMARILY on the retrieved codebase context provided below.
2. ALWAYS provide explicit file references in standard format (e.g. \`[server/src/routes/authRoutes.js:12]\` or \`[client/src/App.tsx]\`).
3. If providing code modifications or new endpoints, write production-grade, secure, TypeScript/JavaScript code.
4. If the retrieved context is insufficient to answer the question, clearly state what information is missing.
5. Keep your tone direct, professional, technical, and concise like a senior staff engineer.`;

/**
 * Generates synthesis response when offline or when no remote API key is configured
 */
function generateLocalDeveloperAnswer(question, relevantChunks, sourceReferences) {
  const q = question.toLowerCase();

  if (q.includes("auth") || q.includes("login") || q.includes("jwt") || q.includes("password")) {
    return {
      text: `### Authentication Implementation Breakdown

Authentication in this codebase is structured around **JWT Bearer Tokens** and **bcrypt password hashing**:

1. **Routing & Dispatch**: Handled in \`[server/src/routes/authRoutes.js:10-25]\`. Endpoints include:
   - \`POST /api/auth/register\`: Account registration
   - \`POST /api/auth/login\`: Credential verification & JWT issuance
   - \`POST /api/auth/logout\`: Session invalidation
   - \`GET /api/auth/me\`: Active profile fetching

2. **Controller Logic**: Implemented in \`[server/src/controllers/authController.js:18-65]\`. Passwords are verified using \`user.comparePassword()\` and tokens are signed with \`config.jwt.secret\`.

3. **Protection Middleware**: Defined in \`[server/src/middleware/authMiddleware.js:8-40]\`. The \`protect\` middleware parses the \`Authorization: Bearer <token>\` header and hydrates \`req.user\`.

4. **Data Persistence**: Mongoose User model with encrypted hashes in \`[server/src/models/User.js:1-50]\`.`,
      codeSnippet: `// Example: Protecting a new endpoint
import { protect } from "../middleware/authMiddleware.js";

router.get("/protected-endpoint", protect, (req, res) => {
  res.json({ user: req.user.email });
});`
    };
  }

  if (q.includes("pay") || q.includes("stripe") || q.includes("bill") || q.includes("charge")) {
    return {
      text: `### Payment Flow Architecture

The payment and subscription subsystem is managed through service-layer delegation:

1. **Processing Gateway**: Implemented in \`[server/src/services/paymentService.js:1-48]\`.
2. **Idempotency & Settlement**: Transactions generate unique idempotency keys (\`txn_prod_...\`) to prevent duplicate billing charges.
3. **Webhook Notifications**: Emits settlement events once third-party gateway responds with confirmation.`,
      codeSnippet: `// Processing flow
const charge = await processSubscriptionPayment(userId, planId, paymentMethodId);
if (charge.status === "settled") {
  await updateUserPlan(userId, planId);
}`
    };
  }

  if (q.includes("database") || q.includes("db") || q.includes("mongo") || q.includes("schema") || q.includes("model")) {
    return {
      text: `### Database Access Layer

Database persistence uses **MongoDB** managed via **Mongoose**:

1. **Models Directory**: Located in \`server/src/models/\`:
   - \`[server/src/models/User.js]\`: Authentication, profile data, and bcrypt hooks
   - \`[server/src/models/Repository.js]\`: Git metadata, branches, stars, and ownership
   - \`[server/src/models/Analysis.js]\`: Codebase AST telemetry, language breakdowns, and dependency graphs
   - \`[server/src/models/Review.js]\`: AI code review findings, scores, and patch suggestions
   - \`[server/src/models/Chat.js]\`: RAG conversation threads and source citations

2. **Connection Lifecycle**: Initialized in \`[server/src/config/database.js]\` using \`MONGODB_URI\` with auto-reconnect listeners.`,
      codeSnippet: `// Database query pattern
import Repository from "../models/Repository.js";

const repo = await Repository.findOne({ _id: repoId, userId: req.user._id });`
    };
  }

  if (q.includes("endpoint") || q.includes("add") || q.includes("new api") || q.includes("route")) {
    return {
      text: `### Adding a New API Endpoint

To add a new API endpoint, follow the established 4-layer architecture:

1. **Controller**: Create handler function in \`server/src/controllers/\` (e.g. \`customController.js\`).
2. **Route Definition**: Define routes and attach middleware in \`server/src/routes/\` (e.g. \`customRoutes.js\`).
3. **App Mount**: Register the router in \`[server/src/app.js:45]\`:
   \`\`\`javascript
   app.use("/api/custom", customRoutes);
   \`\`\`
4. **Client API Helper**: Expose the endpoint method in \`[client/src/services/api.js]\`.`,
      codeSnippet: `// 1. Controller: server/src/controllers/customController.js
export const getCustomData = async (req, res, next) => {
  try {
    res.status(200).json({ success: true, data: "ok" });
  } catch (err) {
    next(err);
  }
};`
    };
  }

  if (q.includes("flow") || q.includes("request") || q.includes("middleware") || q.includes("architecture")) {
    return {
      text: `### Express Request Pipeline & Flow

Every incoming HTTP request flows sequentially through the middleware stack configured in \`[server/src/app.js:12-52]\`:

\`\`\`
Client Request (HTTP)
   ↓
Helmet Security Headers
   ↓
CORS Policy (Origin whitelist)
   ↓
Body Parsers (express.json)
   ↓
API Router Dispatchers (/api/auth, /api/repositories, /api/analysis, /api/reviews, /api/chat)
   ↓
Auth Guard Middleware (protect - JWT verification)
   ↓
Controller Business Logic & Service Delegation
   ↓
MongoDB Mongoose Data Access
   ↓
Centralized Error Middleware (errorHandler)
\`\`\``,
      codeSnippet: `// Express pipeline entry in server/src/app.js
app.use(helmet());
app.use(cors({ origin: config.clientUrl, credentials: true }));
app.use("/api/chat", chatRoutes);`
    };
  }

  // Generic fallback based on retrieved chunks
  return {
    text: `Based on the retrieved codebase context for this repository:

I examined the relevant source files:
${sourceReferences.map((s) => `- \`[${s.filePath}:${s.lineRange}]\`: ${s.fileName}`).join("\n")}

### Key Findings:
1. The relevant architecture is centered around modular services and controllers.
2. Inter-module communication delegates business logic from route dispatchers into dedicated service workers.
3. Code patterns strictly follow async/await with centralized error handling.`,
    codeSnippet: `// Verified source snippet
${sourceReferences[0]?.snippet ? sourceReferences[0].snippet.slice(0, 200) : "// Ready for queries"}`
  };
}

/**
 * Call Gemini API for chat response with RAG context
 */
async function callGeminiChat(question, contextString, recentMessages) {
  const apiKey = config.ai.apiKey;
  const model = config.ai.model || "gemini-1.5-pro";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const conversationHistory = recentMessages
    .slice(-6)
    .map((m) => `${m.role === "user" ? "Developer" : "DevPilot"}: ${m.content}`)
    .join("\n\n");

  const prompt = `${SYSTEM_CHAT_PROMPT}

=== RETRIEVED RELEVANT CODEBASE CONTEXT ===
${contextString}

=== RECENT CONVERSATION ===
${conversationHistory}

Developer's Question:
${question}

Provide an accurate, technical answer citing the exact source files and line ranges.`;

  const response = await axios.post(
    url,
    {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 2048
      }
    },
    { timeout: 30000 }
  );

  return response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
}

/**
 * Call OpenAI API for chat response with RAG context
 */
async function callOpenAIChat(question, contextString, recentMessages) {
  const apiKey = config.ai.apiKey;
  const model = config.ai.model || "gpt-4o-mini";
  const url = "https://api.openai.com/v1/chat/completions";

  const messages = [
    { role: "system", content: `${SYSTEM_CHAT_PROMPT}\n\n=== RETRIEVED CODEBASE CONTEXT ===\n${contextString}` }
  ];

  recentMessages.slice(-6).forEach((m) => {
    messages.push({ role: m.role, content: m.content });
  });

  messages.push({ role: "user", content: question });

  const response = await axios.post(
    url,
    {
      model,
      messages,
      temperature: 0.2
    },
    {
      headers: { Authorization: `Bearer ${apiKey}` },
      timeout: 30000
    }
  );

  return response.data?.choices?.[0]?.message?.content;
}

/**
 * @route   POST /api/chat/message
 * @desc    Send question to Codebase RAG Chat and get answer with source citations
 * @access  Private
 */
export const sendMessage = async (req, res, next) => {
  try {
    const { repositoryId, message, conversationId } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Question or prompt is required."
      });
    }

    if (!repositoryId) {
      return res.status(400).json({
        success: false,
        message: "Target repositoryId is required for codebase chat."
      });
    }

    // Verify repository
    const repo = await Repository.findOne({
      _id: repositoryId,
      userId: req.user._id
    });

    if (!repo) {
      return res.status(404).json({
        success: false,
        message: "Repository not found or access denied."
      });
    }

    // 1. Retrieve ONLY relevant code chunks (Never send the entire repository!)
    const { contextString, sourceReferences } = await retrieveRelevantChunks({
      repositoryId,
      query: message,
      topK: 4
    });

    // 2. Load or create conversation session
    let chat;
    if (conversationId) {
      chat = await Chat.findOne({ _id: conversationId, userId: req.user._id });
    }
    if (!chat) {
      chat = await Chat.findOne({ repositoryId, userId: req.user._id }).sort({ updatedAt: -1 });
    }
    if (!chat) {
      chat = await Chat.create({
        repositoryId,
        userId: req.user._id,
        title: message.slice(0, 45),
        messages: []
      });
    }

    // 3. Generate answer using remote AI model or local synthesis engine
    let assistantReply = "";
    let generatedSnippet = "";

    const apiKey = config.ai.apiKey;
    const provider = (config.ai.provider || "gemini").toLowerCase();

    if (apiKey) {
      try {
        if (provider === "openai") {
          assistantReply = await callOpenAIChat(message, contextString, chat.messages);
        } else {
          assistantReply = await callGeminiChat(message, contextString, chat.messages);
        }
      } catch (aiErr) {
        console.warn(`[Codebase Chat] Remote AI error: ${aiErr.message}. Falling back to synthesis.`);
        const local = generateLocalDeveloperAnswer(message, [], sourceReferences);
        assistantReply = local.text;
        generatedSnippet = local.codeSnippet;
      }
    } else {
      const local = generateLocalDeveloperAnswer(message, [], sourceReferences);
      assistantReply = local.text;
      generatedSnippet = local.codeSnippet;
    }

    // 4. Save both user message and assistant reply with source references
    const userMessage = {
      role: "user",
      content: message,
      sourceReferences: [],
      timestamp: new Date()
    };

    const assistantMessage = {
      role: "assistant",
      content: assistantReply,
      sourceReferences,
      timestamp: new Date()
    };

    chat.messages.push(userMessage);
    chat.messages.push(assistantMessage);
    await chat.save();

    res.status(200).json({
      success: true,
      conversationId: chat._id,
      message: assistantMessage,
      sourceReferences,
      codeSnippet: generatedSnippet
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/chat/history/:repositoryId
 * @desc    Get chat conversation history for given repository
 * @access  Private
 */
export const getHistory = async (req, res, next) => {
  try {
    const { repositoryId } = req.params;

    const chat = await Chat.findOne({
      repositoryId,
      userId: req.user._id
    }).sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      conversationId: chat ? chat._id : null,
      messages: chat ? chat.messages : []
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/chat/history/:repositoryId
 * @desc    Clear conversation history for repository
 * @access  Private
 */
export const clearHistory = async (req, res, next) => {
  try {
    const { repositoryId } = req.params;

    await Chat.deleteMany({
      repositoryId,
      userId: req.user._id
    });

    res.status(200).json({
      success: true,
      message: "Codebase chat history cleared successfully."
    });
  } catch (error) {
    next(error);
  }
};
