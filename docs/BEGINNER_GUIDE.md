# Devra Beginner Guide

This guide explains how to start Devra, find your way around the app, and try the main features. You can use the app without knowing the technical terms first.

## 1. What is Devra?

Devra is a web app for exploring software repositories. Its main areas are:

- **Repositories**: connect a GitHub account or add a repository entry, then open it to see repository information.
- **Code Reviews**: submit a code snippet and inspect the review findings.
- **Chat**: ask questions about the selected codebase.
- **AI Agent Mode**: describe a change you want. Read the proposed plan and diff, then choose whether to apply it.
- **Dashboard**: shortcuts and a high-level overview. Some scores, reviews, and activity examples on this page are demo data; they are not a scan result.

## 2. Run Devra on your computer

### What you need

- Node.js 20 or newer and npm
- Docker Desktop (to start MongoDB)
- An AI provider API key only if you want to use AI-powered features

### Start the app

Open a terminal in the Devra project folder and run:

```bash
npm run setup
docker compose up -d mongodb
npm run dev
```

Keep the terminal open while you use Devra. Open [http://localhost:5173](http://localhost:5173) in your browser. The backend health page is [http://localhost:5001/api/health](http://localhost:5001/api/health).

If you want AI-backed reviews, chat, or agent plans, and you do not already have a root `.env`, copy `.env.example` to `.env` in the project root. In PowerShell use `Copy-Item .env.example .env`; on macOS/Linux use `cp .env.example .env`. Then add your provider settings. For Gemini, for example:

```dotenv
AI_PROVIDER=gemini
AI_API_KEY=put-your-own-key-here
```

Never share or commit your `.env` file or API key. Without an AI key, some AI actions may report that provider configuration is missing. MongoDB is needed to create an account and save app data. Redis is optional for local use; Devra falls back to a temporary in-memory vector store.

To enable **Sign in with GitHub**, create a GitHub OAuth App and set `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` in the root `.env`. Set the OAuth App callback URL to `http://localhost:5001/api/auth/github/callback` for `npm run dev`, or `http://localhost:5000/api/auth/github/callback` for Docker Compose, and set `GITHUB_CALLBACK_URL` to that same URL. Restart the backend after changing these values. GitHub sign-in stays unavailable until both credentials are configured.

Devra creates and signs in accounts as soon as the registration form is submitted. SMTP is only used for password reset emails and can be configured if that feature is needed.

For the full Docker setup, generate separate random values for `JWT_SECRET` and `GITHUB_WEBHOOK_SECRET`, put them in `.env`, and run `docker compose up --build -d`. The app will be at [http://localhost](http://localhost) and the API at [http://localhost:5000/api/health](http://localhost:5000/api/health). Docker Compose requires both secrets because its backend runs in production mode.

To stop the app, press `Ctrl+C` in its terminal. To stop MongoDB, run `docker compose down`. Your local database remains in its Docker volume unless you explicitly remove that volume.

## 3. First time in the app

1. **Create an account** from the Register page. Devra creates the account and signs you in immediately.
2. **Open Repositories** from the navigation. Connect GitHub to browse repositories you can access, or choose **Add Custom Repository** to create a repository entry with its name and details.
3. **Select a repository card** to open its page. Use the page controls to view the overview, file list, architecture tabs, and 3D Explorer. If you have connected a GitHub repository, use **Sync** to refresh its information.
4. **Try Code Reviews** from the navigation. Choose **New Code Review**, enter a title/context, paste a small code snippet, and run the review. Read the findings before using any suggested code.
5. **Try Chat or Agent Mode** from a repository page. Chat is for questions. Agent Mode is for a requested change: read its plan and proposed diff carefully, then approve only if you want to apply it.

### Useful terms in plain language

- **Repository**: a project’s source code, usually stored in GitHub.
- **Sync**: refresh the repository information Devra has saved.
- **Analyze**: inspect code structure and report files, modules, or dependencies.
- **Code review**: findings about a code snippet, with explanations and possible fixes.
- **Agent plan**: a proposed sequence of code changes. Review it before choosing to apply.
- **3D Explorer**: a visual map of code files and their relationships. It is an optional way to explore; the file list and tabs show the same project in a more familiar format.

## 4. Where to make common changes

```text
client/src/pages/             App screens such as Dashboard and Repositories
client/src/components/        Reusable buttons, cards, navigation, and visualizations
client/src/services/api.js    Frontend requests to the backend
server/src/routes/            API URL definitions
server/src/controllers/       What each API request does
server/src/services/          Analysis, AI, repository, and vector-store logic
server/src/models/            MongoDB data shapes
extension/src/                Optional VS Code extension
shared/                       Code shared by multiple workspaces
```

For a small UI change, start in the relevant file under `client/src/pages/` or `client/src/components/`. For data or API changes, follow the request from `client/src/services/api.js` to the matching server route and controller.

## 5. Common problems

- **The page loads but sign-up fails**: make sure Docker is running and MongoDB is up. Check the backend terminal for errors.
- **The web app cannot reach the API**: confirm `npm run dev` started both client and server, and that the API health page responds at port `5001`.
- **AI says a key is missing**: add a valid provider key to the root `.env`, then restart the server.
- **Redis warning**: Redis is optional for local learning; the app can use in-memory vector storage. That store is temporary and clears when the server stops.
- **Dashboard numbers look unexpected**: some dashboard metrics, review examples, and activity entries are sample content. Look at the repository’s own page for analysis associated with that repository.

## 6. Next steps

Once the basic flow works, read the technical sections in the [main README](../README.md) for architecture, environment options, tests, the VS Code extension, and deployment details. The VS Code extension is optional; you do not need it to use the web app.
