import mongoose from "mongoose";

const fileItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    size: { type: String, default: "1.0 KB" },
    commit: { type: String, default: "Initial commit" },
    time: { type: String, default: "Just now" },
    type: { type: String, enum: ["file", "dir"], default: "file" }
  },
  { _id: false }
);

const repositorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    // GitHub Integration Details
    githubId: {
      type: Number,
      index: true,
      default: null
    },
    name: {
      type: String,
      required: [true, "Repository name is required"],
      trim: true
    },
    fullName: {
      type: String,
      trim: true,
      default: function () {
        return this.owner?.login ? `${this.owner.login}/${this.name}` : this.name;
      }
    },
    owner: {
      login: { type: String, default: "" },
      avatarUrl: { type: String, default: "" },
      htmlUrl: { type: String, default: "" }
    },
    description: {
      type: String,
      trim: true,
      default: ""
    },
    url: {
      type: String,
      default: ""
    },
    gitUrl: {
      type: String,
      default: ""
    },
    defaultBranch: {
      type: String,
      default: "main"
    },
    activeBranch: {
      type: String,
      default: "main"
    },
    language: {
      type: String,
      default: "TypeScript"
    },
    languageColor: {
      type: String,
      default: "#38bdf8"
    },
    stars: {
      type: Number,
      default: 0
    },
    forks: {
      type: Number,
      default: 0
    },
    openIssues: {
      type: Number,
      default: 0
    },
    isPrivate: {
      type: Boolean,
      default: false
    },
    visibility: {
      type: String,
      enum: ["public", "private", "internal"],
      default: "public"
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    },
    // Platform Code Health & Architecture Metrics
    health: {
      type: Number,
      min: 0,
      max: 100,
      default: 95
    },
    qualityGrade: {
      type: String,
      enum: ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D", "F"],
      default: "A+"
    },
    securityStatus: {
      type: String,
      enum: ["Secure", "Notice", "Warning", "Critical"],
      default: "Secure"
    },
    lastScanned: {
      type: Date,
      default: Date.now
    },
    branchCount: {
      type: Number,
      default: 1
    },
    commitCount: {
      type: Number,
      default: 1
    },
    testCoverage: {
      type: Number,
      min: 0,
      max: 100,
      default: 85.0
    },
    contributors: {
      type: Number,
      default: 1
    },
    filesCount: {
      type: Number,
      default: 10
    },
    isStarred: {
      type: Boolean,
      default: false
    },
    fileTree: {
      type: [fileItemSchema],
      default: [
        { name: "src/index.ts", size: "3.2 KB", commit: "Initial setup", time: "Just now", type: "file" },
        { name: "package.json", size: "1.1 KB", commit: "Configure dependencies", time: "Just now", type: "file" },
        { name: "README.md", size: "2.4 KB", commit: "Add documentation", time: "Just now", type: "file" }
      ]
    }
  },
  {
    timestamps: true
  }
);

// Compound index to ensure uniqueness of repo name per user
repositorySchema.index({ userId: 1, name: 1 }, { unique: true });
repositorySchema.index({ userId: 1, githubId: 1 }, { sparse: true });

const Repository = mongoose.model("Repository", repositorySchema);

export default Repository;
