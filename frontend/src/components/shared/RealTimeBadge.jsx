// Pulsing LIVE badge for real-time data indicators
export default function RealTimeBadge({ className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
      LIVE
    </span>
  );
}
