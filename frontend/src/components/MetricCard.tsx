import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number | null | undefined;
  unit?: string;
  subtitle?: string;
  icon: LucideIcon;
  badge?: string;
  badgeColor?: 'teal' | 'cyan' | 'amber' | 'rose' | 'slate';
  tooltip?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  subtitle,
  icon: Icon,
  badge,
  badgeColor = 'cyan',
  tooltip
}) => {
  const badgeColors = {
    teal: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
    cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    slate: 'bg-slate-700/50 text-slate-300 border-slate-600/30'
  };

  const displayVal = value !== null && value !== undefined ? value : '—';

  return (
    <div
      className="bg-[#0f172a] border border-slate-800 rounded-xl p-5 shadow-sm hover:border-slate-700/80 transition-all flex flex-col justify-between relative group"
      title={tooltip}
    >
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-medium uppercase tracking-wider text-slate-400">{title}</span>
          <div className="flex items-baseline space-x-1.5 mt-2">
            <span className="text-2xl font-bold tracking-tight text-white">{displayVal}</span>
            {unit && <span className="text-xs font-semibold text-slate-400">{unit}</span>}
          </div>
        </div>
        <div className="w-10 h-10 rounded-lg bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
          <Icon className="w-5 h-5 text-cyan-400" />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs pt-3 border-t border-slate-800/60">
        <span className="text-slate-400 truncate">{subtitle || 'Computed Metric'}</span>
        {badge && (
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${badgeColors[badgeColor]}`}>
            {badge}
          </span>
        )}
      </div>
    </div>
  );
};

