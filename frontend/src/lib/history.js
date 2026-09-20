export function saveScanHistory(url, report) {
  try {
    const record = {
      score: report.score,
      totalIssues: report.violations.length,
      timestamp: Date.now(),
      violations: report.violations.map(v => v.id),
      counts: report.counts
    };
    localStorage.setItem(`accesslens_history_${url}`, JSON.stringify(record));
  } catch (e) {
    // Ignore localStorage errors
  }
}

export function getScanHistory(url) {
  try {
    const data = localStorage.getItem(`accesslens_history_${url}`);
    if (data) return JSON.parse(data);
  } catch (e) {
    return null;
  }
  return null;
}
