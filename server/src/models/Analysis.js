import mongoose from "mongoose";

const fileAnalysisSchema = new mongoose.Schema(
  {
    path: { type: String, required: true },
    name: { type: String, required: true },
    extension: { type: String, default: "" },
    language: { type: String, default: "Plain Text" },
    size: { type: Number, default: 0 },
    lines: { type: Number, default: 0 },
    isEntryPoint: { type: Boolean, default: false },
    module: { type: String, default: "root" }
  },
  { _id: false }
);

const directoryAnalysisSchema = new mongoose.Schema(
  {
    path: { type: String, required: true },
    name: { type: String, required: true },
    depth: { type: Number, default: 0 },
    fileCount: { type: Number, default: 0 }
  },
  { _id: false }
);

const languageStatSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    fileCount: { type: Number, default: 0 },
    lines: { type: Number, default: 0 },
    bytes: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    color: { type: String, default: "#38bdf8" }
  },
  { _id: false }
);

const dependencySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    version: { type: String, default: "latest" },
    type: { type: String, enum: ["production", "development", "peer", "system"], default: "production" },
    ecosystem: { type: String, default: "npm" }
  },
  { _id: false }
);

const moduleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    path: { type: String, required: true },
    fileCount: { type: Number, default: 0 },
    primaryLanguage: { type: String, default: "TypeScript" },
    description: { type: String, default: "" }
  },
  { _id: false }
);

const entryPointSchema = new mongoose.Schema(
  {
    path: { type: String, required: true },
    language: { type: String, default: "TypeScript" },
    type: { type: String, enum: ["client", "server", "cli", "library", "worker"], default: "server" }
  },
  { _id: false }
);

const relationshipSchema = new mongoose.Schema(
  {
    from: { type: String, required: true },
    to: { type: String, required: true },
    type: { type: String, default: "imports" }
  },
  { _id: false }
);

const analysisSchema = new mongoose.Schema(
  {
    repositoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Repository",
      required: true,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    totalFiles: {
      type: Number,
      default: 0
    },
    totalLines: {
      type: Number,
      default: 0
    },
    totalDirectories: {
      type: Number,
      default: 0
    },
    files: {
      type: [fileAnalysisSchema],
      default: []
    },
    directories: {
      type: [directoryAnalysisSchema],
      default: []
    },
    languages: {
      type: [languageStatSchema],
      default: []
    },
    dependencies: {
      type: [dependencySchema],
      default: []
    },
    modules: {
      type: [moduleSchema],
      default: []
    },
    entryPoints: {
      type: [entryPointSchema],
      default: []
    },
    relationships: {
      type: [relationshipSchema],
      default: []
    },
    summary: {
      primaryLanguage: { type: String, default: "TypeScript" },
      architecturePattern: { type: String, default: "Modular Monorepo / Layered Architecture" },
      status: { type: String, default: "complete" }
    },
    generatedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Index to quickly get latest analysis per repository
analysisSchema.index({ repositoryId: 1, createdAt: -1 });

const Analysis = mongoose.model("Analysis", analysisSchema);

export default Analysis;
