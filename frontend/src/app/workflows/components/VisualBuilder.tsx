'use client';

import React from 'react';
import { Squares2X2Icon } from '@heroicons/react/24/outline';

interface Props {
  workflowId: string;
  workflowName: string;
}

export default function VisualBuilder({ workflowId, workflowName }: Props) {
  return (
    <div className="card p-16 text-center border-dashed border-2 border-border">
      <div className="flex flex-col items-center gap-4">
        <div className="w-20 h-20 rounded-full bg-secondary border border-border flex items-center justify-center">
          <Squares2X2Icon width={40} height={40} className="text-muted-foreground opacity-30" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">Visual Builder</h2>
          <p className="text-sm text-muted-foreground max-w-md mt-1">
            Drag and drop workflow builder for <span className="font-medium text-foreground">{workflowName}</span>
          </p>
          <p className="text-xs text-muted-foreground max-w-md mt-1">
            You'll be able to visually design your workflow with jobs and dependencies.
          </p>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <div className="w-2 h-2 rounded-full bg-primary/30 animate-pulse" />
          <div className="w-2 h-2 rounded-full bg-primary/30 animate-pulse delay-150" />
          <div className="w-2 h-2 rounded-full bg-primary/30 animate-pulse delay-300" />
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
          <span className="text-muted-foreground">Features coming:</span>
          <span className="px-2 py-0.5 rounded-full bg-secondary border border-border">Drag &amp; Drop</span>
          <span className="px-2 py-0.5 rounded-full bg-secondary border border-border">Connect Jobs</span>
          <span className="px-2 py-0.5 rounded-full bg-secondary border border-border">Save Dependencies</span>
          <span className="px-2 py-0.5 rounded-full bg-secondary border border-border">Auto Layout</span>
        </div>
        <div className="mt-4 text-xs text-muted-foreground">
          <span className="font-mono-data bg-secondary px-2 py-0.5 rounded border border-border">
            Workflow ID: {workflowId.slice(0, 12)}...
          </span>
        </div>
      </div>
    </div>
  );
}