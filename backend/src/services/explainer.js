import crypto from "node:crypto";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-5";

// In-memory cache: same violation set on a re-scan shouldn't re-spend tokens.
// Fine for a hackathon demo; swap for Redis/a KV store for anything longer-lived.
const cache = new Map();

function hashFindings(findings) {
  const key = findings.map((f) => f.id).sort().join(",");
  return crypto.createHash("sha256").update(key).digest("hex");
}

export async function explainViolations(findings) {
  if (!findings.length) return {};

  const cacheKey = hashFindings(findings);
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  if (!process.env.ANTHROPIC_API_KEY) {
    return Object.fromEntries(
      findings.map((f) => [
        f.id,
        {
          summary: f.title,
          whyItMatters: f.impact || f.description,
          whoIsAffected: "Users or the application.",
          suggestedFix: "Set ANTHROPIC_API_KEY to enable AI-generated remediation plans.",
          correctedCode: "",
          explanation: "AI copilot disabled.",
          confidence: "low",
        },
      ])
    );
  }

  const prompt = buildPrompt(findings);

  const response = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 3000,
      system:
        "You are an application security and accessibility engineering copilot. For each finding, provide a developer-ready explanation and remediation plan. " +
        "Do not invent vulnerabilities, CVEs, WCAG criteria, or HTML elements. Base your fix exclusively on the provided evidence. " +
        "Respond with ONLY a JSON array, no prose, no markdown fences, matching this exact shape: " +
        '[{"id": "<finding id>", "summary": "...", "whyItMatters": "...", "whoIsAffected": "...", "suggestedFix": "...", "correctedCode": "...", "explanation": "...", "confidence": "high"}]',
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Claude API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const textBlock = data.content.find((b) => b.type === "text");
  const cleaned = (textBlock?.text || "[]").replace(/```json|```/g, "").trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    parsed = [];
  }

  const byId = Object.fromEntries(parsed.map((p) => [p.id, p]));
  cache.set(cacheKey, byId);
  return byId;
}

function buildPrompt(findings) {
  const list = findings
    .map((f, i) => {
      return `${i + 1}. id: ${f.id}\n   category: ${f.category}\n   title: ${f.title}\n   severity: ${f.severity}\n   description: ${f.description}\n   impact: ${f.impact}\n   evidence: ${JSON.stringify(f.evidence)}`;
    })
    .join("\n\n");
  return `Explain these security and accessibility findings and provide remediation steps based ONLY on this evidence:\n\n${list}`;
}
