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

// 1. Custom Node UI Engine
const NodeCard = ({ data, selected }: NodeProps) => {
  const getIcon = (type: string) => {
    switch (type) {
      case 'trigger':
        return <ClockIcon className="w-4 h-4 text-emerald-400" />;
      case 'database':
        return <CircleStackIcon className="w-4 h-4 text-blue-400" />;
      case 'alert':
        return <ExclamationTriangleIcon className="w-4 h-4 text-amber-400" />;
      default:
        return <CpuChipIcon className="w-4 h-4 text-purple-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-mono-data bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
            <CheckCircleIcon className="w-3 h-3" /> Ready
          </span>
        );
      case 'running':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] text-blue-400 font-mono-data bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
            <ArrowPathIcon className="w-3 h-3 animate-spin" /> Active
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] text-zinc-400 font-mono-data bg-zinc-800 px-1.5 py-0.5 rounded">
            Idle
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
            {getIcon((data as Record<string, string>).nodeType)}
          </div>
          <span className="text-xs font-semibold text-foreground font-sans">
            {(data as Record<string, string>).title}
          </span>
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-[11px] font-mono-data text-muted-foreground truncate">
          {(data as Record<string, string>).jobType}
        </p>
        <div className="flex items-center justify-between pt-1">
          {getStatusBadge((data as Record<string, string>).status)}
          <span className="text-[10px] font-mono-data text-muted-foreground">
            P-{(data as Record<string, number>).priority ?? 1}
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

// 2. Multi-branch Pipeline Topology
const initialNodes: Node[] = [
  {
    id: 'n1',
    type: 'customJob',
    position: { x: 50, y: 150 },
    data: {
      title: 'Cron Scheduler',
      jobType: 'trigger.cron_schedule',
      nodeType: 'trigger',
      status: 'success',
      priority: 1,
    },
  },
  {
    id: 'n2',
    type: 'customJob',
    position: { x: 340, y: 150 },
    data: {
      title: 'Fetch Records',
      jobType: 'db.query_pending_jobs',
      nodeType: 'database',
      status: 'success',
      priority: 5,
    },
  },
  {
    id: 'n3',
    type: 'customJob',
    position: { x: 630, y: 60 },
    data: {
      title: 'Send Invoice Email',
      jobType: 'email.deliver_invoice',
      nodeType: 'action',
      status: 'idle',
      priority: 10,
    },
  },
  {
    id: 'n4',
    type: 'customJob',
    position: { x: 630, y: 240 },
    data: {
      title: 'Vacuum Deadlock Log',
      jobType: 'db.vacuum_stale_sessions',
      nodeType: 'database',
      status: 'idle',
      priority: 2,
    },
  },
  {
    id: 'n5',
    type: 'customJob',
    position: { x: 920, y: 150 },
    data: {
      title: 'Slack Fallback Alert',
      jobType: 'alert.notify_failure',
      nodeType: 'alert',
      status: 'idle',
      priority: 99,
    },
  },
];

const initialEdges: Edge[] = [
  {
    id: 'e1-2',
    source: 'n1',
    target: 'n2',
    animated: true,
    style: { stroke: '#6ee7b7', strokeWidth: 2 },
  },
  {
    id: 'e2-3',
    source: 'n2',
    target: 'n3',
    animated: true,
    style: { stroke: '#6ee7b7', strokeWidth: 2 },
  },
  {
    id: 'e2-4',
    source: 'n2',
    target: 'n4',
    animated: true,
    style: { stroke: '#6ee7b7', strokeWidth: 2 },
  },
  {
    id: 'e3-5',
    source: 'n3',
    target: 'n5',
    animated: true,
    style: { stroke: '#71717a', strokeWidth: 1.5 },
  },
  {
    id: 'e4-5',
    source: 'n4',
    target: 'n5',
    animated: true,
    style: { stroke: '#71717a', strokeWidth: 1.5 },
  },
];

export default function VisualBuilder({ workflowId, workflowName }: Props) {
  const [workflowJobs, setWorkflowJobs] = useState([]);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    fetchWorkflowJobs();
  }, []);

  const nodeTypes = useMemo(() => ({ customJob: NodeCard }), []);

  const fetchWorkflowJobs = async () => {
    const response = await fetch(
      `http://localhost:3000/workflow/${workflowId}/jobs`
    );
    const data = await response.json();
    setWorkflowJobs(data);
  };

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge({ ...params, animated: true, style: { stroke: '#6ee7b7', strokeWidth: 2 } }, eds)
      ),
    [setEdges]
  );

  // Simulation: Runs execution across connected pipeline step by step
  const handleSimulateRun = () => {
    setIsRunning(true);

    const steps = ['n1', 'n2', 'n3', 'n4', 'n5'];
    steps.forEach((stepId, index) => {
      setTimeout(() => {
        setNodes((nds) =>
          nds.map((node) => {
            if (node.id === stepId) {
              return {
                ...node,
                data: { ...node.data, status: 'running' },
              };
            }
            return node;
          })
        );
      }, index * 800);

      setTimeout(
        () => {
          setNodes((nds) =>
            nds.map((node) => {
              if (node.id === stepId) {
                return {
                  ...node,
                  data: { ...node.data, status: 'success' },
                };
              }
              return node;
            })
          );
          if (index === steps.length - 1) setIsRunning(false);
        },
        (index + 1) * 800
      );
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
              ID: {workflowId.slice(0, 8)}
            </p>
          </div>
        </div>

        <button
          onClick={handleSimulateRun}
          disabled={isRunning}
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

      {/* xyflow Workspace Surface */}
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
