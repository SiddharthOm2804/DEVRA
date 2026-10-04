import mongoose from "mongoose";

const issueSchema = new mongoose.Schema(
  {
    id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    type: {
      type: String,
      enum: ["bug", "security", "performance", "code_smell", "maintainability"],
      required: true
    },
    title: { type: String, required: true },
    description: { type: String, required: true },
    severity: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium"
    },
    line: { type: Number, default: null },
    rule: { type: String, default: "code-quality" }
  },
  { _id: false }
);

const suggestionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    codeSnippet: { type: String, default: "" },
    impact: { type: String, enum: ["Low", "Medium", "High", "Critical"], default: "Medium" }
  },
  { _id: false }
);

const reviewSchema = new mongoose.Schema(
  {
    repositoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Repository",
      default: null,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    title: {
      type: String,
      default: "AI Automated Code Review"
    },
    fileName: {
      type: String,
      default: "Source Snippet"
    },
    filePath: {
      type: String,
      default: ""
    },
    language: {
      type: String,
      default: "JavaScript"
    },
    codeSnippet: {
      type: String,
      default: ""
    },
    summary: {
      type: String,
      required: true
    },
    severity: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
      required: true
    },
    score: {
      type: Number,
      min: 0,
      max: 100,
      default: 85,
      required: true
    },
    issues: {
      type: [issueSchema],
      default: []
    },
    suggestions: {
      type: [suggestionSchema],
      default: []
    },
    metrics: {
      bugsCount: { type: Number, default: 0 },
      securityCount: { type: Number, default: 0 },
      performanceCount: { type: Number, default: 0 },
      smellsCount: { type: Number, default: 0 },
      maintainabilityCount: { type: Number, default: 0 }
    },
    aiProvider: {
      type: String,
      default: "gemini"
    },
    aiModel: {
      type: String,
      default: "gemini-1.5-pro"
    },
    status: {
      type: String,
      enum: ["completed", "failed"],
      default: "completed"
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes for user and repository lookups
reviewSchema.index({ userId: 1, createdAt: -1 });
reviewSchema.index({ repositoryId: 1, createdAt: -1 });

const Review = mongoose.model("Review", reviewSchema);

export default Review;
