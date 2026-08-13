import type { JobStatus, JobPriority } from '@/components/ui/StatusBadge';

export interface Job {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  status: JobStatus;
  priority: JobPriority;
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

export const RETRY_POLICY: Record<JobPriority, number> = {
  LOW: 2,
  NORMAL: 3,
  HIGH: 5,
  CRITICAL: 10,
};

export const PRIORITY_VALUE: Record<JobPriority, number> = {
  LOW: 1,
  NORMAL: 5,
  HIGH: 10,
  CRITICAL: 100,
};

export const mockJobs: Job[] = [
  {
    id: 'job-001',
    type: 'email.send_welcome',
    payload: { userId: 'usr-8821', email: 'onboard@acme.io', template: 'welcome_v3' },
    status: 'COMPLETED',
    priority: 'NORMAL',
    scheduledAt: '2026-08-13T14:00:00Z',
    createdAt: '2026-08-13T13:58:22Z',
    updatedAt: '2026-08-13T14:02:11Z',
    startedAt: '2026-08-13T14:00:04Z',
    completedAt: '2026-08-13T14:02:11Z',
    retryCount: 0,
    maxRetries: 3,
    assignedWorker: 'worker-alpha-01',
    heartbeatAt: '2026-08-13T14:02:08Z',
    lockExpiresAt: null,
    lastError: null,
  },
  {
    id: 'job-002',
    type: 'report.generate_monthly',
    payload: { orgId: 'org-441', month: '2026-07', format: 'pdf', recipients: ['cfo@acme.io'] },
    status: 'RUNNING',
    priority: 'HIGH',
    scheduledAt: '2026-08-13T15:30:00Z',
    createdAt: '2026-08-13T15:28:00Z',
    updatedAt: '2026-08-13T15:51:44Z',
    startedAt: '2026-08-13T15:30:02Z',
    completedAt: null,
    retryCount: 1,
    maxRetries: 5,
    assignedWorker: 'worker-beta-03',
    heartbeatAt: '2026-08-13T15:51:40Z',
    lockExpiresAt: '2026-08-13T16:01:40Z',
    lastError: 'Timeout on PDF renderer — retrying',
  },
  {
    id: 'job-003',
    type: 'db.vacuum_stale_sessions',
    payload: { olderThanDays: 30, dryRun: false },
    status: 'FAILED',
    priority: 'LOW',
    scheduledAt: '2026-08-13T02:00:00Z',
    createdAt: '2026-08-13T01:58:00Z',
    updatedAt: '2026-08-13T02:04:18Z',
    startedAt: '2026-08-13T02:00:01Z',
    completedAt: null,
    retryCount: 2,
    maxRetries: 2,
    assignedWorker: 'worker-gamma-02',
    heartbeatAt: '2026-08-13T02:04:10Z',
    lockExpiresAt: null,
    lastError: 'FATAL: deadlock detected on sessions table — lock wait timeout exceeded',
  },
  {
    id: 'job-004',
    type: 'payment.process_refund',
    payload: { transactionId: 'txn-99210', amount: 4799, currency: 'USD', reason: 'customer_request' },
    status: 'DEAD',
    priority: 'CRITICAL',
    scheduledAt: '2026-08-12T18:00:00Z',
    createdAt: '2026-08-12T17:59:00Z',
    updatedAt: '2026-08-13T01:22:00Z',
    startedAt: '2026-08-12T18:00:03Z',
    completedAt: null,
    retryCount: 10,
    maxRetries: 10,
    assignedWorker: null,
    heartbeatAt: null,
    lockExpiresAt: null,
    lastError: 'Payment gateway connection refused after 10 attempts — circuit breaker open',
  },
  {
    id: 'job-005',
    type: 'search.reindex_products',
    payload: { catalogId: 'cat-220', fullReindex: true, batchSize: 500 },
    status: 'PENDING',
    priority: 'NORMAL',
    scheduledAt: '2026-08-13T16:00:00Z',
    createdAt: '2026-08-13T15:45:00Z',
    updatedAt: '2026-08-13T15:45:00Z',
    startedAt: null,
    completedAt: null,
    retryCount: 0,
    maxRetries: 3,
    assignedWorker: null,
    heartbeatAt: null,
    lockExpiresAt: null,
    lastError: null,
  },
  {
    id: 'job-006',
    type: 'notification.push_bulk',
    payload: { campaignId: 'camp-88', segmentId: 'seg-premium', count: 12450 },
    status: 'RUNNING',
    priority: 'HIGH',
    scheduledAt: '2026-08-13T15:45:00Z',
    createdAt: '2026-08-13T15:40:00Z',
    updatedAt: '2026-08-13T15:52:10Z',
    startedAt: '2026-08-13T15:45:05Z',
    completedAt: null,
    retryCount: 0,
    maxRetries: 5,
    assignedWorker: 'worker-alpha-02',
    heartbeatAt: '2026-08-13T15:52:08Z',
    lockExpiresAt: '2026-08-13T16:02:08Z',
    lastError: null,
  },
  {
    id: 'job-007',
    type: 'audit.export_compliance_log',
    payload: { fromDate: '2026-07-01', toDate: '2026-07-31', format: 'csv', requestedBy: 'usr-1001' },
    status: 'WAITING',
    priority: 'LOW',
    scheduledAt: '2026-08-13T18:00:00Z',
    createdAt: '2026-08-13T15:50:00Z',
    updatedAt: '2026-08-13T15:50:00Z',
    startedAt: null,
    completedAt: null,
    retryCount: 0,
    maxRetries: 2,
    assignedWorker: null,
    heartbeatAt: null,
    lockExpiresAt: null,
    lastError: null,
  },
  {
    id: 'job-008',
    type: 'ml.train_recommendation_model',
    payload: { modelId: 'rec-v4', datasetVersion: '2026-Q2', epochs: 50, gpuClass: 'A100' },
    status: 'RUNNING',
    priority: 'CRITICAL',
    scheduledAt: '2026-08-13T10:00:00Z',
    createdAt: '2026-08-13T09:58:00Z',
    updatedAt: '2026-08-13T15:52:15Z',
    startedAt: '2026-08-13T10:00:08Z',
    completedAt: null,
    retryCount: 0,
    maxRetries: 10,
    assignedWorker: 'worker-gpu-01',
    heartbeatAt: '2026-08-13T15:52:10Z',
    lockExpiresAt: '2026-08-13T16:02:10Z',
    lastError: null,
  },
  {
    id: 'job-009',
    type: 'email.send_invoice',
    payload: { invoiceId: 'inv-5510', customerId: 'cust-3302', amount: 12900, currency: 'USD' },
    status: 'COMPLETED',
    priority: 'NORMAL',
    scheduledAt: '2026-08-13T09:00:00Z',
    createdAt: '2026-08-13T08:58:00Z',
    updatedAt: '2026-08-13T09:01:44Z',
    startedAt: '2026-08-13T09:00:02Z',
    completedAt: '2026-08-13T09:01:44Z',
    retryCount: 0,
    maxRetries: 3,
    assignedWorker: 'worker-alpha-01',
    heartbeatAt: '2026-08-13T09:01:40Z',
    lockExpiresAt: null,
    lastError: null,
  },
  {
    id: 'job-010',
    type: 'storage.purge_expired_uploads',
    payload: { bucketId: 'uploads-tmp', olderThanHours: 48, dryRun: false },
    status: 'FAILED',
    priority: 'NORMAL',
    scheduledAt: '2026-08-13T06:00:00Z',
    createdAt: '2026-08-13T05:58:00Z',
    updatedAt: '2026-08-13T06:08:22Z',
    startedAt: '2026-08-13T06:00:04Z',
    completedAt: null,
    retryCount: 3,
    maxRetries: 3,
    assignedWorker: 'worker-beta-02',
    heartbeatAt: null,
    lockExpiresAt: null,
    lastError: 'S3 AccessDenied: insufficient permissions on bucket uploads-tmp',
  },
  {
    id: 'job-011',
    type: 'webhook.deliver_event',
    payload: { webhookId: 'wh-9921', event: 'order.completed', targetUrl: 'https://partner.io/hooks', attempt: 1 },
    status: 'PENDING',
    priority: 'HIGH',
    scheduledAt: '2026-08-13T15:55:00Z',
    createdAt: '2026-08-13T15:53:00Z',
    updatedAt: '2026-08-13T15:53:00Z',
    startedAt: null,
    completedAt: null,
    retryCount: 0,
    maxRetries: 5,
    assignedWorker: null,
    heartbeatAt: null,
    lockExpiresAt: null,
    lastError: null,
  },
  {
    id: 'job-012',
    type: 'analytics.aggregate_daily_metrics',
    payload: { date: '2026-08-12', orgIds: ['org-441', 'org-220', 'org-099'], includeRevenue: true },
    status: 'COMPLETED',
    priority: 'NORMAL',
    scheduledAt: '2026-08-13T01:00:00Z',
    createdAt: '2026-08-13T00:58:00Z',
    updatedAt: '2026-08-13T01:18:44Z',
    startedAt: '2026-08-13T01:00:03Z',
    completedAt: '2026-08-13T01:18:44Z',
    retryCount: 0,
    maxRetries: 3,
    assignedWorker: 'worker-gamma-01',
    heartbeatAt: '2026-08-13T01:18:40Z',
    lockExpiresAt: null,
    lastError: null,
  },
];

export interface Workflow {
  id: string;
  name: string;
  description: string;
  triggerType: 'CRON' | 'EVENT' | 'MANUAL' | 'WEBHOOK';
  cronExpression: string | null;
  steps: WorkflowStep[];
  status: 'ACTIVE' | 'PAUSED' | 'DRAFT' | 'ARCHIVED';
  lastRunAt: string | null;
  lastRunStatus: JobStatus | null;
  activeJobs: number;
  completedToday: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowStep {
  order: number;
  jobType: string;
  label: string;
  dependsOn: number[];
}

export const mockWorkflows: Workflow[] = [
  {
    id: 'wf-001',
    name: 'Monthly Billing Pipeline',
    description: 'Generates invoices, charges customers, sends receipts, and updates accounting ledger.',
    triggerType: 'CRON',
    cronExpression: '0 0 1 * *',
    steps: [
      { order: 1, jobType: 'billing.generate_invoices', label: 'Generate Invoices', dependsOn: [] },
      { order: 2, jobType: 'payment.charge_customers', label: 'Charge Customers', dependsOn: [1] },
      { order: 3, jobType: 'email.send_invoice', label: 'Send Receipts', dependsOn: [2] },
      { order: 4, jobType: 'accounting.sync_ledger', label: 'Sync Ledger', dependsOn: [2] },
    ],
    status: 'ACTIVE',
    lastRunAt: '2026-08-01T00:02:11Z',
    lastRunStatus: 'COMPLETED',
    activeJobs: 0,
    completedToday: 0,
    createdAt: '2025-11-01T09:00:00Z',
    updatedAt: '2026-08-01T00:02:11Z',
  },
  {
    id: 'wf-002',
    name: 'User Onboarding Flow',
    description: 'Sends welcome email, provisions workspace, schedules check-in notification.',
    triggerType: 'EVENT',
    cronExpression: null,
    steps: [
      { order: 1, jobType: 'email.send_welcome', label: 'Welcome Email', dependsOn: [] },
      { order: 2, jobType: 'workspace.provision', label: 'Provision Workspace', dependsOn: [1] },
      { order: 3, jobType: 'notification.schedule_checkin', label: 'Schedule Check-in', dependsOn: [2] },
    ],
    status: 'ACTIVE',
    lastRunAt: '2026-08-13T14:00:04Z',
    lastRunStatus: 'RUNNING',
    activeJobs: 2,
    completedToday: 18,
    createdAt: '2026-01-15T10:30:00Z',
    updatedAt: '2026-08-13T14:00:04Z',
  },
  {
    id: 'wf-003',
    name: 'ML Model Retraining',
    description: 'Fetches training data, trains recommendation model, validates, and deploys to staging.',
    triggerType: 'CRON',
    cronExpression: '0 10 * * 4',
    steps: [
      { order: 1, jobType: 'data.fetch_training_set', label: 'Fetch Training Data', dependsOn: [] },
      { order: 2, jobType: 'ml.train_recommendation_model', label: 'Train Model', dependsOn: [1] },
      { order: 3, jobType: 'ml.validate_model', label: 'Validate Model', dependsOn: [2] },
      { order: 4, jobType: 'deploy.push_to_staging', label: 'Deploy to Staging', dependsOn: [3] },
    ],
    status: 'ACTIVE',
    lastRunAt: '2026-08-13T10:00:08Z',
    lastRunStatus: 'RUNNING',
    activeJobs: 1,
    completedToday: 1,
    createdAt: '2026-03-20T08:00:00Z',
    updatedAt: '2026-08-13T10:00:08Z',
  },
  {
    id: 'wf-004',
    name: 'Compliance Audit Export',
    description: 'Aggregates audit logs, generates compliance report, and delivers to legal team.',
    triggerType: 'MANUAL',
    cronExpression: null,
    steps: [
      { order: 1, jobType: 'audit.collect_logs', label: 'Collect Audit Logs', dependsOn: [] },
      { order: 2, jobType: 'audit.export_compliance_log', label: 'Export Report', dependsOn: [1] },
      { order: 3, jobType: 'email.deliver_to_legal', label: 'Deliver to Legal', dependsOn: [2] },
    ],
    status: 'PAUSED',
    lastRunAt: '2026-07-31T09:00:00Z',
    lastRunStatus: 'COMPLETED',
    activeJobs: 0,
    completedToday: 0,
    createdAt: '2026-02-10T11:00:00Z',
    updatedAt: '2026-07-31T09:44:00Z',
  },
  {
    id: 'wf-005',
    name: 'Nightly Data Cleanup',
    description: 'Vacuums stale sessions, purges temp uploads, and rebuilds search indexes.',
    triggerType: 'CRON',
    cronExpression: '0 2 * * *',
    steps: [
      { order: 1, jobType: 'db.vacuum_stale_sessions', label: 'Vacuum Sessions', dependsOn: [] },
      { order: 2, jobType: 'storage.purge_expired_uploads', label: 'Purge Uploads', dependsOn: [] },
      { order: 3, jobType: 'search.reindex_products', label: 'Rebuild Search Index', dependsOn: [1, 2] },
    ],
    status: 'ACTIVE',
    lastRunAt: '2026-08-13T02:00:01Z',
    lastRunStatus: 'FAILED',
    activeJobs: 0,
    completedToday: 0,
    createdAt: '2025-12-01T00:00:00Z',
    updatedAt: '2026-08-13T02:04:18Z',
  },
  {
    id: 'wf-006',
    name: 'Webhook Delivery Retry',
    description: 'Retries failed webhook deliveries with exponential backoff across partner endpoints.',
    triggerType: 'EVENT',
    cronExpression: null,
    steps: [
      { order: 1, jobType: 'webhook.deliver_event', label: 'Deliver Event', dependsOn: [] },
      { order: 2, jobType: 'webhook.verify_delivery', label: 'Verify Delivery', dependsOn: [1] },
    ],
    status: 'ACTIVE',
    lastRunAt: '2026-08-13T15:53:00Z',
    lastRunStatus: 'PENDING',
    activeJobs: 1,
    completedToday: 44,
    createdAt: '2026-04-05T14:00:00Z',
    updatedAt: '2026-08-13T15:53:00Z',
  },
];
export { JobPriority };