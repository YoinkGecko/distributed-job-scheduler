import React from 'react';
import { BellIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';

export default function Topbar() {
  return (
    <header className="h-14 flex items-center justify-between border-b border-border bg-card px-6 lg:px-8 flex-shrink-0">
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono text-muted-foreground">
          UTC {new Date()?.toISOString()?.slice(0, 10)}
        </span>
      </div>
      <div className="flex items-center gap-3">
        {/* Notification bell */}
        <button className="relative btn-ghost p-2" title="Notifications">
          <BellIcon width={18} height={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
        </button>

        {/* Settings */}
        <button className="btn-ghost p-2" title="Settings">
          <Cog6ToothIcon width={18} height={18} />
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-border" />

        {/* User */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-primary">AK</span>
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-foreground leading-tight">Alex Kim</p>
            <p className="text-xs text-muted-foreground leading-tight">alex.kim@platform.dev</p>
          </div>
        </div>
      </div>
    </header>
  );
}