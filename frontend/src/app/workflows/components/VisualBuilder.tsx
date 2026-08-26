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
import { toast } from 'sonner';

import {
  ClockIcon,
  CpuChipIcon,
  CircleStackIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
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

  const isHorizontal = direction === 'LR' || direction === 'RL';

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
      targetPosition: isHorizontal
        ? direction === 'LR'
          ? Position.Left
          : Position.Right
        : direction === 'TB'
          ? Position.Top
          : Position.Bottom,
      sourcePosition: isHorizontal
        ? direction === 'LR'
          ? Position.Right
          : Position.Left
        : direction === 'TB'
          ? Position.Bottom
          : Position.Top,
      position: {
        x: nodeWithPosition.x - NODE_WIDTH / 2,
        y: nodeWithPosition.y - NODE_HEIGHT / 2,
      },
    };
  });

  return { layoutedNodes, layoutedEdges: edges };
};

// Custom Node UI Component - Shows only: type, id, priority, maxRetries
const NodeCard = ({ data, selected, targetPosition, sourcePosition }: NodeProps) => {
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
      {/* Target Handle (Input) */}
      <Handle
        type="target"
        position={targetPosition || Position.Left}
        className="!w-3.5 !h-3.5 !bg-primary !border-2 !border-background shadow-md hover:!scale-130 transition-transform duration-150 ease-in-out cursor-crosshair"
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

      {/* Source Handle (Output) */}
      <Handle
        type="source"
        position={sourcePosition || Position.Right}
        className="!w-3.5 !h-3.5 !bg-primary !border-2 !border-background shadow-md hover:!scale-130 transition-transform duration-150 ease-in-out cursor-crosshair"
      />
    </div>
  );
};

export default function VisualBuilder({ workflowId, workflowName }: Props) {
  const [workflowJobs, setWorkflowJobs] = useState<string[]>([]);
  const [jobDetails, setJobDetails] = useState<JobDetail[]>([]);
  const [dependencies, setDependencies] = useState<Dependency[]>([]);
  const [layoutDirection, setLayoutDirection] = useState<'LR' | 'RL' | 'TB' | 'BT'>('LR');
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobDetail | null>(null);

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

    const { layoutedNodes, layoutedEdges } = getLayoutedElements(
      rawNodes,
      rawEdges,
      layoutDirection
    );

    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [jobDetails, dependencies, layoutDirection, setNodes, setEdges]);

  // Handle node click
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node.id);
  }, []);

  // Handle pane click
  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  // Update edge styles when selected node changes
  useEffect(() => {
    setEdges((currentEdges) => {
      return currentEdges.map((edge) => {
        // If a node is selected
        if (selectedNode) {
          const isConnected = edge.source === selectedNode || edge.target === selectedNode;
          
          if (isConnected) {
            return {
              ...edge,
              animated: true,
              style: { stroke: '#fbbf24', strokeWidth: 4, opacity: 1 },
            };
          } else {
            return {
              ...edge,
              animated: false,
              style: { stroke: '#6ee7b7', strokeWidth: 1, opacity: 0.15 },
            };
          }
        }
        
        // Default style when no node selected
        return {
          ...edge,
          animated: true,
          style: { stroke: '#6ee7b7', strokeWidth: 2, opacity: 1 },
        };
      });
    });
  }, [selectedNode, setEdges]);

  // Update selectedJob when selectedNode or jobDetails changes
  useEffect(() => {
    if (selectedNode) {
      const job = jobDetails.find(j => j.id === selectedNode);
      setSelectedJob(job || null);
    } else {
      setSelectedJob(null);
    }
  }, [selectedNode, jobDetails]);

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
      setWorkflowJobs(jobIds);

      if (jobIds.length === 0) {
        setJobDetails([]);
        return;
      }

      const detailsPromises = jobIds.map((id: string) => getJobDetails(id));
      const details = await Promise.all(detailsPromises);
      const validDetails = details.filter((d): d is JobDetail => d !== null);
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
      setDependencies(data.dependencies || []);
    } catch (error) {
      console.error('Failed to fetch dependencies:', error);
    }
  };

  const createNewDep = async (newDependency: {
    dependencies: {
      parentWorkflowJobId: string;
      childWorkflowJobId: string;
    }[];
  }) => {
    try {
      const response = await fetch(`http://localhost:3000/workflow/${workflowId}/dependencies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newDependency),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create dependency');
      }

      const data = await response.json();
      console.log('Dependency created:', data);

      toast.success('Dependency created successfully!', {
        description: `${newDependency.dependencies.length} dependency added to workflow`,
      });

      return data;
    } catch (error) {
      console.error('Failed to create dependency:', error);
      toast.error('Failed to create dependency', {
        description: error instanceof Error ? error.message : 'Please try again',
      });
    }
  };

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) =>
        addEdge({ ...params, animated: true, style: { stroke: '#6ee7b7', strokeWidth: 2 } }, eds)
      );

      const newDependency = {
        dependencies: [
          {
            parentWorkflowJobId: params.source,
            childWorkflowJobId: params.target,
          },
        ],
      };

      console.log('New Dependency Added:', JSON.stringify(newDependency, null, 2));
      createNewDep(newDependency);
    },
    [setEdges]
  );

  const directions: Array<{ id: 'LR' | 'RL' | 'TB' | 'BT'; label: string; tooltip: string }> = [
    { id: 'LR', label: 'LR', tooltip: 'Left to Right' },
    { id: 'RL', label: 'RL', tooltip: 'Right to Left' },
    { id: 'TB', label: 'TB', tooltip: 'Top to Bottom' },
    { id: 'BT', label: 'BT', tooltip: 'Bottom to Top' },
  ];

  return (
    <div className="card h-[580px] w-full border border-border overflow-hidden relative rounded-xl bg-background">
      {/* Overlay Toolbar Header Left */}
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

      {/* Overlay Toolbar Header Right - Compact Layout Segmented Control with Hover Tooltips */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-3">
        <div className="bg-card/90 backdrop-blur p-1 rounded-lg border border-border flex items-center gap-1 shadow-lg">
          <span className="text-[11px] font-medium text-muted-foreground px-2">Layout</span>
          <div className="flex items-center gap-0.5 bg-secondary/60 p-0.5 rounded-md border border-border/40">
            {directions.map((dir) => (
              <button
                key={dir.id}
                title={dir.tooltip}
                onClick={() => setLayoutDirection(dir.id)}
                className={`px-2 py-0.5 text-[11px] font-semibold rounded transition-all duration-150 ${
                  layoutDirection === dir.id
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/40'
                }`}
              >
                {dir.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Job Details Panel - Simplified, no glassmorphism */}
      {selectedJob && (
        <div className="absolute top-20 right-4 z-20 w-80 max-h-[calc(100%-6rem)] overflow-y-auto bg-card border border-border rounded-xl shadow-xl p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 className="text-sm font-semibold text-foreground">Job Details</h4>
              <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                {selectedJob.id}
              </p>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="p-1 rounded-md hover:bg-secondary/80 transition-colors"
            >
              <XMarkIcon className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between border-b border-border/40 pb-1">
              <span className="text-muted-foreground">Type</span>
              <span className="font-mono">{selectedJob.type}</span>
            </div>
            <div className="flex justify-between border-b border-border/40 pb-1">
              <span className="text-muted-foreground">Priority</span>
              <span>P-{selectedJob.priority}</span>
            </div>
            <div className="flex justify-between border-b border-border/40 pb-1">
              <span className="text-muted-foreground">Max Retries</span>
              <span>{selectedJob.maxRetries}</span>
            </div>
            <div className="flex justify-between border-b border-border/40 pb-1">
              <span className="text-muted-foreground">Created</span>
              <span className="font-mono text-[10px]">
                {selectedJob.createdAt ? new Date(selectedJob.createdAt).toLocaleString() : '—'}
              </span>
            </div>
            {selectedJob.lastError && (
              <div className="mt-2 p-2 bg-rose-500/10 border border-rose-500/30 rounded-md">
                <span className="text-rose-400 text-[10px] font-medium">Error</span>
                <p className="text-[10px] text-rose-300/90 mt-0.5 break-words">
                  {selectedJob.lastError}
                </p>
              </div>
            )}
            {selectedJob.payload && Object.keys(selectedJob.payload).length > 0 && (
              <div className="mt-2">
                <span className="text-muted-foreground text-[10px]">Payload</span>
                <pre className="mt-1 text-[9px] font-mono bg-secondary/60 p-2 rounded border border-border/40 overflow-x-auto max-h-32">
                  {JSON.stringify(selectedJob.payload, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* xyflow Canvas */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        fitView
        colorMode="dark"
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#27272a" />
        <Controls className="!border-border !bg-card !text-foreground !fill-foreground rounded-lg overflow-hidden shadow-xl" />
      </ReactFlow>
    </div>
  );
}