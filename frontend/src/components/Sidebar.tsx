'use client';

import React from 'react';
import Link from 'next/link';
import AppLogo from '@/components/ui/AppLogo';
import {
  BriefcaseIcon,
  ArrowsRightLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import Icon from '@/components/ui/AppIcon';


interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  activeRoute: string;
}

const navItems = [
  {
    key: 'nav-jobs',
    label: 'Jobs',
    href: '/',
    icon: BriefcaseIcon,
    badge: 3,
    badgeColor: 'bg-red-500/20 text-red-400',
  },
  {
    key: 'nav-workflows',
    label: 'Workflows',
    href: '/workflows',
    icon: ArrowsRightLeftIcon,
    badge: null,
    badgeColor: '',
  },
];

export default function Sidebar({ collapsed, onToggle, activeRoute }: SidebarProps) {
  return (
    <aside
      className={`sidebar-transition relative flex flex-col bg-card border-r border-border flex-shrink-0 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Logo */}
      <div
        className={`flex items-center border-b border-border h-14 flex-shrink-0 ${
          collapsed ? 'justify-center px-3' : 'px-4 gap-2.5'
        }`}
      >
        <AppLogo size={28} />
        {!collapsed && (
          <span className="font-semibold text-sm text-foreground tracking-tight truncate">
            JobScheduler
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5">
        {!collapsed && (
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest px-2 mb-2">
            Navigation
          </p>
        )}
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeRoute === item.href;
          return (
            <Link
              key={item.key}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`group relative flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-primary/10 text-primary' :'text-muted-foreground hover:bg-secondary hover:text-foreground'
              } ${collapsed ? 'justify-center' : ''}`}
            >
              <Icon
                className={`flex-shrink-0 transition-colors ${
                  isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                }`}
                width={18}
                height={18}
              />
              {!collapsed && (
                <>
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.badge !== null && (
                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  )}
                </>
              )}
              {/* Tooltip for collapsed */}
              {collapsed && (
                <span className="pointer-events-none absolute left-full ml-3 px-2 py-1 rounded-md bg-secondary border border-border text-xs text-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50">
                  {item.label}
                  {item.badge !== null && (
                    <span className={`ml-1.5 text-xs font-semibold px-1 py-0.5 rounded-full ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  )}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-border p-2">
        <button
          onClick={onToggle}
          className={`btn-ghost w-full ${collapsed ? 'justify-center' : 'justify-between'}`}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {!collapsed && <span className="text-xs">Collapse</span>}
          {collapsed ? (
            <ChevronRightIcon width={16} height={16} />
          ) : (
            <ChevronLeftIcon width={16} height={16} />
          )}
        </button>
      </div>
    </aside>
  );
}