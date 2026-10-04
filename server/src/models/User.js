import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [60, "Name cannot exceed 60 characters"]
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid email address"
      ]
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false // Exclude password from database queries by default
    },
    organization: {
      type: String,
      trim: true,
      default: "Devra Engineering"
    },
    role: {
      type: String,
      enum: ["developer", "architect", "admin"],
      default: "developer"
    },
    avatar: {
      type: String,
      default: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&h=128&fit=crop&crop=faces"
    },
    // GitHub Integration Fields
    githubId: {
      type: String,
      default: null,
      index: true
    },
    githubUsername: {
      type: String,
      default: null
    },
    githubAvatar: {
      type: String,
      default: null
    },
    githubAccessToken: {
      type: String,
      select: false, // Never return token in queries by default
      default: null
    },
    isGithubConnected: {
      type: Boolean,
      default: false
    },
    // Password Reset Token & Expiry
    resetPasswordToken: {
      type: String,
      default: null,
      index: true
    },
    resetPasswordExpire: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Pre-save hook: Hash password before saving to database
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method: Compare entered password with hashed password
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Method: Remove password & GitHub access token from JSON serialization
userSchema.methods.toJSON = function () {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.githubAccessToken;
  return userObject;
};

const User = mongoose.model("User", userSchema);

export default User;
