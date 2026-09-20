import { useState, useMemo } from "react";

function getFingerprint(f) {
  return `${f.id}-${f.affectedResource?.url || ""}-${f.evidence?.target || f.evidence?.cookie || ""}`;
}

export default function FindingList({ findings, previousFindings = [], onSelectIssue }) {
  const [filter, setFilter] = useState("all");

  const { displayFindings, fixedFindings } = useMemo(() => {
    let filtered = findings;
    if (filter === "security") {
      filtered = findings.filter(f => f.id.startsWith("SEC-"));
    } else if (filter === "accessibility") {
      filtered = findings.filter(f => !f.id.startsWith("SEC-"));
    }

    const prevMap = new Map();
    for (const pf of previousFindings) {
      prevMap.set(getFingerprint(pf), pf);
    }

    const currMap = new Map();
    const displayFindings = filtered.map(f => {
      const fp = getFingerprint(f);
      currMap.set(fp, f);
      const prev = prevMap.get(fp);
      let status = "NEW";
      if (prev) {
        status = "UNCHANGED";
        if (prev.severity !== f.severity) status = "REGRESSED";
      }
      return { ...f, statusBadge: status };
    });

    const fixedFindings = [];
    if (previousFindings.length > 0) {
      for (const pf of previousFindings) {
        const fp = getFingerprint(pf);
        if (!currMap.has(fp)) {
          if (filter === "all" || (filter === "security" && pf.id.startsWith("SEC-")) || (filter === "accessibility" && !pf.id.startsWith("SEC-"))) {
            fixedFindings.push({ ...pf, statusBadge: "FIXED" });
          }
        }
      }
    }

    return { displayFindings, fixedFindings };
  }, [findings, previousFindings, filter]);

  return (
    <div className="mb-16">
      <div className="flex items-center justify-between border-b border-line pb-4 mb-6">
        <h3 className="text-xs font-mono tracking-widest uppercase text-muted">All Findings</h3>
        <div className="flex gap-2">
          {["all", "security", "accessibility"].map(f => (
            <button 
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-[10px] font-mono uppercase tracking-widest transition-colors ${filter === f ? 'bg-ink text-paper font-bold' : 'bg-transparent text-muted hover:text-ink border border-line'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {fixedFindings.map((finding, idx) => (
          <FindingRow key={`fixed-${idx}`} finding={finding} onSelectIssue={onSelectIssue} isFixed={true} />
        ))}
        {displayFindings.map((finding, idx) => (
          <FindingRow key={`active-${idx}`} finding={finding} onSelectIssue={onSelectIssue} previousFindingsLength={previousFindings.length} />
        ))}
        {displayFindings.length === 0 && fixedFindings.length === 0 && (
          <div className="p-8 border border-line bg-paper text-center">
            <p className="text-sm font-mono text-muted uppercase tracking-wider">No findings detected</p>
          </div>
        )}
      </div>
    </div>
  );
}

function FindingRow({ finding, onSelectIssue, isFixed, previousFindingsLength = 0 }) {
  return (
    <button
      onClick={() => !isFixed && onSelectIssue(finding.id)}
      disabled={isFixed}
      className={`w-full text-left p-4 border border-line flex flex-col md:flex-row md:items-center gap-4 transition-all relative group ${isFixed ? 'bg-good/5 opacity-60 grayscale' : 'bg-transparent hover:bg-line/20'}`}
    >
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-transparent group-hover:bg-accent transition-colors" />
      
      <div className="w-32 shrink-0 flex flex-col gap-1">
        <span className={`text-[10px] uppercase font-mono tracking-widest px-2 py-1 inline-block w-fit ${
          isFixed ? 'bg-good text-paper' :
          finding.severity === 'critical' ? 'bg-critical text-paper' :
          finding.severity === 'high' || finding.severity === 'serious' ? 'bg-serious text-paper' :
          finding.severity === 'medium' || finding.severity === 'moderate' ? 'bg-moderate text-paper' :
          'bg-line text-ink'
        }`}>
          {isFixed ? "FIXED" : finding.severity}
        </span>
      </div>
      
      <div className="flex-1 min-w-0">
        <p className={`font-mono text-sm truncate ${isFixed ? 'line-through text-muted' : 'text-ink'}`}>
          <span className="text-muted mr-2">{finding.id}</span>
          {finding.title}
        </p>
        <p className="text-[10px] text-muted font-mono mt-2 truncate uppercase tracking-widest">
          {finding.category} {finding.affectedResource?.url && `// ${finding.affectedResource.url}`}
        </p>
      </div>

      <div className="shrink-0 text-right flex flex-col items-end gap-1">
        {!isFixed && previousFindingsLength > 0 && finding.statusBadge && (
          <span className={`text-[9px] uppercase font-mono tracking-widest ${finding.statusBadge === 'NEW' ? 'text-serious' : 'text-muted'}`}>
            [{finding.statusBadge}]
          </span>
        )}
        {!isFixed && <span className="text-[10px] font-mono uppercase tracking-widest text-transparent group-hover:text-accent transition-colors hidden md:block">Inspect &rarr;</span>}
      </div>
    </button>
  );
}
