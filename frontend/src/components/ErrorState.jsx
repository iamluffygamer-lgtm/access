const MESSAGES = {
  SCAN_TIMEOUT: "The page took too long to load. Some sites block automated visitors — try a demo example instead.",
  UNREACHABLE: "That URL couldn't be reached. Check it's spelled correctly and includes the right domain.",
  MISSING_URL: "Enter a URL to audit.",
};

export default function ErrorState({ code, message, onRetry }) {
  return (
    <div className="max-w-xl border border-critical p-6">
      <p className="font-display text-2xl mb-2 text-critical">Scan failed</p>
      <p className="text-muted mb-6">{MESSAGES[code] || message || "Something went wrong on that scan."}</p>
      <button
        onClick={onRetry}
        className="bg-ink text-paper px-5 py-2.5 text-sm font-medium hover:bg-accent transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
