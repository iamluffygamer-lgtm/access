import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function AttackSurface({ attackSurface }) {
  const [expandedSection, setExpandedSection] = useState(null);

  if (!attackSurface) return null;

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="mb-16">
      <h3 className="text-xs font-mono tracking-widest uppercase mb-6 text-muted border-b border-line pb-4">Attack Surface Inventory</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-px bg-line border border-line mb-4 relative">
        <StatBox label="Pages" value={attackSurface.pages} onClick={() => toggleSection("pages")} active={expandedSection === "pages"} />
        <StatBox label="APIs" value={attackSurface.apis?.length || 0} onClick={() => toggleSection("apis")} active={expandedSection === "apis"} />
        <StatBox label="Scripts" value={attackSurface.scripts?.length || 0} onClick={() => toggleSection("scripts")} active={expandedSection === "scripts"} />
        <StatBox label="3rd-Party" value={attackSurface.domains?.length || 0} onClick={() => toggleSection("domains")} active={expandedSection === "domains"} />
        <StatBox label="Cookies" value={attackSurface.cookies?.length || 0} onClick={() => toggleSection("cookies")} active={expandedSection === "cookies"} />
        <StatBox label="Stack" value={Object.values(attackSurface.stackFingerprint || {}).filter(Boolean).length || 0} onClick={() => toggleSection("stack")} active={expandedSection === "stack"} />
        <StatBox label="Inputs" value={attackSurface.exposedInputs?.length || 0} onClick={() => toggleSection("inputs")} active={expandedSection === "inputs"} />
        <StatBox label="Errors" value={(attackSurface.consoleErrors?.length || 0) + (attackSurface.pageErrors?.length || 0)} onClick={() => toggleSection("errors")} active={expandedSection === "errors"} />
      </div>

      <AnimatePresence mode="wait">
        {expandedSection && (
          <motion.div
            key={expandedSection}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            {expandedSection === "scripts" && (
              <InventoryList title="Loaded Scripts" items={(attackSurface.scripts || []).map(s => s.url)} />
            )}
            {expandedSection === "apis" && (
              <InventoryList title="Observed API Calls" items={(attackSurface.apis || []).map(a => `${a.method} ${a.url}`)} />
            )}
            {expandedSection === "domains" && (
              <InventoryList title="External Domains Contacted" items={attackSurface.domains || []} />
            )}
            {expandedSection === "cookies" && (
              <InventoryList title="Cookies" items={(attackSurface.cookies || []).map(c => `${c.name} (Domain: ${c.domain}, Secure: ${c.secure}, HttpOnly: ${c.httpOnly})`)} />
            )}
            {expandedSection === "stack" && (
              <InventoryList title="Framework Fingerprint" items={Object.entries(attackSurface.stackFingerprint || {}).filter(([_, v]) => v).map(([k]) => k.toUpperCase())} />
            )}
            {expandedSection === "inputs" && (
              <InventoryList title="Exposed Forms & Inputs" items={attackSurface.exposedInputs || []} />
            )}
            {expandedSection === "errors" && (
              <InventoryList title="Console & Network Errors" items={[...(attackSurface.pageErrors || []), ...(attackSurface.consoleErrors || [])]} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatBox({ label, value, onClick, active }) {
  return (
    <button 
      onClick={onClick}
      className={`p-4 flex flex-col items-center justify-center text-center transition-all relative ${active ? "bg-ink text-paper" : "bg-paper text-ink hover:bg-line/20 hover:text-accent"}`}
    >
      <span className="font-display text-3xl mb-1 tracking-tighter">{value}</span>
      <span className="text-[9px] font-mono uppercase tracking-widest">{label}</span>
    </button>
  );
}

function InventoryList({ title, items }) {
  return (
    <div className="bg-paper border border-line p-6">
      <h4 className="text-[10px] font-mono uppercase tracking-widest mb-6 text-muted">{title}</h4>
      {items.length === 0 ? (
        <p className="text-xs font-mono text-muted">None detected.</p>
      ) : (
        <ul className="space-y-3 max-h-64 overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-line scrollbar-track-transparent">
          {items.map((item, i) => (
            <li key={i} className="text-[10px] font-mono text-ink border-b border-line/30 pb-3 hover:text-accent transition-colors break-words whitespace-pre-wrap">
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
