export function computeRiskMetrics(securityFindings, accessibilityFindings) {
  const axeCounts = { critical: 0, serious: 0, moderate: 0, minor: 0 };
  for (const f of accessibilityFindings) {
    if (f.axeImpact) axeCounts[f.axeImpact] = (axeCounts[f.axeImpact] || 0) + 1;
  }
  const axePenalty = axeCounts.critical * 12 + axeCounts.serious * 6 + axeCounts.moderate * 3 + axeCounts.minor * 1;
  const accessibilityHealth = Math.max(0, Math.round(100 - axePenalty));

  const secCounts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const f of securityFindings) {
    secCounts[f.severity] = (secCounts[f.severity] || 0) + 1;
  }
  const secPenalty = secCounts.critical * 20 + secCounts.high * 10 + secCounts.medium * 4 + secCounts.low * 1;
  const securityPosture = Math.max(0, Math.round(100 - secPenalty));

  return {
    accessibilityHealth,
    accessibilityCounts: axeCounts,
    securityPosture,
    securityCounts: secCounts
  };
}
