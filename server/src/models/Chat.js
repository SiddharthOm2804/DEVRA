import mongoose from "mongoose";

const sourceReferenceSchema = new mongoose.Schema(
  {
    fileName: { type: String, required: true },
    filePath: { type: String, required: true },
    lineRange: { type: String, default: "" }, // e.g. "12-48"
    snippet: { type: String, default: "" },
    relevanceScore: { type: Number, default: 0 }
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    role: {
      type: String,
      enum: ["user", "assistant", "system"],
      required: true
    },
    content: {
      type: String,
      required: true
    },
    sourceReferences: {
      type: [sourceReferenceSchema],
      default: []
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const chatSchema = new mongoose.Schema(
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
    title: {
      type: String,
      default: "Codebase Exploration"
    },
    messages: {
      type: [messageSchema],
      default: []
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes for user & repository lookup
chatSchema.index({ userId: 1, repositoryId: 1, updatedAt: -1 });

const Chat = mongoose.model("Chat", chatSchema);

export default Chat;
