# AccessLens
**Web Application Risk & Accessibility Engineering Platform**

> **Find risks. Understand them. Fix them. Prove they’re fixed.**

Most tools stop at telling developers what's broken. **AccessLens** closes the loop. It acts as an intelligent, context-aware copilot that crawls your real rendered web application, discovers both accessibility and security risks, explains their impact, generates developer-ready remediation patches, and verifies that the fix actually worked across subsequent scans.

## Features

### 1. Advanced Readiness Engine
The scanner doesn't just rely on `networkidle2` or fixed timeouts. It uses a custom **Application Readiness Engine** that tracks DOM mutations, active network requests, and loading spinners. It can intelligently wait for Single Page Applications (React, Vue, Angular) to finish rendering meaningful content before it begins auditing.

### 2. Multi-Page Deep Crawling
AccessLens can perform a **Deep Scan** where it extracts same-origin links and organically crawls up to 10 pages in the background, aggressively deduplicating findings across the entire reachable attack surface.

### 3. Attack Surface Discovery & Fingerprinting (NEW)
The engine passively measures everything that loads dynamically on the page:
- **Tech Stack Fingerprinting:** Injects into the DOM to evaluate globals (`window.React`, `__NEXT_DATA__`, `window.Vue`) to instantly footprint the target stack.
- **Input & Form Discovery:** Queries the DOM for `<form>`, `<input type="password">`, and `<input type="file">` to expose exactly where the interactive risk lies.
- **3rd-Party & API Inventory:** Hooks Puppeteer's network interceptors to capture all external domains contacted and internal APIs invoked.

### 4. Advanced JS Payload Secret Hunting (NEW)
While most scanners check HTML bodies and HTTP headers, AccessLens listens to the `page.on('response')` stream to run credential regexes over the raw `.text()` of all loaded `.js` bundles. It instantly catches AWS keys, Stripe tokens, or Firebase configs baked into Webpack/Vite chunks.

### 5. Console & Page Error Capture (NEW)
Leverages `page.on('console')` and `page.on('pageerror')` to capture broken CSP directives, CORS blocks, strict-origin failures, and React hydration errors exactly as the browser experiences them.

### 6. Profiling & Code Coverage (NEW)
Uses the native Chrome DevTools Protocol (`page.createCDPSession()`) to spin up `Profiler.startPreciseCoverage`, capturing V8 engine code coverage and performance metrics dynamically with zero external dependencies.

### 7. Server-Sent Events (SSE) Live Streaming
Scans stream live progress directly to the dashboard via SSE (`text/event-stream`). You see real-time updates as the engine initializes the browser, discovers pages, waits for readiness, analyzes security, and generates the report.

### 8. Premium Industrial Dashboard
The UI is a highly styled, dark-tech React application built with Tailwind CSS and Framer Motion. 
- **Visual Issue Inspector:** See the actual rendered screenshot of the page with the exact problematic elements highlighted alongside issue evidence.
- **Bento-Grid Metrics:** High-density, high-contrast typography using `Space Grotesk` and `JetBrains Mono`.

### 9. Context-Aware Security Engine
Unlike naive scanners, AccessLens evaluates the context of security findings:
- Detects missing `HttpOnly` flags but intelligently downgrades the severity to INFO if the cookie is explicitly named like a CSRF token.
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
