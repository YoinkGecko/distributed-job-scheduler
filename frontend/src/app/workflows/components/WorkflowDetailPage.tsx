'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRightIcon } from '@heroicons/react/24/outline';

interface Props {
  workflowId: string;
}

export default function WorkflowDetailPage({ workflowId }: Props) {
  return (
    <div className="p-8 max-w-screen-2xl mx-auto">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-6">
        <Link href="/" className="hover:text-primary transition-colors">
          Home
        </Link>
        <ChevronRightIcon width={12} height={12} />
        <Link href="/workflows" className="hover:text-primary transition-colors">
          Workflows
        </Link>
        <ChevronRightIcon width={12} height={12} />
        <span className="text-foreground font-medium">Workflow Detail</span>
      </nav>

      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Workflow Detail Page</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Workflow ID: <span className="font-mono-data text-foreground">{workflowId}</span>
          </p>
        </div>
        <Link href="/workflows" className="btn-secondary text-sm">
          ← Back to Workflows
        </Link>
      </div>

      {/* Placeholder content */}
      <div className="card p-12 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-secondary border border-border flex items-center justify-center">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-muted-foreground"
            >
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M8 2v2M16 2v2M2 8h20" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Workflow Detail Coming Soon</p>
            <p className="text-xs text-muted-foreground max-w-sm mt-1">
              This page will display workflow details, jobs, and execution history.
            </p>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <button className="btn-primary text-xs py-1.5">
              Run Workflow
            </button>
            <button className="btn-secondary text-xs py-1.5">
              Edit Workflow
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}