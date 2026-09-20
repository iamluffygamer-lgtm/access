import { useState, useRef, useEffect } from "react";

export default function VisualWorkspace({ report, explanations, explaining, selectedIssueId, onBack, onSelectIssue }) {
  const allFindings = [...(report.securityFindings || []), ...(report.accessibilityFindings || [])];
  const currentIndex = allFindings.findIndex((v) => v.id === selectedIssueId);
  const issue = allFindings[currentIndex];
  const explanation = explanations?.[issue?.id];
  
  const [activeNodeIndex, setActiveNodeIndex] = useState(0);
  const [viewMode, setViewMode] = useState("full");
  const scrollRef = useRef(null);

  useEffect(() => {
    setActiveNodeIndex(0);
  }, [selectedIssueId]);

  useEffect(() => {
    if (viewMode === "full" && scrollRef.current && issue?.evidence?.nodes?.[activeNodeIndex]?.bounds) {
      const bounds = issue.evidence.nodes[activeNodeIndex].bounds;
      scrollRef.current.scrollTo({
        top: Math.max(0, bounds.y - 100),
        left: Math.max(0, bounds.x - 100),
        behavior: 'smooth'
      });
    }
  }, [activeNodeIndex, viewMode, issue]);

  if (!issue) return null;

  const handlePrev = () => {
    if (currentIndex > 0) onSelectIssue(allFindings[currentIndex - 1].id);
  };
  const handleNext = () => {
    if (currentIndex < allFindings.length - 1) onSelectIssue(allFindings[currentIndex + 1].id);
  };

  const isAxe = issue.category === 'accessibility';
  const nodes = issue.evidence?.nodes || [];

  return (
    <div className="fixed inset-0 z-50 bg-paper flex flex-col">
      <header className="h-16 border-b border-line flex items-center justify-between px-6 shrink-0 bg-paper">
        <button onClick={onBack} className="text-[10px] text-muted hover:text-ink font-mono uppercase tracking-widest transition-colors flex items-center gap-2">
          &larr; BACK TO ASSESSMENT
        </button>
        <div className="flex items-center gap-6 text-[10px] uppercase tracking-widest font-mono text-muted">
          <button onClick={handlePrev} disabled={currentIndex === 0} className="disabled:opacity-30 hover:text-ink transition-colors">Prev</button>
          <span className="text-ink">Issue {currentIndex + 1} // {allFindings.length}</span>
          <button onClick={handleNext} disabled={currentIndex === allFindings.length - 1} className="disabled:opacity-30 hover:text-ink transition-colors">Next</button>
        </div>
        {isAxe && (
          <div className="flex border border-line text-sm font-mono rounded overflow-hidden">
            <button 
              className={`px-3 py-1 ${viewMode === "full" ? "bg-ink text-paper" : "bg-transparent text-muted hover:bg-ink/5"}`}
              onClick={() => setViewMode("full")}
            >
              Full Page
            </button>
            <button 
               className={`px-3 py-1 border-l border-line ${viewMode === "focused" ? "bg-ink text-paper" : "bg-transparent text-muted hover:bg-ink/5"}`}
               onClick={() => setViewMode("focused")}
            >
              Focused
            </button>
          </div>
        )}
      </header>

      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT PANE: Website Preview or Network Evidence */}
        <div className="flex-1 border-r border-line bg-ink/5 overflow-auto relative p-4 flex flex-col" ref={scrollRef}>
           {report.screenshot ? (
             <div className="relative mx-auto bg-paper shadow-sm">
                <img 
                   src={report.screenshot} 
                   alt="Website preview" 
                   className="block max-w-none"
                   style={{ width: "1280px" }}
                />
                {isAxe && nodes.map((node, idx) => {
                  if (!node.bounds) return null;
                  const isActive = idx === activeNodeIndex;
                  return (
                    <div 
                      key={idx}
                      className={`absolute pointer-events-none transition-colors ${isActive ? "border-[3px] border-critical bg-critical/10 z-10" : "border-2 border-critical/50 z-0"}`}
                      style={{
                        left: node.bounds.x,
                        top: node.bounds.y,
                        width: node.bounds.width,
                        height: node.bounds.height,
                        boxShadow: (viewMode === "focused" && isActive) ? "0 0 0 9999px rgba(0,0,0,0.75)" : "none",
                      }}
                    >
                       <span className="absolute -top-6 -left-0.5 bg-critical text-white text-[11px] font-bold px-1.5 py-0.5 rounded-sm font-mono">
                         {idx + 1}
                       </span>
                    </div>
                  );
                })}
             </div>
           ) : (
             <div className="m-auto text-center max-w-md">
               <p className="text-muted mb-2 font-mono uppercase tracking-wider text-sm">Visual preview unavailable</p>
             </div>
           )}
        </div>

        {/* RIGHT PANE: Issue Details */}
        <div className="w-[500px] shrink-0 bg-paper overflow-y-auto p-8 border-l border-line">
           <div className="mb-6">
             <div className="flex items-center gap-2 mb-4">
               <span className={`font-mono text-[10px] uppercase tracking-wider px-2 py-1 rounded-sm ${
                  issue.severity === 'critical' ? 'bg-critical text-white' :
                  issue.severity === 'high' ? 'bg-serious text-white' :
                  issue.severity === 'medium' ? 'bg-moderate text-white' : 'bg-ink/10 text-ink'
                }`}>
                  {issue.severity}
               </span>
               <span className="font-mono text-[10px] uppercase tracking-wider text-muted px-2 py-1 border border-line rounded-sm">
                  {issue.confidence} Confidence
               </span>
             </div>
             <h2 className="text-2xl font-display leading-tight mb-2">{issue.title}</h2>
             <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
                {issue.category} · {issue.subcategory || 'General'}
             </span>
           </div>

           <hr className="border-line my-8" />

           <div className="space-y-8">
             {/* WHY IT MATTERS */}
             <div>
               <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted font-mono mb-3 flex items-center gap-2">
                 <span className="w-1 h-1 bg-muted rounded-full"></span> Why it matters
               </h4>
               <p className="text-sm text-ink leading-relaxed">{issue.impact || issue.description}</p>
             </div>

             <hr className="border-line my-8" />

             {/* EVIDENCE */}
             <div>
               <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted font-mono mb-3 flex items-center gap-2">
                 <span className="w-1 h-1 bg-muted rounded-full"></span> Evidence
               </h4>
               
               {isAxe && nodes.length > 1 && (
                 <div className="mb-4 bg-ink/[0.03] p-3 border border-line flex flex-wrap gap-2 items-center">
                   <span className="text-[10px] text-muted font-mono uppercase tracking-wider mr-2">{nodes.length} elements affected:</span>
                   {nodes.map((_, i) => (
                     <button 
                       key={i} 
                       onClick={() => setActiveNodeIndex(i)}
                       className={`w-6 h-6 flex items-center justify-center text-[10px] font-mono transition-colors ${i === activeNodeIndex ? 'bg-ink text-paper' : 'bg-paper text-ink border border-line hover:border-ink/30'}`}
                     >
                       {i + 1}
                     </button>
                   ))}
                 </div>
               )}

               {isAxe && nodes[activeNodeIndex] ? (
                 <>
                   <p className="font-mono text-[10px] text-muted mb-2 break-all border border-line p-2 bg-ink/[0.02]">
                     Selector: {nodes[activeNodeIndex].target}
                   </p>
                   <pre className="font-mono text-[11px] overflow-x-auto text-ink p-4 bg-ink/[0.02] border border-line break-all whitespace-pre-wrap">
                     {nodes[activeNodeIndex].html}
                   </pre>
                   {nodes[activeNodeIndex].failureSummary && (
                      <div className="mt-3 p-3 bg-critical/5 border-l-2 border-critical">
                        <p className="text-xs text-critical leading-relaxed font-mono whitespace-pre-wrap">{nodes[activeNodeIndex].failureSummary}</p>
                      </div>
                   )}
                 </>
               ) : (
                 <div className="border border-line bg-ink/[0.02] p-4 text-xs font-mono space-y-2">
                   {Object.entries(issue.evidence || {}).map(([key, val]) => (
                     <div key={key} className="flex flex-col sm:flex-row sm:gap-4 border-b border-line/50 pb-2 last:border-0 last:pb-0">
                       <span className="text-muted w-32 shrink-0">{key}:</span>
                       <span className="text-ink break-all font-bold">{val}</span>
                     </div>
                   ))}
                 </div>
               )}
             </div>

             <hr className="border-line my-8" />

             {/* AFFECTED SURFACE */}
             {issue.affectedResource && (
               <div>
                 <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted font-mono mb-3 flex items-center gap-2">
                   <span className="w-1 h-1 bg-muted rounded-full"></span> Affected Surface
                 </h4>
                 <div className="flex items-center gap-3 text-sm border border-line p-3">
                   <span className="text-[10px] uppercase font-mono tracking-wider bg-ink/[0.05] px-2 py-1 rounded-sm text-muted">
                     {issue.affectedResource.type}
                   </span>
                   <span className="font-mono text-xs truncate" title={issue.affectedResource.url}>
                     {issue.affectedResource.url}
                   </span>
                 </div>
               </div>
             )}

             <hr className="border-line my-8" />

             {/* RECOMMENDED FIX / BASELINE */}
             {issue.remediation && (
               <div>
                 <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted font-mono mb-3 flex items-center gap-2">
                   <span className="w-1 h-1 bg-muted rounded-full"></span> Recommended Fix
                 </h4>
                 <p className="text-sm leading-relaxed mb-2">{issue.remediation.summary}</p>
                 {issue.remediation.details && (
                   <p className="text-xs text-muted leading-relaxed p-3 bg-ink/[0.02] border border-line">{issue.remediation.details}</p>
                 )}
               </div>
             )}

             {/* REFERENCES */}
             {((issue.references && issue.references.length > 0) || (issue.wcagCriteria && issue.wcagCriteria.length > 0)) && (
               <div>
                 <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted font-mono mb-3 flex items-center gap-2">
                   <span className="w-1 h-1 bg-muted rounded-full"></span> References
                 </h4>
                 <div className="flex gap-2 flex-wrap">
                   {issue.wcagCriteria?.map((t) => (
                     <span key={t} className="bg-ink/[0.05] px-2 py-0.5 text-[10px] font-mono rounded">
                       {t}
                     </span>
                   ))}
                   {issue.references?.map((r, i) => (
                     <a key={i} href={r.url} target="_blank" rel="noreferrer" className="bg-ink/[0.05] hover:bg-ink/[0.1] px-2 py-0.5 text-[10px] font-mono rounded underline">
                       {r.title} ↗
                     </a>
                   ))}
                 </div>
               </div>
             )}

             {/* AI COPILOT */}
             <div className="border border-line p-6 bg-ink text-paper relative mt-12 shadow-xl shadow-ink/10">
                 <h4 className="text-[10px] font-bold font-mono text-muted mb-5 tracking-wider uppercase flex items-center justify-between border-b border-white/10 pb-3">
                   <span className="flex items-center gap-2 text-white">
                     <span className="w-2 h-2 bg-accent rounded-full animate-pulse"></span>
                     AI Context Analyzer
                   </span>
                   {explaining && !explanation && <span className="animate-pulse text-accent">Analyzing evidence...</span>}
                 </h4>
                 
                 {explanation ? (
                   <div className="space-y-6">
                     <div>
                       <strong className="block text-[10px] uppercase tracking-wider font-mono mb-2 text-white/50">Analysis</strong>
                       <p className="text-sm text-paper leading-relaxed">{explanation.summary || explanation.plainEnglish}</p>
                     </div>
                     {(explanation.whyItMatters || explanation.whoIsAffected) && (
                       <div>
                         <strong className="block text-[10px] uppercase tracking-wider font-mono mb-2 text-white/50">User Impact</strong>
                         <p className="text-sm text-paper leading-relaxed">
                           {explanation.whyItMatters} {explanation.whoIsAffected && `(${explanation.whoIsAffected})`}
                         </p>
                       </div>
                     )}
                     {(explanation.suggestedFix || explanation.fix) && (
                       <div className="pt-2">
                         <strong className="block text-[10px] uppercase tracking-wider font-mono mb-2 text-good">Remediation Plan</strong>
                         <p className="text-sm text-paper mb-4 leading-relaxed">{explanation.suggestedFix || explanation.fix}</p>
                         
                         {explanation.correctedCode && (
                           <div className="mb-4">
                              <span className="text-[10px] uppercase tracking-wider text-white/30 font-mono">After (Patch)</span>
                              <div className="relative group mt-1">
                                <pre className="font-mono text-xs overflow-x-auto p-4 bg-black border border-white/10 text-good/90">
                                  {explanation.correctedCode}
                                </pre>
                                <button 
                                  onClick={() => navigator.clipboard.writeText(explanation.correctedCode)}
                                  className="absolute top-2 right-2 bg-white/10 hover:bg-white/20 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity uppercase font-mono tracking-wider"
                                >
                                  Copy Patch
                                </button>
                              </div>
                           </div>
                         )}
                         {explanation.explanation && (
                           <p className="text-[11px] text-white/50 font-mono leading-relaxed">Why this works: {explanation.explanation}</p>
                         )}
                       </div>
                     )}
                   </div>
                 ) : explaining ? (
                   <div className="py-8 text-center text-white/50 text-[10px] font-mono uppercase tracking-wider">
                     Synthesizing remediation plan from evidence...
                   </div>
                 ) : (
                   <div className="py-4 text-sm text-white/50 font-mono">
                     {issue.remediation?.summary || "Analyzer failed to generate a dynamic fix for this issue."}
                   </div>
                 )}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
