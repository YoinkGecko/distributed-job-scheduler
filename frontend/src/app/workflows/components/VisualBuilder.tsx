'use client';

import React, { useCallback, useMemo, useState, useEffect } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
  Handle,
  Position,
  NodeProps,
} from '@xyflow/react';

import {
  ClockIcon,
  CpuChipIcon,
  CircleStackIcon,
  ExclamationTriangleIcon,
  PlayIcon,
  CheckCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

interface Props {
  workflowId: string;
  workflowName: string;
}

interface JobDetail {
  id: string;
  type: string;
  payload: Record<string, any>;
  status: string;
  priority: number;
  scheduledAt: string;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  retryCount: number;
  maxRetries: number;
  assignedWorker: string | null;
  heartbeatAt: string | null;
  lockExpiresAt: string | null;
  lastError: string | null;
}

interface Dependency {
  id: string;
  parentWorkflowJobId: string;
  parentJobId: string;
  childWorkflowJobId: string;
  childJobId: string;
  createdAt: string;
}

interface WorkflowDependenciesResponse {
  workflowId: string;
  dependencies: Dependency[];
}

// 1. Custom Node UI Component
const NodeCard = ({ data, selected }: NodeProps) => {
  const nodeData = data as Record<string, any>;

  const getIcon = (type: string) => {
    if (type?.includes('trigger') || type?.includes('cron')) {
      return <ClockIcon className="w-4 h-4 text-emerald-400" />;
    }
    if (type?.includes('db') || type?.includes('query')) {
      return <CircleStackIcon className="w-4 h-4 text-blue-400" />;
    }
    if (type?.includes('alert') || type?.includes('error')) {
      return <ExclamationTriangleIcon className="w-4 h-4 text-amber-400" />;
    }
    return <CpuChipIcon className="w-4 h-4 text-purple-400" />;
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'success':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-mono-data bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
            <CheckCircleIcon className="w-3 h-3" /> Ready
          </span>
        );
      case 'running':
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] text-blue-400 font-mono-data bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
            <ArrowPathIcon className="w-3 h-3 animate-spin" /> Active
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] text-zinc-400 font-mono-data bg-zinc-800 px-1.5 py-0.5 rounded">
            {status || 'Idle'}
          </span>
        );
    }
  };

  return (
    <div
      className={`relative min-w-[220px] rounded-xl bg-card/90 border p-3 shadow-xl backdrop-blur-md transition-all ${
        selected ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-zinc-700'
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2.5 !h-2.5 !bg-primary !border-2 !border-background hover:!scale-125 transition-transform"
      />

      <div className="flex items-center justify-between pb-2 border-b border-border/60 mb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-secondary border border-border">
            {getIcon(nodeData.jobType)}
          </div>
          <span className="text-xs font-semibold text-foreground font-sans">
            {nodeData.title || nodeData.jobType}
          </span>
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-[11px] font-mono-data text-muted-foreground truncate">
          ID: {nodeData.jobId?.slice(0, 8)}
        </p>
        <div className="flex items-center justify-between pt-1">
          {getStatusBadge(nodeData.status)}
          <span className="text-[10px] font-mono-data text-muted-foreground">
            P-{nodeData.priority ?? 1}
          </span>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-2.5 !h-2.5 !bg-primary !border-2 !border-background hover:!scale-125 transition-transform"
      />
    </div>
  );
};

export default function VisualBuilder({ workflowId, workflowName }: Props) {
  const [workflowJobs, setWorkflowJobs] = useState<string[]>([]);
  const [jobDetails, setJobDetails] = useState<JobDetail[]>([]);
  const [dependencies, setDependencies] = useState<Dependency[]>([]);
  
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [isRunning, setIsRunning] = useState(false);

  const nodeTypes = useMemo(() => ({ customJob: NodeCard }), []);

  useEffect(() => {
    fetchWorkflowJobs();
    fetchDependencies(workflowId);
  }, [workflowId]);

  // 1. Dynamic Nodes Generation from jobDetails
  useEffect(() => {
    if (jobDetails.length === 0) return;

    const generatedNodes: Node[] = jobDetails.map((job, index) => ({
      id: job.id,
      type: 'customJob',
      position: { x: (index % 3) * 300 + 50, y: Math.floor(index / 3) * 150 + 100 },
      data: {
        jobId: job.id,
        title: job.type,
        jobType: job.type,
        status: job.status,
        priority: job.priority,
      },
    }));

    setNodes(generatedNodes);
  }, [jobDetails, setNodes]);

  // 2. Dynamic Edges Generation from dependencies
  useEffect(() => {
    if (dependencies.length === 0) return;

    const generatedEdges: Edge[] = dependencies.map((dep) => ({
      id: dep.id,
      source: dep.parentJobId,
      target: dep.childJobId,
      animated: true,
      style: { stroke: '#6ee7b7', strokeWidth: 2 },
    }));

    setEdges(generatedEdges);
  }, [dependencies, setEdges]);

  const getJobDetails = async (jobId: string) => {
    const response = await fetch(`http://localhost:3000/jobs/${jobId}`);
    const data = await response.json();
    return data.job;
  };

  const fetchWorkflowJobs = async () => {
    try {
      const response = await fetch(`http://localhost:3000/workflow/${workflowId}/jobs`);
      const jobIds = await response.json();
      setWorkflowJobs(jobIds);

      const detailsPromises = jobIds.map((id: string) => getJobDetails(id));
      const details = await Promise.all(detailsPromises);
      setJobDetails(details);
    } catch (error) {
      console.error('Failed to fetch workflow jobs:', error);
    }
  };

  const fetchDependencies = async (id: string) => {
    try {
      const response = await fetch(`http://localhost:3000/workflow/${id}/dependencies`);
      if (!response.ok) {
        throw new Error(`Failed to fetch dependencies: ${response.statusText}`);
      }
      const data: WorkflowDependenciesResponse = await response.json();
      setDependencies(data.dependencies);
    } catch (error) {
      console.error('Failed to fetch dependencies:', error);
    }
  };

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge({ ...params, animated: true, style: { stroke: '#6ee7b7', strokeWidth: 2 } }, eds)
      ),
    [setEdges]
  );

  const handleSimulateRun = () => {
    if (nodes.length === 0) return;
    setIsRunning(true);

    nodes.forEach((node, index) => {
      setTimeout(() => {
        setNodes((nds) =>
          nds.map((n) => (n.id === node.id ? { ...n, data: { ...n.data, status: 'running' } } : n))
        );
      }, index * 800);

      setTimeout(() => {
        setNodes((nds) =>
          nds.map((n) => (n.id === node.id ? { ...n, data: { ...n.data, status: 'success' } } : n))
        );
        if (index === nodes.length - 1) setIsRunning(false);
      }, (index + 1) * 800);
    });
  };

  return (
    <div className="card h-[580px] w-full border border-border overflow-hidden relative rounded-xl bg-background">
      {/* Overlay Toolbar Header */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-3">
        <div className="bg-card/90 backdrop-blur px-3.5 py-2 rounded-lg border border-border flex items-center gap-3 shadow-lg">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
          </span>
          <div>
            <h3 className="text-xs font-semibold text-foreground">{workflowName}</h3>
            <p className="text-[10px] font-mono-data text-muted-foreground">
              ID: {workflowId.slice(0, 8)} • Jobs: {jobDetails.length} • Edges: {edges.length}
            </p>
          </div>
        </div>

        <button
          onClick={handleSimulateRun}
          disabled={isRunning || nodes.length === 0}
          className="btn-primary text-xs py-2 px-3 shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5"
        >
          {isRunning ? (
            <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <PlayIcon className="w-3.5 h-3.5 fill-current" />
          )}
          {isRunning ? 'Running Pipeline…' : 'Test Run Workflow'}
        </button>
      </div>

      {/* xyflow Canvas */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        colorMode="dark"
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#27272a" />
        <Controls className="!border-border !bg-card !text-foreground !fill-foreground rounded-lg overflow-hidden shadow-xl" />
      </ReactFlow>
    </div>
  );
}