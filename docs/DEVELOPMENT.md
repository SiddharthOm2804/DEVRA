# DEVRA Development & Contribution Workflow

This document outlines coding standards, branch conventions, and testing protocols for DEVRA contributors.

---

## 1. Monorepo Organization

The project is structured as an npm workspaces monorepo:
- **`client/`**: React 18 SPA built with Vite, Tailwind-free Vanilla CSS tokens (Abyssal Jade design system), and Three.js 3D visualizations.
- **`server/`**: Node.js Express API server with Mongoose ODM, Redis client, Tree-sitter WASM parsers, and Prometheus metrics.
- **`extension/`**: TypeScript VS Code extension integrating DEVRA AI features into the developer's local IDE.
- **`shared/`**: Shared TypeScript/JavaScript models, types, and protocol constants.
- **`e2e/`**: Playwright browser end-to-end test suite.
- **`docs/`**: Consolidated technical documentation and architecture runbooks.

---

## 2. Development Guidelines

1. **Vanilla CSS Design System:**
   - Keep styles consistent with the Abyssal Jade theme.
   - Use CSS custom properties defined in `client/src/index.css` rather than hardcoded ad-hoc utility classes.
2. **TypeScript in Extension:**
   - Always run `npm run compile` in `extension/` to verify zero type errors.
   - Guard against path traversal vulnerabilities whenever touching the filesystem.
3. **AST Chunking & Vector Ingestion:**
   - Ensure all language parsers in `server/src/services/treeSitter/` handle malformed syntax without throwing unhandled exceptions.
   - Maintain deterministic chunk hashing so repeated scans do not alter chunk IDs.
4. **Honest Mocking in Tests:**
   - Never mock external APIs in a way that hides runtime errors or fabricates successful states.

---

## 3. Pre-Commit Verification Checklist

Before pushing commits or opening pull requests:

```bash
# 1. Run server tests
npm --prefix server test

# 2. Run extension tests & compile TypeScript
npm --prefix extension test
npm --prefix extension run compile

# 3. Verify client build
npm --prefix client run build

# 4. Check for git diff syntax or whitespace issues
git diff --check
```
