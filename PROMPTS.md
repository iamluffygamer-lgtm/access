# Build Prompts — AccessLens

This project was built systematically using a small set of scoped prompts, each
handed to an AI coding agent as an independent task. Keeping every prompt narrow
kept the output reviewable and let each piece be built, tested, and swapped in
isolation — the same reason a human team would split this across people.

---

### 1. Backend — Scanner Service
> Build an Express endpoint `POST /api/scan` that accepts `{ url }`, launches a
> headless Puppeteer browser, navigates to the URL with a hard 20s timeout,
> injects `axe-core`, runs `axe.run()`, and returns a normalized JSON report:
> `{ url, score, counts: {critical, serious, moderate, minor}, violations[] }`.
> Each violation needs: id, impact, description, help text, and the affected
> CSS selector(s). Fail gracefully with a clear error code if the page won't
> load, blocks headless browsers, or times out.

### 2. Backend — Plain-English Explainer
> Build a `POST /api/explain` endpoint that takes a list of raw axe-core
> violations and calls the Claude API once (batched, not per-violation) to
> rewrite each into: a one-sentence plain-English explanation of who it harms
> and how, plus a short concrete code fix. Return strict JSON. Cache by a hash
> of the input so re-scans of the same page don't re-spend tokens.

### 3. Backend — Demo Fallback
> Because live scans can fail during judging (site blocks bots, network is
> slow, Wi-Fi drops), ship 2–3 pre-captured fixture reports and a `demo=true`
> flag on `/api/scan` that returns fixture data instantly instead of launching
> a browser. This is the judging safety net, not a shortcut — label it clearly
> in the UI.

### 4. Frontend — Design Direction
> Design system for an accessibility auditing tool. The product should visibly
> practice what it preaches: high contrast, generous type scale, obvious focus
> states, no color-only signaling. Avoid the default "AI app" look (cream +
> terracotta, rounded SaaS cards, gradient hero). Severity color-coding
> (critical/serious/moderate/minor) carries real meaning, not decoration.
> Editorial, confident, left-aligned — closer to an audit report than a
> marketing landing page.

### 5. Frontend — Scan Flow
> Build the input screen (URL field + example-site buttons + demo toggle), a
> loading state that narrates what's happening ("Loading page…", "Running
> accessibility checks…"), and wire it to `/api/scan`.

### 6. Frontend — Results Dashboard
> Build the results view: a large score display, a severity breakdown, and a
> filterable, expandable list of violations. Each expanded violation shows the
> AI-generated plain-English explanation and fix from `/api/explain`, fetched
> once results land. Empty state (zero issues) and error state both need real
> content, not a generic spinner-failed message.

### 7. Docs — README
> Write a submission-ready README: problem, solution, architecture, how to run
> it locally, what's demo-mode vs. live, and what's next if this became a real
> product (CI/CD integration, browser extension, scheduled monitoring).

---

Each prompt above maps 1:1 to a file or small group of files in this repo, so
you can trace exactly what was built from what instruction.
