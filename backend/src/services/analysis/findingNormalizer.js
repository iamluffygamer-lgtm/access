export function normalizeSecurityFinding(finding) {
  return {
    id: finding.id,
    category: "security",
    subcategory: finding.subcategory || "general",
    severity: finding.severity || "info", // critical, high, medium, low, info
    confidence: finding.confidence || "low", // confirmed, high, medium, low
    title: finding.title,
    description: finding.description || "",
    impact: finding.impact || "",
    evidence: finding.evidence || {},
    affectedResource: finding.affectedResource || null,
    remediation: finding.remediation || null,
    references: finding.references || [],
    detectedAt: new Date().toISOString()
  };
}

export function normalizeAxeFinding(url, v, bounds) {
  const wcagTags = (v.tags || []).filter((t) => t.startsWith("wcag"));
  
  // Map axe impacts (critical, serious, moderate, minor) to standard severity
  let severity = "low";
  if (v.impact === "critical") severity = "critical";
  else if (v.impact === "serious") severity = "high";
  else if (v.impact === "moderate") severity = "medium";

  return {
    id: `AXE-${v.id}`,
    originalId: v.id,
    category: "accessibility",
    subcategory: "axe-core",
    severity: severity,
    axeImpact: v.impact || "minor", // Preserve original for backwards compat
    confidence: "high",
    title: v.help,
    description: v.description,
    impact: "Users with disabilities may be unable to perceive, operate, or understand this content.",
    evidence: {
      type: "dom-nodes",
      nodes: v.nodes.slice(0, 5).map((n) => ({
        target: n.target.join(" "),
        html: n.html,
        failureSummary: n.failureSummary,
        bounds: bounds ? bounds[n.target.join(" ")] : null
      }))
    },
    affectedCount: v.nodes.length,
    affectedResource: { type: "page", url },
    remediation: null, // Will be filled by AI
    references: [{ title: "Deque", url: v.helpUrl }],
    tags: v.tags || [],
    wcagCriteria: wcagTags,
    detectedAt: new Date().toISOString()
  };
}
