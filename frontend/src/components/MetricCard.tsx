interface MetricCardProps {
    label: string;
    value: number;
    description?: string;
    color?: 'blue' | 'green' | 'purple' | 'orange' | 'red';
}

const accentClasses: Record<NonNullable<MetricCardProps['color']>, string> = {
    blue:   '',            // default — already set in CSS
    green:  'accent-green',
    purple: 'accent-purple',
    orange: 'accent-amber',
    red:    'accent-red',
};

export function MetricCard({
    label,
    value,
    description,
    color = 'blue',
}: MetricCardProps) {
    return (
        <div className={`metric-card ${accentClasses[color]}`}>
            <div className="text-xs font-semibold uppercase tracking-wider"
                 style={{ color: 'var(--text-muted)' }}>
                {label}
            </div>
            <div className="mt-2 text-3xl font-bold"
                 style={{ color: 'var(--text-primary)' }}>
                {value.toFixed(4)}
            </div>
            {description && (
                <div className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {description}
                </div>
            )}
        </div>
    );
}