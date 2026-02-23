export default function StatCard({ icon, value, label, change, accent, className = '' }) {
    return (
        <div className={`stat-card fade-in-up ${className}`} style={{ '--stat-accent': accent }}>
            <div className="stat-card-icon" style={{ background: `${accent}18`, color: accent }}>
                {icon}
            </div>
            <div className="stat-card-value">{value}</div>
            <div className="stat-card-label">{label}</div>
            {change && (
                <div className={`stat-card-change ${change >= 0 ? 'positive' : 'negative'}`}>
                    {change >= 0 ? '↑' : '↓'} {Math.abs(change)}% this month
                </div>
            )}
        </div>
    );
}
