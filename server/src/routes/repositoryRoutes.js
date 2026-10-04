import express from "express";
import {
  getRepositories,
  getRepository,
  createRepository,
  updateRepository,
  deleteRepository,
  syncRepository,
  getGithubStatus,
  getAvailableGithubRepos,
  connectGithubRepo,
  connectGithubAccount,
  disconnectGithubAccount
} from "../controllers/repositoryController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// All repository routes require JWT authentication
router.use(protect);

// GitHub Integration Endpoints (must be defined BEFORE /:id to avoid ID conflict)
router.get("/github/status", getGithubStatus);
router.get("/github/repos", getAvailableGithubRepos);
router.post("/github/connect-repo", connectGithubRepo);
router.post("/github/connect-account", connectGithubAccount);
router.post("/github/disconnect", disconnectGithubAccount);

// Standard Repository CRUD Endpoints
router.route("/")
  .get(getRepositories)
  .post(createRepository);

router.route("/:id")
  .get(getRepository)
  .put(updateRepository)
  .delete(deleteRepository);

router.post("/:id/sync", syncRepository);

export default router;
