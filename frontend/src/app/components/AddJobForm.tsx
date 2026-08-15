'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { RETRY_POLICY } from '@/lib/mockData';
import type { Job, JobPriority } from '@/lib/mockData';
import {
  CheckCircleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

interface AddJobFormData {
  type: string;
  payloadRaw: string;
  priority: number;
  scheduledAt: string;
}

interface Props {
  onAdd: (job: Job) => void;
  onCancel: () => void;
  existingCount: number;
}

const JOB_TYPE_SUGGESTIONS = [
  'email.send_welcome',
  'email.send_invoice',
  'report.generate_monthly',
  'payment.process_refund',
  'search.reindex_products',
  'db.vacuum_stale_sessions',
  'notification.push_bulk',
  'webhook.deliver_event',
  'analytics.aggregate_daily_metrics',
  'ml.train_recommendation_model',
  'storage.purge_expired_uploads',
  'audit.export_compliance_log',
];

// Helper to derive string priority category from numeric priority (1 - 100)
function derivePriorityLabel(num: number): JobPriority {
  if (num <= 10) return 'LOW';
  if (num <= 40) return 'NORMAL';
  if (num <= 70) return 'HIGH';
  return 'CRITICAL';
}

export default function AddJobForm({ onAdd, onCancel, existingCount }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = useForm<AddJobFormData>({
    defaultValues: {
      type: '',
      payloadRaw: '{\n  \n}',
      priority: 35,
      scheduledAt: new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16),
    },
  });

  const numericPriority = Number(watch('priority')) || 35;
  const derivedPriorityLabel = derivePriorityLabel(numericPriority);
  const derivedMaxRetries = RETRY_POLICY[derivedPriorityLabel] ?? 3;

  async function onSubmit(data: AddJobFormData) {
    let parsedPayload: Record<string, unknown> = {};
    try {
      parsedPayload = JSON.parse(data.payloadRaw);
    } catch {
      parsedPayload = { raw: data.payloadRaw };
    }

    setIsSubmitting(true);

    const priorityValue = Number(data.priority);

    try {
      const response = await fetch('http://localhost:3000/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: data.type,
          payload: parsedPayload,
          priority: priorityValue,
          scheduledAt: new Date(data.scheduledAt).toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create job: ${response.statusText}`);
      }

      const result = await response.json();
      const rawJob = result.job || result;

      const newJob: Job = {
        ...rawJob,
        type: rawJob.type || data.type,
        priority: derivePriorityLabel(priorityValue),
      };

      setIsSubmitting(false);
      setSubmitted(true);

      setTimeout(() => {
        onAdd(newJob);
        reset();
        setSubmitted(false);
      }, 600);
    } catch (err) {
      console.error('Error creating job:', err);
      setIsSubmitting(false);
    }
  }

  return (
    <div className="card p-6 border-primary/20">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-1 h-5 rounded-full bg-primary" />
        <h2 className="section-header">Schedule New Job</h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Job Type */}
          <div className="md:col-span-2">
            <label className="label-text">Job Type *</label>
            <p className="text-xs text-muted-foreground mb-2">
              Dot-separated namespace identifier — e.g. <span className="font-mono-data">email.send_welcome</span>
            </p>
            <input
              type="text"
              placeholder="e.g. email.send_invoice"
              list="job-type-suggestions"
              {...register('type', {
                required: 'Job type is required',
                pattern: {
                  value: /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$/,
                  message: 'Use lowercase letters, numbers, underscores, and dots',
                },
              })}
              className={`input-field font-mono-data ${errors.type ? 'border-red-500/50 focus:ring-red-500/30' : ''}`}
            />
            <datalist id="job-type-suggestions">
              {JOB_TYPE_SUGGESTIONS.map((t) => (
                <option key={`suggestion-${t}`} value={t} />
              ))}
            </datalist>
            {errors.type && (
              <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                <InformationCircleIcon width={13} height={13} />
                {errors.type.message}
              </p>
            )}
          </div>

          {/* Numeric Priority Input */}
          <div>
            <label className="label-text">Priority Number (1 – 100) *</label>
            <p className="text-xs text-muted-foreground mb-2">
              Enter a numerical priority value from 1 (lowest) to 100 (highest)
            </p>
            <input
              type="number"
              min={1}
              max={100}
              placeholder="5"
              {...register('priority', {
                required: 'Priority value is required',
                valueAsNumber: true,
                min: { value: 1, message: 'Priority must be at least 1' },
                max: { value: 100, message: 'Priority cannot exceed 100' },
              })}
              className={`input-field font-mono-data ${errors.priority ? 'border-red-500/50' : ''}`}
            />
            {errors.priority && (
              <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                <InformationCircleIcon width={13} height={13} />
                {errors.priority.message}
              </p>
            )}
          </div>

          {/* Scheduled At */}
          <div>
            <label className="label-text">Scheduled At *</label>
            <p className="text-xs text-muted-foreground mb-2">
              When this job should be picked up by a worker
            </p>
            <input
              type="datetime-local"
              {...register('scheduledAt', { required: 'Scheduled time is required' })}
              className={`input-field font-mono-data ${errors.scheduledAt ? 'border-red-500/50' : ''}`}
            />
            {errors.scheduledAt && (
              <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                <InformationCircleIcon width={13} height={13} />
                {errors.scheduledAt.message}
              </p>
            )}
          </div>

          {/* Payload */}
          <div className="md:col-span-2">
            <label className="label-text">Payload (JSON)</label>
            <p className="text-xs text-muted-foreground mb-2">
              Job-specific data passed to the worker. Must be valid JSON.
            </p>
            <textarea
              rows={5}
              {...register('payloadRaw', {
                validate: (v) => {
                  if (!v.trim()) return true;
                  try {
                    JSON.parse(v);
                    return true;
                  } catch {
                    return 'Payload must be valid JSON';
                  }
                },
              })}
              className={`input-field font-mono-data resize-none ${errors.payloadRaw ? 'border-red-500/50' : ''}`}
              spellCheck={false}
            />
            {errors.payloadRaw && (
              <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                <InformationCircleIcon width={13} height={13} />
                {errors.payloadRaw.message}
              </p>
            )}
          </div>
        </div>

        {/* Dynamic derived info banner */}
        <div className="bg-primary/5 border border-primary/15 rounded-lg px-4 py-3 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <InformationCircleIcon width={14} height={14} className="text-primary flex-shrink-0" />
            <span className="text-xs text-muted-foreground">Derived from numerical priority:</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs">
              <span className="text-muted-foreground">Category: </span>
              <span className="font-mono-data font-semibold text-primary">{derivedPriorityLabel}</span>
            </span>
            <span className="text-xs">
              <span className="text-muted-foreground">Max Retries: </span>
              <span className="font-mono-data font-semibold text-primary">{derivedMaxRetries}</span>
            </span>
            <span className="text-xs">
              <span className="text-muted-foreground">Initial Status: </span>
              <span className="font-mono-data font-semibold text-zinc-400">WAITING</span>
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2 border-t border-border">
          <button
            type="submit"
            disabled={isSubmitting || submitted}
            className="btn-primary min-w-36 justify-center"
          >
            {submitted ? (
              <>
                <CheckCircleIcon width={16} height={16} />
                Job Scheduled
              </>
            ) : isSubmitting ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
                Scheduling…
              </>
            ) : (
              'Schedule Job'
            )}
          </button>
          <button type="button" onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}