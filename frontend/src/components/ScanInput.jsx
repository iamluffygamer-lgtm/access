import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

export default function ScanInput({ onScan, demoSites }) {
  const [url, setUrl] = useState("");
  const [mode, setMode] = useState("quick");
  const reduce = useReducedMotion();

  function submit(e) {
    e.preventDefault();
    const isDemo = demoSites.includes(url);
    if (url.trim()) onScan(url.trim(), isDemo, mode);
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: reduce ? 0 : 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
    }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="min-h-[100dvh] flex flex-col justify-center px-6 sm:px-10 max-w-5xl mx-auto -mt-20"
    >
      <motion.div variants={itemVariants} className="mb-12">
        <h2 className="font-mono text-xs text-muted uppercase tracking-widest mb-4">
          AccessLens / Security Scanner
        </h2>
        <h1 className="text-5xl md:text-7xl font-display tracking-tighter leading-[1.1] max-w-3xl">
          Application Posture <br />
          <span className="text-muted">Analysis Engine.</span>
        </h1>
      </motion.div>

      <motion.form variants={itemVariants} onSubmit={submit} className="w-full max-w-2xl relative mb-8">
        <div className="flex flex-col gap-2">
          <label htmlFor="url" className="sr-only">Target URL</label>
          <div className="flex flex-col sm:flex-row gap-4 w-full">
            <div className="relative flex-1 group">
              <input
                id="url"
                autoFocus
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                required
                className="w-full px-6 py-5 bg-paper border-2 border-line text-ink text-lg placeholder:text-muted focus:outline-none focus:border-ink transition-colors font-mono"
              />
              <div className="absolute top-0 right-0 h-full w-2 bg-accent opacity-0 group-focus-within:opacity-100 transition-opacity" />
            </div>
            
            <div className="flex gap-4">
              <select 
                value={mode} 
                onChange={(e) => setMode(e.target.value)}
                className="px-6 py-5 bg-paper border-2 border-line text-sm font-mono uppercase tracking-wider outline-none text-ink focus:border-ink transition-colors appearance-none cursor-pointer"
              >
                <option value="quick">Quick Scan</option>
                <option value="deep">Deep Scan</option>
              </select>
              <button
                type="submit"
                className="px-8 py-5 bg-ink text-paper font-display font-bold uppercase tracking-widest text-sm hover:bg-ink/90 active:scale-[0.98] transition-all whitespace-nowrap"
              >
                Initialize
              </button>
            </div>
          </div>
        </div>
      </motion.form>

      {demoSites?.length > 0 && (
        <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-4 text-xs font-mono uppercase tracking-wider">
          <span className="text-muted">Target Presets:</span>
          {demoSites.map((site) => (
            <button
              key={site}
              onClick={() => onScan(site, true)}
              className="px-3 py-1 border border-line text-muted hover:text-ink hover:border-ink transition-colors bg-line/20"
            >
              {site.replace(/^https?:\/\//, "")}
            </button>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
