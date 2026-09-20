import { motion, useReducedMotion } from "framer-motion";

export default function PosturePanel({ report }) {
  const reduce = useReducedMotion();
  
  const getStatus = (score) => {
    if (score >= 90) return { label: "OPTIMAL", color: "text-good" };
    if (score >= 70) return { label: "DEGRADED", color: "text-serious" };
    return { label: "CRITICAL", color: "text-critical" };
  };

  const secStatus = getStatus(report.securityPosture);
  const axeStatus = getStatus(report.accessibilityHealth);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: reduce ? 0 : 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16"
    >
      <motion.div variants={item} className="border border-line p-8 bg-paper relative group">
        <div className="absolute top-0 left-0 w-1 h-full bg-line group-hover:bg-ink transition-colors" />
        <div className="flex justify-between items-start mb-12">
          <h2 className="text-xs font-mono text-muted uppercase tracking-wider">Sec Posture</h2>
          <span className="font-mono text-[10px] bg-line/50 px-2 py-1 uppercase tracking-wider text-muted">
            {report.securityFindings.length} Active
          </span>
        </div>
        
        <div className="mb-6 flex items-baseline gap-4">
          <span className="font-display text-7xl tracking-tighter leading-none">
            {report.securityPosture}
          </span>
          <span className={`font-mono text-sm uppercase tracking-wider ${secStatus.color}`}>
            {secStatus.label}
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-4 border-t border-line pt-6">
          <div>
            <p className="text-[10px] font-mono text-muted uppercase tracking-wider mb-1">Controls</p>
            <p className="font-mono text-lg">{Object.keys(report.securityControls).length}</p>
          </div>
          <div>
            <p className="text-[10px] font-mono text-muted uppercase tracking-wider mb-1">Surface</p>
            <p className="font-mono text-lg">
              {(report.attackSurface.apis?.length || 0) + (report.attackSurface.scripts?.length || 0) + (report.attackSurface.exposedInputs?.length || 0)}
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div variants={item} className="border border-line p-8 bg-paper relative group">
        <div className="absolute top-0 left-0 w-1 h-full bg-line group-hover:bg-ink transition-colors" />
        <div className="flex justify-between items-start mb-12">
          <h2 className="text-xs font-mono text-muted uppercase tracking-wider">A11y Health</h2>
          <span className="font-mono text-[10px] bg-line/50 px-2 py-1 uppercase tracking-wider text-muted">
            {report.accessibilityFindings.length} Violations
          </span>
        </div>
        
        <div className="mb-6 flex items-baseline gap-4">
          <span className="font-display text-7xl tracking-tighter leading-none">
            {report.accessibilityHealth}
          </span>
          <span className={`font-mono text-sm uppercase tracking-wider ${axeStatus.color}`}>
            {axeStatus.label}
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-4 border-t border-line pt-6">
          <div className="col-span-2">
            <p className="text-[10px] font-mono text-muted uppercase tracking-wider mb-1">Impact Radius</p>
            <p className="text-xs text-muted max-w-[40ch]">
              Based on violations detected across the rendered DOM and visual layout.
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
