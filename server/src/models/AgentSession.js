import mongoose from "mongoose";

const planStepSchema = new mongoose.Schema(
  {
    stepNumber: { type: Number, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    targetFile: { type: String, required: true },
    action: {
      type: String,
      enum: ["modify", "create", "delete"],
      default: "modify"
    }
  },
  { _id: false }
);

const proposedChangeSchema = new mongoose.Schema(
  {
    filePath: { type: String, required: true },
    action: {
      type: String,
      enum: ["modify", "create", "delete"],
      default: "modify"
    },
    originalContent: { type: String, default: "" },
    proposedContent: { type: String, default: "" },
    diff: { type: String, default: "" },
    summary: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "applied", "rejected"],
      default: "pending"
    }
  },
  { _id: false }
);

const backupSnapshotSchema = new mongoose.Schema(
  {
    filePath: { type: String, required: true },
    content: { type: String, default: "" },
    timestamp: { type: Date, default: Date.now }
  },
  { _id: false }
);

const auditLogSchema = new mongoose.Schema(
  {
    timestamp: { type: Date, default: Date.now },
    action: { type: String, required: true },
    details: { type: String, default: "" }
  },
  { _id: false }
);

const agentSessionSchema = new mongoose.Schema(
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
    goalPrompt: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: [
        "planning",
        "plan_ready",
        "plan_approved",
        "changes_ready",
        "applied",
        "rejected",
        "failed"
      ],
      default: "planning",
      index: true
    },
    plan: {
      summary: { type: String, default: "" },
      rationale: { type: String, default: "" },
      estimatedRisk: {
        type: String,
        enum: ["low", "medium", "high"],
        default: "low"
      },
      affectedFiles: { type: [String], default: [] },
      steps: { type: [planStepSchema], default: [] }
    },
    proposedChanges: {
      type: [proposedChangeSchema],
      default: []
    },
    backupSnapshot: {
      type: [backupSnapshotSchema],
      default: []
    },
    auditLog: {
      type: [auditLogSchema],
      default: []
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes
agentSessionSchema.index({ userId: 1, repositoryId: 1, createdAt: -1 });

const AgentSession = mongoose.model("AgentSession", agentSessionSchema);

export default AgentSession;
