# AccessLens

**Web Application Risk & Accessibility Engineering Platform**

> Find risks. Understand them. Fix them. Prove they're fixed.

Most scanners stop at telling developers what's broken. AccessLens closes the loop: it crawls your real, rendered web application with a headless browser, discovers both **accessibility** and **security** risks, explains their impact in plain English, generates developer-ready fixes with an AI copilot, and tracks whether a re-scan proves the fix actually worked.

---

## Table of contents

- [How it works](#how-it-works)
- [Features](#features)
- [Architecture](#architecture)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [API reference](#api-reference)
- [Scan modes](#scan-modes)
- [Scoring](#scoring)
- [Demo mode](#demo-mode)
- [Tech stack](#tech-stack)
- [Safety & scope](#safety--scope)
- [Roadmap](#roadmap)

---

## How it works

1. You give AccessLens a URL.
2. A headless Chromium instance (Puppeteer) loads the page for real — not just fetches the raw HTML — and waits until the app is actually done rendering (see [Application Readiness Engine](#features)).
3. While the page loads, AccessLens passively records every network request/response, every cookie, every console error, and the full text of every JavaScript bundle.
4. Once the page is ready, it runs two scanners in parallel:
   - **axe-core** for WCAG/accessibility violations.
   - A custom **security engine** that inspects headers, cookies, CORS, transport, and JS payloads.
5. Findings are normalized into a common shape, deduplicated, scored, and streamed back to the dashboard live via Server-Sent Events.
6. Optionally, an LLM (Claude) turns the raw findings into plain-English explanations and copy-pasteable code fixes.
7. Scan again after fixing something, and the dashboard can tell you whether a finding is now resolved.

## Features

### Application Readiness Engine
Rather than trusting `networkidle2` or a fixed timeout, the scanner injects a `MutationObserver` and polls for a composite "ready" signal: the DOM has stopped mutating, the network has gone quiet, no loading spinner or "Loading…"/"Please wait" text is visible, and there's meaningful content on the page. This lets it audit client-rendered React/Vue/Angular apps instead of an empty shell. It also detects login walls and gives up gracefully rather than spinning for the full timeout.

### Multi-page deep crawling
In **Deep scan** mode, AccessLens extracts same-origin links from the page and crawls up to 10 pages, aggregating and deduplicating findings across the whole reachable surface.

### Attack surface discovery & fingerprinting
For the primary page, the engine also:
- Fingerprints the front-end stack (React, Vue, Next.js, Angular) by probing DOM globals.
- Inventories every `<form>`, `input[type="password"]`, and `input[type="file"]` on the page.
- Builds a full inventory of third-party domains, loaded scripts, and XHR/fetch API calls observed via Puppeteer's network interception.

### JS payload secret scanning
Every `.js` response body is scanned against a regex for common credential shapes (AWS access keys, Stripe live keys, JWT-looking tokens) — not just headers or HTML, which is where most scanners stop.

### Console & runtime error capture
`page.on('console')` and `page.on('pageerror')` capture CSP violations, CORS failures, and JS/hydration errors exactly as the browser sees them, and surface them alongside the findings.

### Code coverage via CDP
A Chrome DevTools Protocol session (`Profiler.startPreciseCoverage`) runs for the duration of the scan with zero extra dependencies, and the number of covered files is reported.

### Live progress via Server-Sent Events
`POST /api/scan` responds with a `text/event-stream`. The dashboard renders each phase as it happens — initializing the browser, loading the page, waiting for readiness, running accessibility checks, running security checks, building the attack surface, generating the report — instead of a single opaque spinner.

### Context-aware security engine
Findings aren't judged in a vacuum:
- A cookie missing `HttpOnly` is scored **high** if it looks like a session/auth token, but only **info** if it looks like a CSRF token (where client-side readability is often intentional).
- Clickjacking protection is only flagged missing if *both* `X-Frame-Options` **and** a CSP `frame-ancestors` directive are absent.
- Mixed content on scripts/stylesheets is scored higher than on images.

### AI-generated explanations and fixes
`POST /api/explain` sends a batch of raw findings to Claude once (not per-finding) and gets back, for each: a plain-English summary, who is affected and why it matters, a suggested fix, and (where applicable) corrected code — grounded strictly in the evidence collected during the scan. Results are cached in memory by a hash of the finding set so re-scanning the same page doesn't burn tokens twice. If no `ANTHROPIC_API_KEY` is configured, the endpoint degrades gracefully and returns the raw finding text instead of failing.

### Demo mode
Because live scans depend on the target site being reachable and not blocking headless browsers, `POST /api/scan` accepts a `demo: true` flag that returns pre-captured fixture data instantly instead of launching a browser — useful for live demos, judging, or offline development.

## Architecture

```text
React (Vite) — dashboard
   |  fetch + SSE
   v
Express API  ── /api/health, /api/demo-sites, /api/scan (SSE), /api/explain
   |
   v
Puppeteer (headless Chromium)
   ├── CDP: Profiler.startPreciseCoverage (code coverage)
   ├── Core: Application Readiness Engine (DOM mutation + network + spinner tracking)
   ├── Scanner 1: axe-core                    → accessibility findings
   └── Scanner 2: custom security scanner      → headers, cookies, CORS, transport, secrets
   |
   v
Finding normalizer + risk scoring  →  unified report JSON
   |
   v
Claude API (optional)  →  plain-English explanations + suggested fixes
```

## Project structure

```text
access/
├── backend/
│   ├── src/
│   │   ├── server.js                        Express app, routes, SSRF guardrails
│   │   ├── services/
│   │   │   ├── scanner.js                    Orchestrates the Puppeteer scan
│   │   │   ├── explainer.js                  Claude API integration + caching
│   │   │   ├── scanners/
│   │   │   │   ├── axeScanner.js             Injects and runs axe-core
│   │   │   │   ├── securityScanner.js        Header/cookie/CORS/secret checks
│   │   │   │   └── core/
│   │   │   │       └── applicationReadiness.js   Readiness-detection engine
│   │   │   ├── analysis/
│   │   │   │   ├── findingNormalizer.js      Normalizes axe + security findings to one shape
│   │   │   │   └── riskEngine.js             Scoring helper
│   │   │   └── fixtures/
│   │   │       └── demo-data.json            Pre-captured scan results for demo mode
│   │   └── ...
│   └── .env.example
├── frontend/
│   └── src/
│       ├── App.jsx                           Top-level view/state
│       ├── components/
│       │   ├── ScanInput.jsx                 URL field, example sites, demo/quick/deep toggle
│       │   ├── LoadingState.jsx               Live phase narration (via SSE)
│       │   ├── PosturePanel.jsx / PostureBreakdown.jsx   Score + severity breakdown
│       │   ├── FindingList.jsx                Filterable, expandable finding list
│       │   ├── AttackSurface.jsx              Fingerprint, domains, scripts, APIs, cookies
│       │   ├── SecurityControls.jsx           PASS/FAIL/WARN control summary
│       │   ├── VisualWorkspace.jsx            Screenshot + highlighted elements
│       │   └── ErrorState.jsx
│       └── lib/
│           ├── api.js                         Fetch + SSE client for the backend
│           └── history.js                     localStorage-based scan history
├── package.json                               Root scripts (install:all, dev)
└── PROMPTS.md                                 The build prompts this project was built from
```

## Getting started

Requires **Node.js 18+**.

```bash
# From the repo root
npm run install:all

# Add your Anthropic key to enable AI explanations (optional — see Demo mode)
cp backend/.env.example backend/.env
# then edit backend/.env

npm run dev
```

This runs the backend on **http://localhost:4000** and the frontend on **http://localhost:5173** concurrently. The Vite dev server proxies `/api/*` to the backend, so just open the frontend URL.

To run each side individually:

```bash
# Backend only (auto-restarts on change via --watch)
npm run dev --prefix backend

# Frontend only
npm run dev --prefix frontend
```

Production build of the frontend:

```bash
npm run build --prefix frontend
npm run preview --prefix frontend
```

## Environment variables

Set these in `backend/.env` (see `backend/.env.example`):

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `4000` | Port the Express server listens on. |
| `ANTHROPIC_API_KEY` | No | — | Enables `/api/explain`. Without it, the endpoint returns the raw finding text instead of an AI-generated explanation, rather than failing. |
| `CLAUDE_MODEL` | No | `claude-sonnet-5` | Model used for the explanation/remediation copilot. |

## API reference

All routes are served under `/api`.

### `GET /api/health`
Returns `{ ok: true }`. Used for liveness checks.

### `GET /api/demo-sites`
Returns the list of URLs that have pre-captured fixture data available for demo mode.

### `POST /api/scan`
Runs a scan and streams progress as Server-Sent Events.

**Request body**

```json
{
  "url": "https://example.com",
  "demo": false,
  "mode": "quick"
}
```

- `url` — required. Scheme is optional; `https://` is assumed if omitted.
- `demo` — optional. If `true` and `url` matches a fixture, the pre-captured report is returned instantly (no browser launched).
- `mode` — optional, `"quick"` (default, single page) or `"deep"` (crawls up to 10 same-origin pages).

**Response** — `text/event-stream`. Each event is a JSON payload on one of three shapes:

```jsonc
// progress
{ "type": "progress", "phase": "Analyzing accessibility", "data": { "url": "..." } }

// success (final event)
{ "type": "done", "report": { /* full report, see below */ } }

// failure (final event)
{ "type": "error", "error": "SCAN_FAILED", "message": "..." }
```

Non-SSE error cases (returned as plain JSON with an HTTP error status, before streaming starts):

| Status | `error` | Cause |
|---|---|---|
| 400 | `MISSING_URL` | No `url` in the request body. |
| 400 | `INVALID_URL` | URL failed to parse or used an unsupported protocol. |
| 403 | `FORBIDDEN_URL` | URL resolves to a loopback/internal address (SSRF protection). |

**Report shape** (the `report` field of the `done` event):

```jsonc
{
  "url": "https://example.com",
  "scannedAt": "2026-09-20T12:00:00.000Z",
  "scanMode": "quick",
  "readiness": { "state": "READY", "waitedMs": 1800, "confidence": "HIGH", "signals": { /* ... */ } },
  "accessibilityHealth": 92,
  "accessibilityCounts": { "critical": 0, "serious": 1, "moderate": 2, "minor": 0 },
  "securityPosture": 70,
  "securityCounts": { "critical": 0, "high": 1, "medium": 1, "low": 0, "info": 2 },
  "accessibilityFindings": [ /* normalized axe violations */ ],
  "securityFindings": [ /* normalized security findings */ ],
  "securityControls": { "https": "PASS", "csp": "FAIL", "hsts": "WARN", "cookies": "PASS", "cors": "PASS", "clickjacking": "PASS" },
  "attackSurface": {
    "pages": 1,
    "apis": [ /* ... */ ],
    "scripts": [ /* ... */ ],
    "domains": [ /* third-party domains contacted */ ],
    "cookies": [ /* ... */ ],
    "stackFingerprint": { "react": true, "vue": false, "nextjs": false, "angular": false },
    "exposedInputs": [ /* truncated outerHTML of forms/password/file inputs */ ],
    "consoleErrors": [ /* ... */ ],
    "pageErrors": [ /* ... */ ],
    "coverageFiles": 12
  },
  "screenshot": "data:image/jpeg;base64,..."
}
```

### `POST /api/explain`

**Request body**

```json
{ "findings": [ /* array of normalized findings from a scan report */ ] }
```

**Response** — an object keyed by finding `id`:

```jsonc
{
  "SEC-CSP-001": {
    "summary": "...",
    "whyItMatters": "...",
    "whoIsAffected": "...",
    "suggestedFix": "...",
    "correctedCode": "...",
    "explanation": "...",
    "confidence": "high"
  }
}
```

Errors return `502 { "error": "EXPLAIN_FAILED", "message": "..." }` if the upstream Claude API call fails.

## Scan modes

| Mode | Pages crawled | When to use |
|---|---|---|
| `quick` | 1 (the URL you gave) | Fast feedback on a single page. |
| `deep` | Up to 10, same-origin, discovered via same-origin `<a href>` links | Understanding risk across a whole site/section. |

## Scoring

Both scores start at 100 and are penalized per finding by severity:

- **Accessibility health** — `100 − (12 × critical + 6 × serious + 3 × moderate + 1 × minor)`, floored at 0.
- **Security posture** — `100 − (25 × critical + 15 × high + 5 × medium + 2 × low)`, floored at 0.

Info-level findings never affect either score.

## Demo mode

Live scans depend on the target site being reachable, allowing headless browsers, and not blocking the scanner's IP — none of which are guaranteed at demo/judging time. Setting `demo: true` (and using one of the URLs from `GET /api/demo-sites`) skips the browser entirely and returns a fixture report instantly. This is a safety net for presentations, not a substitute for a real scan — the UI should label it clearly whenever it's active.

## Tech stack

| Layer | Tools |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, Framer Motion, Phosphor Icons |
| Backend | Node.js (ES modules), Express, Puppeteer |
| Accessibility scanning | axe-core |
| AI copilot | Claude API (`claude-sonnet-5` by default) |
| Transport | REST + Server-Sent Events |

## Safety & scope

- The backend rejects scans of `localhost`, loopback, and private/internal IP ranges (`10.x`, `172.16–31.x`, `192.168.x`, `::1`) unless running in demo mode, as basic SSRF protection.
- The in-browser request interceptor also aborts any request the page itself tries to make to loopback addresses or the cloud metadata IP (`169.254.169.254`).
- Each page load is capped at a hard timeout, and readiness polling is capped separately, so a single hung page can't stall a deep scan indefinitely.
- Deep mode is capped at 10 pages per scan.

## Roadmap

Ideas for turning this from a project into a product:

- CI/CD integration (fail a build on new critical findings, post results as a PR comment).
- A browser extension for auditing pages behind auth without exposing credentials to the scanner.
- Scheduled/recurring monitoring with alerting on regressions.
- Persistent storage for scan history (currently the frontend keeps a lightweight history in `localStorage`; there's no database yet).
- Team accounts, shareable report links, and exportable PDF reports.- Detects missing `HttpOnly` flags but intelligently downgrades the severity to INFO if the cookie is explicitly named like a CSRF token.
- Validates missing Clickjacking protections by checking *both* `X-Frame-Options` and modern `Content-Security-Policy frame-ancestors`.

### 10. Fix Verification & AI Explanations
AccessLens tracks scan history. Fix a finding, rescan, and the engine computes a cryptographic fingerprint to automatically mark it as **FIXED**. Need help fixing it? The **AI Context Analyzer** generates drop-in code patches using LLM reasoning based on the exact DOM and HTTP evidence extracted from the scan.

## Architecture

```text
React (Vite, Framer Motion) [Premium Industrial Dashboard]
 ↓ (SSE Stream)
Node/Express (API)
 ↓
Puppeteer (Headless Browser)
 ├── CDP: V8 Profiler & Coverage
 ├── Core: Readiness Engine & Stack Fingerprinter
 ├── Scanner 1: axe-core (Accessibility)
 └── Scanner 2: Custom Security Engine (JS Payload Secrets, DOM Inputs, Headers)
 ↓
Claude AI / LLM (Remediation Copilot)
```

## Running it locally

Requires Node 18+.

```bash
npm run install:all
cp backend/.env.example backend/.env   # Add your ANTHROPIC_API_KEY for AI fixes
npm run dev
```

This concurrently starts the backend on `:4000` and the frontend on `:5173`. 
The tool works even without an LLM API key by degrading gracefully to default help text.
