import React from 'react';
import type { Job } from '@/lib/mockData';
import {
  BriefcaseIcon,
  PlayIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

interface JobsMetricsCardsProps {
  jobs?: Job[];
}

export default function JobsMetricsCards({ jobs = [] }: JobsMetricsCardsProps) {
  const total = jobs.length;
  const running = jobs.filter((j) => j?.status === 'RUNNING').length;
  const failed = jobs.filter((j) => j?.status === 'FAILED').length;
  const dead = jobs.filter((j) => j?.status === 'DEAD').length;
  const retrying = jobs.filter((j) => (j?.retryCount ?? 0) > 0).length;

  const cards = [
    {
      key: 'metric-total',
      label: 'Total Jobs',
      value: total,
      icon: BriefcaseIcon,
      iconClass: 'text-muted-foreground',
      iconBg: 'bg-secondary',
      valueClass: 'text-foreground',
      trend: null,
    },
    {
      key: 'metric-running',
      label: 'Running Now',
      value: running,
      icon: PlayIcon,
      iconClass: 'text-emerald-400',
      iconBg: 'bg-emerald-500/10',
      valueClass: 'text-emerald-400',
      trend: null,
    },
    {
      key: 'metric-failed',
      label: 'Failed',
      value: failed,
      icon: ExclamationTriangleIcon,
      iconClass: 'text-amber-400',
      iconBg: 'bg-amber-500/10',
      valueClass: 'text-amber-400',
      trend: failed > 0 ? `${failed} failed` : 'All clear',
    },
    {
      key: 'metric-dead',
      label: 'Dead',
      value: dead,
      icon: ExclamationTriangleIcon,
      iconClass: 'text-red-400',
      iconBg: 'bg-red-500/10',
      valueClass: 'text-red-400',
      trend: dead > 0 ? 'Needs attention' : 'None',
    },
    {
      key: 'metric-retrying',
      label: 'With Retries',
      value: retrying,
      icon: ArrowPathIcon,
      iconClass: 'text-blue-400',
      iconBg: 'bg-blue-500/10',
      valueClass: 'text-blue-400',
      trend: null,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards.map((card) => {
        const IconComponent = card.icon;
        return (
          <div
            key={card.key}
            className={`card p-4 flex flex-col gap-3 ${
              card.key === 'metric-dead' && dead > 0 ? 'border-red-500/30 bg-red-500/5' : ''
            } ${card.key === 'metric-failed' && failed > 0 ? 'border-amber-500/20' : ''}`}
          >
            <div className="flex items-center justify-between">
              <span className="metric-label">{card.label}</span>
              <div className={`w-8 h-8 rounded-lg ${card.iconBg} flex items-center justify-center flex-shrink-0`}>
                <IconComponent className={card.iconClass} width={16} height={16} />
              </div>
            </div>
            <div>
              <p className={`text-hero-metric ${card.valueClass}`}>{card.value}</p>
              {card.trend && (
                <p className="text-xs text-muted-foreground mt-0.5">{card.trend}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}