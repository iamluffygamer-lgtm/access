import { useEffect, useState } from "react";
import ScanInput from "./components/ScanInput.jsx";
import LoadingState from "./components/LoadingState.jsx";
import ErrorState from "./components/ErrorState.jsx";
import { scanSite, explainViolations, getDemoSites } from "./lib/api.js";
import { getScanHistory, saveScanHistory } from "./lib/history.js";
import VisualWorkspace from "./components/VisualWorkspace.jsx";
import PosturePanel from "./components/PosturePanel.jsx";
import PostureBreakdown from "./components/PostureBreakdown.jsx";
import AttackSurface from "./components/AttackSurface.jsx";
import SecurityControls from "./components/SecurityControls.jsx";
import FindingList from "./components/FindingList.jsx";

// ... App component remains largely the same ...


export default function App() {
  const [status, setStatus] = useState("idle"); // idle | loading | done | error
  const [scanPhase, setScanPhase] = useState({ text: "", data: {} });
  const [report, setReport] = useState(null);
  const [previousReport, setPreviousReport] = useState(null);
  const [error, setError] = useState(null);
  const [explanations, setExplanations] = useState({});
  const [explaining, setExplaining] = useState(false);
  const [demoSites, setDemoSites] = useState([]);
  const [lastQuery, setLastQuery] = useState(null);
  const [selectedIssueId, setSelectedIssueId] = useState(null);

  useEffect(() => {
    getDemoSites().then(setDemoSites).catch(() => setDemoSites([]));
  }, []);

  async function runScan(url, demo, mode) {
    setStatus("loading");
    setScanPhase({ text: "Initializing browser", data: {} });
    setError(null);
    setExplanations({});
    setSelectedIssueId(null);
    setLastQuery({ url, demo, mode });

    try {
      const prev = getScanHistory(url);
      setPreviousReport(prev);

      const result = await scanSite(url, demo, mode, (phase, data) => {
        setScanPhase({ text: phase, data: data || {} });
      });
      saveScanHistory(url, result);
      setReport(result);
      setStatus("done");

      const allFindings = [...(result.securityFindings || []), ...(result.accessibilityFindings || [])];

      if (allFindings.length) {
        const preloaded = Object.fromEntries(
          allFindings.filter((f) => f.explanation).map((f) => [f.id, f.explanation])
        );
        if (Object.keys(preloaded).length === allFindings.length) {
          setExplanations(preloaded);
        } else {
          setExplaining(true);
          try {
            const fetched = await explainViolations(allFindings);
            setExplanations(fetched);
          } finally {
            setExplaining(false);
          }
        }
      }
    } catch (err) {
      setError({ code: err.code, message: err.message });
      setStatus("error");
    }
  }

  function retry() {
    if (lastQuery) runScan(lastQuery.url, lastQuery.demo);
  }

  function reset() {
    setStatus("idle");
    setReport(null);
    setError(null);
    setSelectedIssueId(null);
  }

  return (
    <div className="min-h-[100dvh] px-6 sm:px-10 py-10 bg-paper text-ink font-sans">
      <header className="max-w-5xl mx-auto flex items-center justify-between mb-24 border-b border-line pb-6">
        <button onClick={reset} className="font-display text-2xl font-bold tracking-tighter hover:opacity-80 transition-opacity">
          AccessLens
        </button>
        {status === "done" && (
          <div className="flex gap-4">
            <button
              onClick={() => {
                const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `accesslens-evidence-${new Date().toISOString().slice(0,10)}.json`;
                a.click();
              }}
              className="text-xs font-mono uppercase tracking-wider border border-line px-4 py-2 hover:bg-ink hover:text-paper transition-colors"
            >
              Export JSON
            </button>
            <button
              onClick={reset}
              className="text-xs font-mono uppercase tracking-wider border border-transparent px-4 py-2 hover:border-line transition-colors"
            >
              New Scan
            </button>
          </div>
        )}
      </header>

      <main className="max-w-5xl mx-auto relative pb-32">
        {selectedIssueId && report && (
          <VisualWorkspace 
            report={report}
            explanations={explanations}
            explaining={explaining}
            selectedIssueId={selectedIssueId}
            onBack={() => setSelectedIssueId(null)}
            onSelectIssue={setSelectedIssueId}
          />
        )}
        
        {status === "idle" && <ScanInput onScan={runScan} demoSites={demoSites} />}
        {status === "loading" && <LoadingState phase={scanPhase} />}
        {status === "error" && <ErrorState {...error} onRetry={retry} />}
        
        {status === "done" && report && (
          <div className="animate-fade-in relative">
            <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 mb-16 border-b border-line pb-6">
              <div>
                <h1 className="text-4xl md:text-5xl font-display tracking-tighter leading-none mb-4">Target Assessment</h1>
                <p className="font-mono text-sm text-muted uppercase tracking-widest">{report.url}</p>
              </div>
              <div className="text-left md:text-right">
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted mb-1">Scan Completed</p>
                <p className="font-mono text-sm">{new Date(report.scannedAt).toLocaleString()}</p>
              </div>
            </div>

            {previousReport && (
              <HistoryComparison current={report} previous={previousReport} />
            )}
            
            <PosturePanel report={report} />
            <PostureBreakdown report={report} />
            <AttackSurface attackSurface={report.attackSurface} />
            <SecurityControls controls={report.securityControls} />
            <FindingList 
              findings={[...(report.securityFindings || []), ...(report.accessibilityFindings || [])]} 
              previousFindings={previousReport ? [...(previousReport.securityFindings || []), ...(previousReport.accessibilityFindings || [])] : []}
              onSelectIssue={setSelectedIssueId} 
            />
          </div>
        )}
      </main>

      <footer className="max-w-5xl mx-auto mt-24 pt-6 border-t border-line text-sm text-muted flex flex-col gap-2">
        <span>Built for HackDevengers 2.0 — Platform Edition.</span>
      </footer>
    </div>
  );
}

function HistoryComparison({ current, previous }) {
  const secDiff = current.securityPosture - (previous.securityPosture || 0);
  const axeDiff = current.accessibilityHealth - (previous.accessibilityHealth || previous.score || 0);
  
  if (secDiff === 0 && axeDiff === 0) return null;

  return (
    <div className={`p-6 border mb-16 ${secDiff >= 0 && axeDiff >= 0 ? "border-good/50 bg-good/5" : "border-critical/50 bg-critical/5"}`}>
      <h3 className="text-sm font-mono tracking-wider uppercase mb-4 text-muted">
        {secDiff >= 0 && axeDiff >= 0 ? "Posture Improvement" : "Posture Regression"}
      </h3>
      <div className="flex gap-16">
        <div>
          <p className="text-xs text-muted mb-1">PREVIOUS SCAN</p>
          <p className="font-display text-2xl">{previous.securityPosture || 0} <span className="text-sm font-sans text-muted">Sec</span></p>
          <p className="font-display text-2xl">{previous.accessibilityHealth || previous.score || 0} <span className="text-sm font-sans text-muted">A11y</span></p>
        </div>
        <div>
          <p className="text-xs text-muted mb-1">CURRENT SCAN</p>
          <p className="font-display text-2xl">{current.securityPosture} <span className="text-sm font-sans text-muted">Sec</span></p>
          <p className="font-display text-2xl">{current.accessibilityHealth} <span className="text-sm font-sans text-muted">A11y</span></p>
        </div>
      </div>
    </div>
  );
}
