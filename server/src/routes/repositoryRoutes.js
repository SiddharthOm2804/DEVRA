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
import {
  requirePermission,
  requireRepositoryAccess,
  PERMISSIONS
} from "../middleware/rbacMiddleware.js";

const router = express.Router();

// All repository routes require JWT authentication
router.use(protect);

// GitHub Integration Endpoints
router.get("/github/status", getGithubStatus);
router.get("/github/repos", getAvailableGithubRepos);
router.post("/github/connect-repo", requirePermission(PERMISSIONS.REPO_CREATE), connectGithubRepo);
router.post("/github/connect-account", requirePermission(PERMISSIONS.REPO_CREATE), connectGithubAccount);
router.post("/github/disconnect", disconnectGithubAccount);

// Standard Repository CRUD Endpoints
router.route("/")
  .get(requirePermission(PERMISSIONS.REPO_READ), getRepositories)
  .post(requirePermission(PERMISSIONS.REPO_CREATE), createRepository);

router.route("/:id")
  .get(requireRepositoryAccess(PERMISSIONS.REPO_READ), getRepository)
  .put(requireRepositoryAccess(PERMISSIONS.REPO_UPDATE), updateRepository)
  .delete(requireRepositoryAccess(PERMISSIONS.REPO_DELETE), deleteRepository);

router.post("/:id/sync", requireRepositoryAccess(PERMISSIONS.REPO_SYNC), syncRepository);

export default router;
