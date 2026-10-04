import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "5000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  isProduction: process.env.NODE_ENV === "production",
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  mongodb: {
    uri: process.env.MONGODB_URI || "mongodb://localhost:27017/devra"
  },
  jwt: {
    secret: process.env.JWT_SECRET || "default_fallback_change_me_in_prod",
    expiresIn: process.env.JWT_EXPIRES_IN || "7d"
  },
  github: {
    clientId: process.env.GITHUB_CLIENT_ID || "",
    clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
    callbackUrl: process.env.GITHUB_CALLBACK_URL || "http://localhost:5000/api/auth/github/callback"
  },
  ai: {
    provider: process.env.AI_PROVIDER || "gemini",
    apiKey: process.env.AI_API_KEY || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || "",
    model: process.env.AI_MODEL || "gemini-1.5-pro",
    maxTokens: parseInt(process.env.AI_MAX_TOKENS || "4096", 10),
    temperature: parseFloat(process.env.AI_TEMPERATURE || "0.2")
  }
};
