interface MetricCardProps {
    label: string;
    value: number;
    description?: string;
    color?: 'blue' | 'green' | 'purple' | 'orange' | 'red';
}

const colorClasses: Record<NonNullable<MetricCardProps['color']>, string> = {
    blue: 'border-blue-500 bg-blue-50 text-blue-700',
    green: 'border-green-500 bg-green-50 text-green-700',
    purple: 'border-purple-500 bg-purple-50 text-purple-700',
    orange: 'border-orange-500 bg-orange-50 text-orange-700',
    red: 'border-red-500 bg-red-50 text-red-700',
};

export function MetricCard({
    label,
    value,
    description,
    color = 'blue',
}: MetricCardProps) {
    const colorClass = colorClasses[color];

    return (
        <div className={`bg-white border-l-4 ${colorClass.split(' ')[0]} rounded-lg shadow p-6`}>
            <div className="text-sm font-medium text-slate-500 uppercase tracking-wide">
                {label}
            </div>
            <div className={`mt-2 text-4xl font-bold ${colorClass.split(' ')[2]}`}>
                {value.toFixed(4)}
            </div>
            {description && (
                <div className="mt-2 text-xs text-slate-500">{description}</div>
            )}
        </div>
    );
}