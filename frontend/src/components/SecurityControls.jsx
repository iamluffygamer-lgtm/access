export default function SecurityControls({ controls }) {
  if (!controls) return null;

  const getStatusColor = (status) => {
    switch(status) {
      case 'PASS': return 'bg-good text-paper';
      case 'FAIL': return 'bg-critical text-paper';
      case 'WARN': return 'bg-serious text-paper';
      default: return 'bg-line text-muted';
    }
  };

  return (
    <div className="mb-16">
      <h3 className="text-xs font-mono tracking-widest uppercase mb-6 text-muted border-b border-line pb-4">Security Controls</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-px bg-line border border-line">
        {Object.entries(controls).map(([key, status]) => (
          <div key={key} className="bg-paper p-6 flex flex-col justify-between aspect-square group hover:bg-line/10 transition-colors">
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted group-hover:text-ink transition-colors break-words">
              {key}
            </span>
            <span className={`mt-4 text-[9px] font-mono font-bold uppercase tracking-widest px-2 py-1 self-start ${getStatusColor(status)}`}>
              {status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
