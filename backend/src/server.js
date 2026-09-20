import express from "express";
import cors from "cors";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { scanUrl } from "./services/scanner.js";
import { explainViolations } from "./services/explainer.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const demoData = JSON.parse(
  fs.readFileSync(path.join(__dirname, "fixtures/demo-data.json"), "utf-8")
);

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.get("/api/demo-sites", (_req, res) => {
  res.json(Object.keys(demoData));
});

app.post("/api/scan", async (req, res) => {
  const { url, demo, mode } = req.body || {};
  if (!url) return res.status(400).json({ error: "MISSING_URL" });

  if (demo && demoData[url]) {
    return res.json(demoData[url]);
  }

  let normalizedUrl = url;
  if (!/^https?:\/\//i.test(normalizedUrl)) normalizedUrl = `https://${normalizedUrl}`;

  try {
    const parsedUrl = new URL(normalizedUrl);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new Error("Invalid protocol");
    }
    const hostname = parsedUrl.hostname;
    if (!demo) {
      if (
        hostname === "localhost" ||
        hostname.match(/^127\./) ||
        hostname.match(/^10\./) ||
        hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./) ||
        hostname.match(/^192\.168\./) ||
        hostname === "::1"
      ) {
        return res.status(403).json({ error: "FORBIDDEN_URL", message: "Cannot scan internal or loopback addresses." });
      }
    }
  } catch (e) {
    return res.status(400).json({ error: "INVALID_URL", message: "Invalid URL provided." });
  }

  // To support streaming, we use an SSE-like custom header or just wait.
  // The user prompt doesn't strictly require SSE, just says "Show actual phases: Initializing...". 
  // I will just use standard polling or simple response for now to save time, but wait... 
  // If I don't use SSE, I can't show real-time progress. I'll change it to SSE.
  
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const onProgress = (phase, data) => {
    res.write(`data: ${JSON.stringify({ type: 'progress', phase, data })}\n\n`);
  };

  try {
    const report = await scanUrl(normalizedUrl, demo, mode || 'quick', onProgress);
    res.write(`data: ${JSON.stringify({ type: 'done', report })}\n\n`);
    res.end();
  } catch (err) {
    res.write(`data: ${JSON.stringify({ type: 'error', error: err.code || "SCAN_FAILED", message: err.message })}\n\n`);
    res.end();
  }
});

app.post("/api/explain", async (req, res) => {
  const { findings } = req.body || {};
  if (!Array.isArray(findings)) {
    return res.status(400).json({ error: "MISSING_FINDINGS" });
  }

  try {
    const explanations = await explainViolations(findings);
    res.json(explanations);
  } catch (err) {
    res.status(502).json({ error: "EXPLAIN_FAILED", message: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`AccessLens backend listening on http://localhost:${PORT}`);
});
