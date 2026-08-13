import React from 'react';
import { mockJobs } from '@/lib/mockData';
import { BriefcaseIcon, PlayIcon, ExclamationTriangleIcon, ArrowPathIcon,  } from '@heroicons/react/24/outline';
import Icon from '@/components/ui/AppIcon';


export default function JobsMetricsCards() {
  const total = mockJobs?.length;
  const running = mockJobs?.filter((j) => j?.status === 'RUNNING')?.length;
  const failed = mockJobs?.filter((j) => j?.status === 'FAILED')?.length;
  const dead = mockJobs?.filter((j) => j?.status === 'DEAD')?.length;
  const retrying = mockJobs?.filter((j) => j?.retryCount > 0)?.length;
  const completed = mockJobs?.filter((j) => j?.status === 'COMPLETED')?.length;

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
      span: 'col-span-1',
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
      span: 'col-span-1',
    },
    {
      key: 'metric-failed',
      label: 'Failed',
      value: failed,
      icon: ExclamationTriangleIcon,
      iconClass: 'text-amber-400',
      iconBg: 'bg-amber-500/10',
      valueClass: 'text-amber-400',
      trend: '+1 since yesterday',
      span: 'col-span-1',
    },
    {
      key: 'metric-dead',
      label: 'Dead',
      value: dead,
      icon: ExclamationTriangleIcon,
      iconClass: 'text-red-400',
      iconBg: 'bg-red-500/10',
      valueClass: 'text-red-400',
      trend: 'Needs attention',
      span: 'col-span-1',
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
      span: 'col-span-1',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-5 2xl:grid-cols-5 gap-4">
      {cards?.map((card) => {
        const Icon = card?.icon;
        return (
          <div
            key={card?.key}
            className={`card p-4 flex flex-col gap-3 ${
              card?.key === 'metric-dead' ? 'border-red-500/30 bg-red-500/5' : ''
            } ${card?.key === 'metric-failed' ? 'border-amber-500/20' : ''}`}
          >
            <div className="flex items-center justify-between">
              <span className="metric-label">{card?.label}</span>
              <div className={`w-8 h-8 rounded-lg ${card?.iconBg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={card?.iconClass} width={16} height={16} />
              </div>
            </div>
            <div>
              <p className={`text-hero-metric ${card?.valueClass}`}>{card?.value}</p>
              {card?.trend && (
                <p className="text-xs text-muted-foreground mt-0.5">{card?.trend}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}