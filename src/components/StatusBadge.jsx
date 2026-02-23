export default function StatusBadge({ status }) {
    const variants = {
        Active: 'badge-success',
        Partner: 'badge-info',
        Completed: 'badge-info',
        'On Hold': 'badge-warning',
        Inactive: 'badge-neutral',
        Draft: 'badge-neutral',
        High: 'badge-danger',
        Medium: 'badge-warning',
        Low: 'badge-success',
        Sent: 'badge-success',
    };

    const className = variants[status] || 'badge-neutral';

    return (
        <span className={`badge ${className}`}>
            <span className="badge-dot" />
            {status}
        </span>
    );
}
