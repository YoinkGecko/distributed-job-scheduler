'use client';

import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
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
  PlusIcon,
  MagnifyingGlassIcon,
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
      <Handle
        type="target"
        position={targetPosition || Position.Left}
        className="!w-3.5 !h-3.5 !bg-primary !border-2 !border-background shadow-md hover:!scale-130 transition-transform duration-150 ease-in-out cursor-crosshair"
      />

      <div className="flex items-center gap-2 pb-2 border-b border-border/60 mb-2">
        <div className="p-1.5 rounded-md bg-secondary border border-border">
          {getIcon(nodeData.jobType)}
        </div>
        <span className="text-xs font-semibold text-foreground font-sans truncate">
          {nodeData.title || nodeData.jobType}
        </span>
      </div>

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
        position={sourcePosition || Position.Right}
        className="!w-3.5 !h-3.5 !bg-primary !border-2 !border-background shadow-md hover:!scale-130 transition-transform duration-150 ease-in-out cursor-crosshair"
      />
    </div>
  );
};

// ---------- Executions Table Component (merged) ----------
interface Execution {
  id: string;
  workflowId: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ---------- Executions Table Component (with expandable sub-table) ----------
interface Execution {
  id: string;
  workflowId: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ExecutionJob {
  id: string;
  workflowExecutionId: string;
  workflowJobId: string;
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

const ExecutionsTable = ({ workflowId }: { workflowId: string }) => {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // New states for expansion & sub-table
  const [expandedExecutionId, setExpandedExecutionId] = useState<string | null>(null);
  const [executionJobsMap, setExecutionJobsMap] = useState<Record<string, ExecutionJob[]>>({});
  const [loadingJobs, setLoadingJobs] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchExecutions = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`http://localhost:3000/workflow/${workflowId}/executions`);
        if (!res.ok) throw new Error(`Failed to fetch executions: ${res.statusText}`);
        const data = await res.json();
        setExecutions(data);
        if (data.length > 0 && !selectedId) {
          setSelectedId(data[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchExecutions();
  }, [workflowId]);

  const formatDate = (ts: string | null) => {
    if (!ts) return '—';
    try {
      return new Date(ts).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
    } catch {
      return '—';
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; text: string; dot: string }> = {
      RUNNING: { bg: 'bg-blue-500/10', text: 'text-blue-400', dot: 'bg-blue-400' },
      COMPLETED: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400' },
      FAILED: { bg: 'bg-rose-500/10', text: 'text-rose-400', dot: 'bg-rose-400' },
      WAITING: { bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-400' },
    };
    const c = config[status] || { bg: 'bg-zinc-800', text: 'text-zinc-500', dot: 'bg-zinc-500' };
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${c.bg} ${c.text}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
        {status}
      </span>
    );
  };

  const handleRowClick = async (execId: string) => {
    // Toggle collapse: if already expanded, collapse it
    if (expandedExecutionId === execId) {
      setExpandedExecutionId(null);
      return;
    }

    // Expand the clicked row
    setExpandedExecutionId(execId);
    setSelectedId(execId);

    // If we already fetched jobs for this execution, skip the API call
    if (executionJobsMap[execId]) {
      return;
    }

    // Fetch jobs for this execution
    setLoadingJobs((prev) => ({ ...prev, [execId]: true }));
    try {
      const res = await fetch(`http://localhost:3000/workflow/${execId}/execution/jobs`);
      if (!res.ok) throw new Error(`Failed to fetch execution jobs: ${res.statusText}`);
      const data: ExecutionJob[] = await res.json();
      setExecutionJobsMap((prev) => ({ ...prev, [execId]: data }));
    } catch (err) {
      toast.error('Failed to load execution details', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
      console.error('Fetch execution jobs error:', err);
    } finally {
      setLoadingJobs((prev) => ({ ...prev, [execId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="w-5 h-5 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
        <span className="ml-3 text-muted-foreground">Loading executions…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-6 text-center text-red-400">
        <p className="text-sm">Error loading executions: {error}</p>
      </div>
    );
  }

  if (executions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-muted-foreground">No executions found for this workflow.</p>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card/50 h-full">
      <div className="overflow-y-auto h-full">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-card border-b border-border">
            <tr>
              <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Execution
              </th>
              <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Status
              </th>
              <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Started
              </th>
            </tr>
          </thead>
          <tbody>
            {executions.map((exec) => {
              const isExpanded = expandedExecutionId === exec.id;
              const jobs = executionJobsMap[exec.id] || [];
              const isLoadingJobs = loadingJobs[exec.id] || false;

              return (
                <React.Fragment key={exec.id}>
                  {/* Main row */}
                  <tr
                    onClick={() => handleRowClick(exec.id)}
                    className={`cursor-pointer border-b border-border/40 transition-colors hover:bg-primary/5 ${
                      selectedId === exec.id ? 'bg-primary/10' : ''
                    }`}
                  >
                    <td className="px-4 py-2.5 font-mono text-xs">{exec.id.slice(0, 8)}…</td>
                    <td className="px-4 py-2.5">{getStatusBadge(exec.status)}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                      {formatDate(exec.startedAt)}
                    </td>
                  </tr>

                  {/* Expanded sub-table row */}
                  {isExpanded && (
                    <tr key={`${exec.id}-expand`}>
                      <td
                        colSpan={3}
                        className="px-4 py-3 bg-secondary/20 border-b border-border/40"
                      >
                        {isLoadingJobs ? (
                          <div className="flex items-center justify-center py-4">
                            <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            <span className="ml-3 text-xs text-muted-foreground">
                              Loading jobs…
                            </span>
                          </div>
                        ) : jobs.length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-border/60">
                                  <th className="text-left py-1.5 px-2 text-muted-foreground font-medium">
                                    Type
                                  </th>
                                  <th className="text-left py-1.5 px-2 text-muted-foreground font-medium">
                                    Status
                                  </th>
                                  <th className="text-left py-1.5 px-2 text-muted-foreground font-medium">
                                    Retries
                                  </th>
                                  <th className="text-left py-1.5 px-2 text-muted-foreground font-medium">
                                    Worker
                                  </th>
                                  <th className="text-left py-1.5 px-2 text-muted-foreground font-medium">
                                    Heartbeat
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {jobs.map((job) => (
                                  <tr
                                    key={job.id}
                                    className="border-b border-border/20 last:border-0 hover:bg-secondary/30"
                                  >
                                    <td className="py-1.5 px-2 font-mono text-[11px]">
                                      {job.type}
                                    </td>
                                    <td className="py-1.5 px-2">{getStatusBadge(job.status)}</td>
                                    <td className="py-1.5 px-2 font-mono text-[11px]">
                                      {job.retryCount} / {job.maxRetries}
                                    </td>
                                    <td className="py-1.5 px-2 font-mono text-[11px] truncate max-w-[100px]">
                                      {job.assignedWorker || '—'}
                                    </td>
                                    <td className="py-1.5 px-2 font-mono text-[10px] text-muted-foreground">
                                      {formatDate(job.heartbeatAt)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="text-center text-muted-foreground text-sm py-4">
                            No jobs found for this execution.
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ---------- Main VisualBuilder Component ----------
export default function VisualBuilder({ workflowId, workflowName }: Props) {
  const [workflowJobs, setWorkflowJobs] = useState<string[]>([]);
  const [jobDetails, setJobDetails] = useState<JobDetail[]>([]);
  const [dependencies, setDependencies] = useState<Dependency[]>([]);
  const [layoutDirection, setLayoutDirection] = useState<'LR' | 'RL' | 'TB' | 'BT'>('LR');
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobDetail | null>(null);

  // State for Add Job Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<JobDetail[]>([]);
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [addingJobs, setAddingJobs] = useState(false);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const nodeTypes = useMemo(() => ({ customJob: NodeCard }), []);

  // Debounce search
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

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
      const job = jobDetails.find((j) => j.id === selectedNode);
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

  // ---------- Add Job Modal Logic ----------
  const searchJobs = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    setLoadingSearch(true);
    try {
      const res = await fetch(
        `http://localhost:3000/jobs?search=${encodeURIComponent(query)}&limit=20`
      );
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      const jobs = data.jobs.map((j: any) => ({
        id: j.id,
        type: j.type,
      }));
      setSearchResults(jobs);
    } catch (err) {
      console.error('Search error:', err);
      toast.error('Failed to search jobs');
    } finally {
      setLoadingSearch(false);
    }
  };

  // Debounced search
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      searchJobs(searchQuery);
    }, 400);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [searchQuery]);

  const toggleSelectJob = (jobId: string) => {
    setSelectedJobIds((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
  };

  const handleAddSelectedJobs = async () => {
    if (selectedJobIds.size === 0) {
      toast.warning('No jobs selected');
      return;
    }
    setAddingJobs(true);
    try {
      const jobIds = Array.from(selectedJobIds);
      const response = await fetch(`http://localhost:3000/workflow/${workflowId}/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobIds }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Failed to add jobs');
      }
      toast.success(`Added ${jobIds.length} job(s) to workflow`);
      await fetchWorkflowJobs();
      await fetchDependencies(workflowId);
      setIsAddModalOpen(false);
      setSearchQuery('');
      setSearchResults([]);
      setSelectedJobIds(new Set());
    } catch (err) {
      console.error('Add jobs error:', err);
      toast.error('Failed to add jobs', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setAddingJobs(false);
    }
  };

  // ---------- Render ----------
  return (
    <>
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

        {/* Overlay Toolbar Header Right - Layout + Add Button */}
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

          {/* Add Job Button */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-lg hover:bg-primary/90 transition-all border border-primary/30"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            Add Job(s)
          </button>
        </div>

        {/* Job Details Panel - Simplified */}
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

      {/* Add Job Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">Add Jobs to Workflow</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-md hover:bg-secondary/80 transition-colors"
              >
                <XMarkIcon className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Search Input */}
            <div className="p-5 border-b border-border/50">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by job ID or type (min 2 chars)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                {loadingSearch && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              {searchQuery.length > 0 && searchQuery.length < 2 && (
                <p className="text-xs text-muted-foreground mt-1.5">
                  Type at least 2 characters to search
                </p>
              )}
            </div>

            {/* Results List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-1.5">
              {searchResults.length === 0 && searchQuery.length >= 2 && !loadingSearch && (
                <div className="text-sm text-muted-foreground text-center py-8">No jobs found</div>
              )}
              {searchResults.map((job) => (
                <label
                  key={job.id}
                  className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all hover:bg-secondary/60 ${
                    selectedJobIds.has(job.id)
                      ? 'bg-primary/10 border border-primary/30'
                      : 'border border-transparent'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedJobIds.has(job.id)}
                    onChange={() => toggleSelectJob(job.id)}
                    className="w-4 h-4 rounded border-border bg-input accent-primary cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-mono text-foreground truncate">{job.id}</div>
                    <div className="text-xs text-muted-foreground truncate">{job.type}</div>
                  </div>
                </label>
              ))}
              {searchResults.length > 0 && (
                <div className="text-xs text-muted-foreground pt-2">
                  {selectedJobIds.size} selected
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-5 border-t border-border flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setSearchQuery('');
                  setSearchResults([]);
                  setSelectedJobIds(new Set());
                }}
                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSelectedJobs}
                disabled={selectedJobIds.size === 0 || addingJobs}
                className={`px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${
                  selectedJobIds.size === 0 || addingJobs
                    ? 'bg-secondary text-muted-foreground cursor-not-allowed'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg'
                }`}
              >
                {addingJobs ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>Add Selected ({selectedJobIds.size})</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Executions Table – below the builder */}
      <div className="mt-4">
        <ExecutionsTable workflowId={workflowId} />
      </div>
    </>
  );
}
