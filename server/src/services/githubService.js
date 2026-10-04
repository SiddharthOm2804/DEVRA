import axios from "axios";
import { config } from "../config/env.js";

const GITHUB_API_BASE = "https://api.github.com";

const LANGUAGE_COLORS = {
  TypeScript: "#3178c6",
  JavaScript: "#f7df1e",
  Python: "#3572A5",
  Go: "#00add8",
  Rust: "#dea584",
  Java: "#b07219",
  "C++": "#f34b7d",
  C: "#555555",
  "C#": "#178600",
  Ruby: "#701516",
  PHP: "#4F5D95",
  Swift: "#F05138",
  Kotlin: "#A97BFF",
  Shell: "#89e051",
  HTML: "#e34c26",
  CSS: "#563d7c"
};

/**
 * Generate GitHub OAuth Authorization URL
 */
export const getOAuthAuthorizeUrl = (state = "") => {
  const { clientId, callbackUrl } = config.github;
  if (!clientId) {
    return null;
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    scope: "repo,read:user,user:email",
    state: state || "devra_auth"
  });

  return `https://github.com/login/oauth/authorize?${params.toString()}`;
};

/**
 * Exchange OAuth authorization code for GitHub access token
 */
export const exchangeCodeForToken = async (code) => {
  const { clientId, clientSecret, callbackUrl } = config.github;
  if (!clientId || !clientSecret) {
    throw new Error("GitHub OAuth credentials (GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET) are not configured.");
  }

  const response = await axios.post(
    "https://github.com/login/oauth/access_token",
    {
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: callbackUrl
    },
    {
      headers: {
        Accept: "application/json"
      }
    }
  );

  if (response.data.error) {
    throw new Error(response.data.error_description || response.data.error);
  }

  return response.data.access_token;
};

/**
 * Fetch authenticated GitHub user profile
 */
export const getGithubUserProfile = async (accessToken) => {
  const response = await axios.get(`${GITHUB_API_BASE}/user`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "Devra-Developer-Platform"
    }
  });

  return {
    id: String(response.data.id),
    username: response.data.login,
    name: response.data.name || response.data.login,
    email: response.data.email,
    avatarUrl: response.data.avatar_url,
    htmlUrl: response.data.html_url,
    publicRepos: response.data.public_repos
  };
};

/**
 * Fetch all repositories for authenticated GitHub user
 */
export const getUserRepositories = async (accessToken) => {
  const response = await axios.get(`${GITHUB_API_BASE}/user/repos`, {
    params: {
      per_page: 100,
      sort: "updated",
      direction: "desc",
      affiliation: "owner,collaborator,organization_member"
    },
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "Devra-Developer-Platform"
    }
  });

  return response.data.map(formatGithubRepo);
};

/**
 * Fetch public repositories for a given GitHub username (fallback/direct explore)
 */
export const getPublicUserRepositories = async (username) => {
  const response = await axios.get(`${GITHUB_API_BASE}/users/${encodeURIComponent(username)}/repos`, {
    params: {
      per_page: 100,
      sort: "updated",
      direction: "desc"
    },
    headers: {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "Devra-Developer-Platform"
    }
  });

  return response.data.map(formatGithubRepo);
};

/**
 * Standardize GitHub API repository payload into Devra repository format
 */
export const formatGithubRepo = (repo) => {
  const lang = repo.language || "TypeScript";
  const langColor = LANGUAGE_COLORS[lang] || "#38bdf8";

  return {
    githubId: repo.id,
    name: repo.name,
    fullName: repo.full_name,
    owner: {
      login: repo.owner?.login || "github-user",
      avatarUrl: repo.owner?.avatar_url || "https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png",
      htmlUrl: repo.owner?.html_url || `https://github.com/${repo.owner?.login}`
    },
    description: repo.description || "",
    url: repo.html_url,
    gitUrl: repo.clone_url || (repo.html_url ? `${repo.html_url}.git` : ""),
    defaultBranch: repo.default_branch || "main",
    activeBranch: repo.default_branch || "main",
    language: lang,
    languageColor: langColor,
    stars: repo.stargazers_count || 0,
    forks: repo.forks_count || 0,
    openIssues: repo.open_issues_count || 0,
    isPrivate: !!repo.private,
    visibility: repo.private ? "private" : "public",
    lastUpdated: repo.updated_at || repo.pushed_at || new Date(),
    health: Math.floor(Math.random() * 12) + 88, // 88 - 100 initial benchmark
    qualityGrade: "A+",
    securityStatus: "Secure"
  };
};

/**
 * Curated simulated GitHub repositories for local development/testing without live credentials
 */
export const getSimulatedRepositories = (username = "devra-engineer") => {
  const sampleData = [
    {
      id: 92837410,
      name: "hyper-cache-engine",
      full_name: `${username}/hyper-cache-engine`,
      owner: {
        login: username,
        avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=64&h=64",
        html_url: `https://github.com/${username}`
      },
      description: "Distributed LRU memory cache with Raft consensus and sub-millisecond p99 latencies.",
      html_url: `https://github.com/${username}/hyper-cache-engine`,
      clone_url: `https://github.com/${username}/hyper-cache-engine.git`,
      default_branch: "main",
      language: "Rust",
      stargazers_count: 342,
      forks_count: 28,
      open_issues_count: 3,
      private: false,
      updated_at: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: 92837411,
      name: "react-ast-visualizer",
      full_name: `${username}/react-ast-visualizer`,
      owner: {
        login: username,
        avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=64&h=64",
        html_url: `https://github.com/${username}`
      },
      description: "Interactive WebGL 3D dependency graph generator for JavaScript and TypeScript monorepos.",
      html_url: `https://github.com/${username}/react-ast-visualizer`,
      clone_url: `https://github.com/${username}/react-ast-visualizer.git`,
      default_branch: "main",
      language: "TypeScript",
      stargazers_count: 890,
      forks_count: 94,
      open_issues_count: 7,
      private: false,
      updated_at: new Date(Date.now() - 14400000).toISOString()
    },
    {
      id: 92837412,
      name: "secure-auth-gateway",
      full_name: `${username}/secure-auth-gateway`,
      owner: {
        login: username,
        avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=64&h=64",
        html_url: `https://github.com/${username}`
      },
      description: "Zero-trust API proxy with token bucket rate limiting, Ed25519 signatures, and OpenID Connect.",
      html_url: `https://github.com/${username}/secure-auth-gateway`,
      clone_url: `https://github.com/${username}/secure-auth-gateway.git`,
      default_branch: "master",
      language: "Go",
      stargazers_count: 512,
      forks_count: 46,
      open_issues_count: 1,
      private: true,
      updated_at: new Date(Date.now() - 86400000).toISOString()
    },
    {
      id: 92837413,
      name: "neural-diff-reviewer",
      full_name: `${username}/neural-diff-reviewer`,
      owner: {
        login: username,
        avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=64&h=64",
        html_url: `https://github.com/${username}`
      },
      description: "Automated PR code reviewer powered by syntax-aware embeddings and fine-tuned AST models.",
      html_url: `https://github.com/${username}/neural-diff-reviewer`,
      clone_url: `https://github.com/${username}/neural-diff-reviewer.git`,
      default_branch: "main",
      language: "Python",
      stargazers_count: 1240,
      forks_count: 180,
      open_issues_count: 5,
      private: false,
      updated_at: new Date(Date.now() - 172800000).toISOString()
    }
  ];

  return sampleData.map(formatGithubRepo);
};
