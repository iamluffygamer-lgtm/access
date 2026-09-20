export default function PostureBreakdown({ report }) {
  return (
    <div className="mb-16 grid grid-cols-1 md:grid-cols-2 gap-12">
      <div>
        <h3 className="text-xs font-mono tracking-widest uppercase mb-6 text-muted border-b border-line pb-4">Security Density</h3>
        <ul className="space-y-2">
          <StatRow label="Critical" count={report.securityCounts.critical} color="bg-critical" />
          <StatRow label="High" count={report.securityCounts.high} color="bg-serious" />
          <StatRow label="Medium" count={report.securityCounts.medium} color="bg-moderate" />
          <StatRow label="Low" count={report.securityCounts.low} color="bg-minor" />
          <StatRow label="Info" count={report.securityCounts.info} color="bg-line text-ink" />
        </ul>
      </div>

      <div>
        <h3 className="text-xs font-mono tracking-widest uppercase mb-6 text-muted border-b border-line pb-4">A11y Density</h3>
        <ul className="space-y-2">
          <StatRow label="Critical" count={report.accessibilityCounts.critical} color="bg-critical" />
          <StatRow label="Serious" count={report.accessibilityCounts.serious} color="bg-serious" />
          <StatRow label="Moderate" count={report.accessibilityCounts.moderate} color="bg-moderate" />
          <StatRow label="Minor" count={report.accessibilityCounts.minor} color="bg-minor" />
        </ul>
      </div>
    </div>
  );
}

function StatRow({ label, count, color }) {
  const hasCount = count > 0;
  return (
    <li className={`flex items-center justify-between p-4 border transition-colors ${hasCount ? 'border-line bg-line/5' : 'border-line/50 bg-transparent'}`}>
      <div className="flex items-center gap-4">
        <span className={`text-[10px] uppercase font-mono tracking-widest px-2 py-1 ${hasCount ? `${color} text-paper` : 'bg-transparent text-muted border border-line'}`}>
          {label}
        </span>
      </div>
      <span className={`font-mono text-sm ${hasCount ? 'text-ink font-bold' : 'text-muted/50'}`}>{count}</span>
    </li>
  );
}
