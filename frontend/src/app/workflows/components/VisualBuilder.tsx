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
import dagre from 'dagre';

import {
  ClockIcon,
  CpuChipIcon,
  CircleStackIcon,
  ExclamationTriangleIcon,
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

// Node dimensions for Dagre layout calculations
const NODE_WIDTH = 240;
const NODE_HEIGHT = 100;

// Dagre Automatic Layout Engine
const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'LR') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: 50,
    ranksep: 100,
  });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      targetPosition: Position.Left,
      sourcePosition: Position.Right,
      position: {
        x: nodeWithPosition.x - NODE_WIDTH / 2,
        y: nodeWithPosition.y - NODE_HEIGHT / 2,
      },
    };
  });

  return { layoutedNodes, layoutedEdges: edges };
};

// Custom Node UI Component - Shows only: type, id, priority, maxRetries
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

  return (
    <div
      className={`relative min-w-[200px] rounded-xl bg-card/90 border p-3 shadow-xl backdrop-blur-md transition-all ${
        selected ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-zinc-700'
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2.5 !h-2.5 !bg-primary !border-2 !border-background hover:!scale-125 transition-transform"
      />

      {/* Type */}
      <div className="flex items-center gap-2 pb-2 border-b border-border/60 mb-2">
        <div className="p-1.5 rounded-md bg-secondary border border-border">
          {getIcon(nodeData.jobType)}
        </div>
        <span className="text-xs font-semibold text-foreground font-sans truncate">
          {nodeData.title || nodeData.jobType}
        </span>
      </div>

      {/* Only: ID, Priority, Max Retries */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">ID</span>
          <span className="text-[10px] font-mono-data text-foreground truncate max-w-[100px]">
            {nodeData.jobId?.slice(0, 12) || '---'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">Priority</span>
          <span className="text-[10px] font-mono-data text-foreground">
            P-{nodeData.priority ?? 1}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">Max Retries</span>
          <span className="text-[10px] font-mono-data text-foreground">
            {nodeData.maxRetries ?? 3}
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

  const nodeTypes = useMemo(() => ({ customJob: NodeCard }), []);

  useEffect(() => {
    fetchWorkflowJobs();
    fetchDependencies(workflowId);
  }, [workflowId]);

  // Combined Layout Effect
  useEffect(() => {
    if (jobDetails.length === 0) return;

    const rawNodes: Node[] = jobDetails.map((job) => ({
      id: job.id,
      type: 'customJob',
      position: { x: 0, y: 0 },
      data: {
        jobId: job.id,
        title: job.type,
        jobType: job.type,
        priority: job.priority,
        maxRetries: job.maxRetries,
      },
    }));

    const rawEdges: Edge[] = dependencies.map((dep) => ({
      id: dep.id,
      source: dep.parentJobId,
      target: dep.childJobId,
      animated: true,
      style: { stroke: '#6ee7b7', strokeWidth: 2 },
    }));

    const { layoutedNodes, layoutedEdges } = getLayoutedElements(rawNodes, rawEdges, 'LR');

    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [jobDetails, dependencies, setNodes, setEdges]);

  const getJobDetails = async (jobId: string) => {
    try {
      const response = await fetch(`http://localhost:3000/jobs/${jobId}`);
      if (!response.ok) return null;
      const data = await response.json();
      const job = data.job || data;
      return {
        id: job.id,
        type: job.type || 'unknown',
        payload: job.payload || {},
        status: job.status || 'WAITING',
        priority: job.priority || 0,
        scheduledAt: job.scheduledAt || null,
        createdAt: job.createdAt || null,
        updatedAt: job.updatedAt || null,
        startedAt: job.startedAt || null,
        completedAt: job.completedAt || null,
        retryCount: job.retryCount || 0,
        maxRetries: job.maxRetries || 3,
        assignedWorker: job.assignedWorker || null,
        heartbeatAt: job.heartbeatAt || null,
        lockExpiresAt: job.lockExpiresAt || null,
        lastError: job.lastError || null,
      };
    } catch {
      return null;
    }
  };

  const fetchWorkflowJobs = async () => {
    try {
      const response = await fetch(`http://localhost:3000/workflow/${workflowId}/jobs`);
      if (!response.ok) {
        console.error(`Failed to fetch workflow jobs: ${response.status}`);
        return;
      }

      const jobIds: string[] = await response.json();
      console.log('Job IDs:', jobIds);
      setWorkflowJobs(jobIds);

      if (jobIds.length === 0) {
        setJobDetails([]);
        return;
      }

      const detailsPromises = jobIds.map((id: string) => getJobDetails(id));
      const details = await Promise.all(detailsPromises);
      const validDetails = details.filter((d): d is JobDetail => d !== null);
      console.log('Job details:', validDetails);
      setJobDetails(validDetails);
    } catch (error) {
      console.error('Failed to fetch workflow jobs:', error);
    }
  };

  const fetchDependencies = async (id: string) => {
    try {
      const response = await fetch(`http://localhost:3000/workflow/${id}/dependencies`);
      if (!response.ok) {
        console.error(`Failed to fetch dependencies: ${response.status}`);
        return;
      }

      const data: WorkflowDependenciesResponse = await response.json();
      console.log('Dependencies:', data.dependencies);
      setDependencies(data.dependencies || []);
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

  return (
    <div className="card h-[580px] w-full border border-border overflow-hidden relative rounded-xl bg-background">
      {/* Overlay Toolbar Header */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-3">
        <div className="bg-card/90 backdrop-blur px-3.5 py-2 rounded-lg border border-border flex items-center gap-3 shadow-lg">
          <div>
            <h3 className="text-xs font-semibold text-foreground">{workflowName}</h3>
            <p className="text-[10px] font-mono-data text-muted-foreground">
              ID: {workflowId.slice(0, 8)} • Jobs: {jobDetails.length} • Edges: {edges.length}
            </p>
          </div>
        </div>
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