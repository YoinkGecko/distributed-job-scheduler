'use client';

import React, { useCallback, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MarkerType,
  NodeTypes,
} from 'reactflow';
//import 'reactflow/dist/style.css';
import { Square2StackIcon } from '@heroicons/react/24/outline';

interface WorkflowJob {
  id: string;
  workflowId: string;
  jobId: string;
  job: {
    id: string;
    type: string;
    status: 'WAITING' | 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'DEAD';
    priority: number;
  };
  createdAt: string;
}

interface WorkflowDependency {
  id: string;
  parentWorkflowJobId: string;
  parentJobId: string;      // ← This is the job ID from jobs table
  childWorkflowJobId: string;
  childJobId: string;       // ← This is the job ID from jobs table
  createdAt: string;
}

interface Props {
  jobs: WorkflowJob[];
  dependencies: WorkflowDependency[];
  workflowId: string;
  onNodeClick: (jobId: string) => void;
  onJobsUpdated: () => void;
  onDependenciesUpdated: () => void;
}

// Custom Job Node Component
function JobNode({ data, selected }: { data: any; selected?: boolean }) {
  const statusColors: Record<string, { bg: string; border: string; text: string; dot: string }> = {
    WAITING: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      text: 'text-amber-400',
      dot: 'bg-amber-400',
    },
    PENDING: {
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/30',
      text: 'text-blue-400',
      dot: 'bg-blue-400',
    },
    RUNNING: {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      text: 'text-emerald-400',
      dot: 'bg-emerald-400 animate-pulse',
    },
    COMPLETED: {
      bg: 'bg-zinc-500/10',
      border: 'border-zinc-500/30',
      text: 'text-zinc-400',
      dot: 'bg-zinc-400',
    },
    FAILED: {
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
      text: 'text-red-400',
      dot: 'bg-red-400',
    },
    DEAD: {
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
      text: 'text-red-400',
      dot: 'bg-red-400',
    },
  };

  const colors = statusColors[data.status] || statusColors.WAITING;

  return (
    <div
      className={`min-w-[160px] rounded-xl border-2 transition-all duration-200 cursor-pointer ${
        selected
          ? 'border-primary shadow-lg shadow-primary/25 bg-card'
          : 'border-border hover:border-primary/40 bg-card'
      }`}
    >
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono-data text-muted-foreground truncate max-w-[80px]">
            {data.jobId?.slice(0, 8) || '---'}
          </span>
          <span
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${colors.bg} ${colors.border} ${colors.text}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
            {data.status}
          </span>
        </div>
        <div className="text-sm font-medium text-foreground truncate">
          {data.label || 'Unknown'}
        </div>
        <div className="text-[10px] text-muted-foreground font-mono-data">
          Priority: {data.priority || 0}
        </div>
      </div>
    </div>
  );
}

const nodeTypes: NodeTypes = {
  jobNode: JobNode,
};

export default function WorkflowCanvas({ jobs, dependencies, onNodeClick }: Props) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Build nodes from jobs
  useEffect(() => {
    const jobNodes: Node[] = jobs.map((job, index) => ({
      id: job.id,
      type: 'jobNode',
      position: {
        x: 150 + (index % 4) * 250,
        y: 100 + Math.floor(index / 4) * 180,
      },
      data: {
        label: job.job.type,
        status: job.job.status,
        priority: job.job.priority,
        jobId: job.jobId,
        workflowJobId: job.id,
      },
    }));

    setNodes(jobNodes);
  }, [jobs, setNodes]);

  // Build edges from dependencies using job IDs (parentJobId → childJobId)
  useEffect(() => {
    if (dependencies.length === 0 || jobs.length === 0) {
      setEdges([]);
      return;
    }

    // Create a map from jobId to workflowJobId (node ID)
    const jobIdToWorkflowJobId = new Map<string, string>();
    jobs.forEach(job => {
      jobIdToWorkflowJobId.set(job.jobId, job.id);
    });

    const dependencyEdges: Edge[] = [];

    dependencies.forEach((dep) => {
      // Find the workflow job IDs using the job IDs from the dependency
      const sourceWorkflowJobId = jobIdToWorkflowJobId.get(dep.parentJobId);
      const targetWorkflowJobId = jobIdToWorkflowJobId.get(dep.childJobId);

      // Only create edge if both jobs exist in the workflow
      if (sourceWorkflowJobId && targetWorkflowJobId) {
        dependencyEdges.push({
          id: dep.id,
          source: sourceWorkflowJobId,
          target: targetWorkflowJobId,
          type: 'smoothstep',
          animated: true,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#60a5fa',
          },
          style: {
            stroke: '#60a5fa',
            strokeWidth: 2,
          },
        });
      } else {
        console.warn('⚠️ Could not find workflow job for dependency:', {
          parentJobId: dep.parentJobId,
          childJobId: dep.childJobId,
          parentWorkflowJobId: sourceWorkflowJobId,
          childWorkflowJobId: targetWorkflowJobId,
        });
      }
    });

    setEdges(dependencyEdges);
  }, [dependencies, jobs, setEdges]);

  const onNodeClickHandler = useCallback(
    (event: React.MouseEvent, node: Node) => {
      onNodeClick(node.id);
    },
    [onNodeClick]
  );

  if (jobs.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <Square2StackIcon width={48} height={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No jobs in this workflow</p>
          <p className="text-xs mt-1">Add jobs using the "Add Job" button</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClickHandler}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.3}
        maxZoom={1.5}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: true,
        }}
      >
        <Background color="#4a4a5a" gap={20} size={1} />
        <Controls />
      </ReactFlow>
    </div>
  );
}