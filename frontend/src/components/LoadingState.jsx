import { motion } from "framer-motion";

export default function LoadingState({ phase }) {
  const isPagePhase = phase?.data?.url;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-paper animate-fade-in z-10 -mt-[10vh]">
      <motion.div 
        className="w-24 h-1 bg-line mb-12 relative overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.div 
          className="absolute inset-y-0 left-0 bg-ink w-1/3"
          animate={{ x: ["-100%", "300%"] }}
          transition={{ duration: 1.5, ease: "easeInOut", repeat: Infinity }}
        />
      </motion.div>
      
      <p className="font-mono text-[10px] tracking-widest uppercase text-ink mb-2">
        {phase?.text || "Initializing Sequence..."}
      </p>

      {isPagePhase && (
        <p className="text-[10px] font-mono text-muted max-w-sm truncate text-center">
          {phase.data.url}
        </p>
      )}

      {phase?.data?.total && phase?.data?.scanned && (
        <p className="mt-6 text-[10px] font-mono text-muted uppercase tracking-widest">
          Index: {phase.data.scanned} // {phase.data.total}
        </p>
      )}
    </div>
  );
}
