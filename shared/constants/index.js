export const APP_NAME = "Devra";
export const API_VERSION = "v1";

export const DEFAULT_SERVER_PORT = 5000;
export const DEFAULT_CLIENT_PORT = 5173;

export const API_ENDPOINTS = {
  HEALTH: "/api/health",
  AUTH: "/api/auth",
  REPOSITORIES: "/api/repositories",
  ANALYSIS: "/api/analysis",
  REVIEWS: "/api/reviews",
  CHAT: "/api/chat"
};

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500
};
