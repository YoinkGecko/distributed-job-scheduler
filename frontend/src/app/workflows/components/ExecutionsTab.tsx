'use client';

import React from 'react';
import { PlayCircleIcon } from '@heroicons/react/24/outline';

export default function ExecutionsTab() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <PlayCircleIcon width={40} height={40} className="text-primary" />
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-2">Executions Coming Soon</h3>
      <p className="text-muted-foreground max-w-sm">
        We're working on bringing you a complete execution history and management interface.
      </p>
    </div>
  );
}