'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { RETRY_POLICY } from '@/lib/mockData';
import type { Job, JobPriority } from '@/lib/mockData';
import {
  CheckCircleIcon,
  InformationCircleIcon,
  ClockIcon,
  CalendarIcon,
  BoltIcon,
} from '@heroicons/react/24/outline';

interface AddJobFormData {
  type: string;
  payloadRaw: string;
  priority: number;
  scheduledAt: string;
  scheduleOption: 'now' | 'later';
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

function derivePriorityLabel(num: number): JobPriority {
  if (num <= 10) return 'LOW';
  if (num <= 40) return 'NORMAL';
  if (num <= 70) return 'HIGH';
  return 'CRITICAL';
}

// Helper to get local datetime string for datetime-local input
function getLocalDateTimeString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default function AddJobForm({ onAdd, onCancel, existingCount }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<AddJobFormData>({
    defaultValues: {
      type: '',
      payloadRaw: '{\n  \n}',
      priority: 35,
      scheduleOption: 'later',
      scheduledAt: getLocalDateTimeString(new Date(Date.now() + 5 * 60 * 1000)),
    },
  });

  const numericPriority = Number(watch('priority')) || 35;
  const derivedPriorityLabel = derivePriorityLabel(numericPriority);
  const derivedMaxRetries = RETRY_POLICY[derivedPriorityLabel] ?? 3;
  const scheduleOption = watch('scheduleOption');

  const handleScheduleOptionChange = (option: 'now' | 'later') => {
    setValue('scheduleOption', option);
    if (option === 'now') {
      const now = new Date();
      now.setSeconds(0);
      now.setMilliseconds(0);
      setValue('scheduledAt', getLocalDateTimeString(now));
    } else {
      const later = new Date(Date.now() + 5 * 60 * 1000);
      setValue('scheduledAt', getLocalDateTimeString(later));
    }
  };

  const setScheduledToNow = (offsetMinutes: number = 5) => {
    const date = new Date(Date.now() + offsetMinutes * 60 * 1000);
    date.setSeconds(0);
    date.setMilliseconds(0);
    setValue('scheduledAt', getLocalDateTimeString(date));
  };

  async function onSubmit(data: AddJobFormData) {
    let parsedPayload: Record<string, unknown> = {};
    try {
      parsedPayload = JSON.parse(data.payloadRaw);
    } catch {
      parsedPayload = { raw: data.payloadRaw };
    }

    setIsSubmitting(true);

    const priorityValue = Number(data.priority);
    let scheduledAt: string;

    if (data.scheduleOption === 'now') {
      scheduledAt = new Date().toISOString();
    } else {
      // Convert local datetime string to UTC ISO string
      const localDate = new Date(data.scheduledAt);
      scheduledAt = localDate.toISOString();
    }

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
          scheduledAt: scheduledAt,
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
        setValue('scheduleOption', 'later');
        setValue('scheduledAt', getLocalDateTimeString(new Date(Date.now() + 5 * 60 * 1000)));
      }, 600);
    } catch (err) {
      console.error('Error creating job:', err);
      setIsSubmitting(false);
    }
  }

  const validateScheduledAt = (value: string) => {
    if (!value) return 'Scheduled time is required';
    const selectedDate = new Date(value);
    const now = new Date();
    const minDate = new Date(now.getTime() + 60 * 1000);
    if (selectedDate < minDate) {
      return 'Scheduled time must be at least 1 minute from now';
    }
    return true;
  };

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

          {/* Scheduled At - Redesigned */}
          <div>
            <label className="label-text">Schedule *</label>
            <p className="text-xs text-muted-foreground mb-2">
              Choose when this job should be picked up by a worker
            </p>
            
            {/* Schedule Toggle */}
            <div className="relative bg-secondary/50 rounded-lg p-1 mb-3 border border-border">
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => handleScheduleOptionChange('now')}
                  className={`
                    flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all duration-200
                    ${scheduleOption === 'now'
                      ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                    }
                  `}
                >
                  <BoltIcon width={16} height={16} className={scheduleOption === 'now' ? 'text-primary-foreground' : ''} />
                  Run Now
                </button>
                <button
                  type="button"
                  onClick={() => handleScheduleOptionChange('later')}
                  className={`
                    flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all duration-200
                    ${scheduleOption === 'later'
                      ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                    }
                  `}
                >
                  <CalendarIcon width={16} height={16} className={scheduleOption === 'later' ? 'text-primary-foreground' : ''} />
                  Schedule Later
                </button>
              </div>
            </div>

            {/* DateTime Picker - Only when "Later" is selected */}
            {scheduleOption === 'later' && (
              <div className="space-y-3">
                {/* Current time reference */}
                <div className="flex items-center justify-between bg-secondary/30 rounded-lg px-3 py-2 border border-border">
                  <div className="flex items-center gap-2">
                    <ClockIcon width={14} height={14} className="text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Current time:</span>
                  </div>
                  <span className="font-mono-data text-xs text-foreground">
                    {currentTime.toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: true,
                    })}
                  </span>
                </div>

                {/* DateTime input with quick actions */}
                <div className="relative">
                  <CalendarIcon width={18} height={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="datetime-local"
                    {...register('scheduledAt', {
                      required: scheduleOption === 'later' ? 'Scheduled time is required' : false,
                      validate: scheduleOption === 'later' ? validateScheduledAt : undefined,
                    })}
                    className={`input-field pl-10 font-mono-data ${errors.scheduledAt ? 'border-red-500/50' : ''}`}
                  />
                </div>

                {/* Quick action buttons */}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setScheduledToNow(1)}
                    className="text-xs px-3 py-1.5 rounded-md border border-border bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-all"
                  >
                    +1 min
                  </button>
                  <button
                    type="button"
                    onClick={() => setScheduledToNow(5)}
                    className="text-xs px-3 py-1.5 rounded-md border border-border bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-all"
                  >
                    +5 min
                  </button>
                  <button
                    type="button"
                    onClick={() => setScheduledToNow(15)}
                    className="text-xs px-3 py-1.5 rounded-md border border-border bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-all"
                  >
                    +15 min
                  </button>
                  <button
                    type="button"
                    onClick={() => setScheduledToNow(30)}
                    className="text-xs px-3 py-1.5 rounded-md border border-border bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-all"
                  >
                    +30 min
                  </button>
                  <button
                    type="button"
                    onClick={() => setScheduledToNow(60)}
                    className="text-xs px-3 py-1.5 rounded-md border border-border bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-all"
                  >
                    +1 hour
                  </button>
                </div>

                {errors.scheduledAt && (
                  <p className="text-xs text-red-400 flex items-center gap-1">
                    <InformationCircleIcon width={13} height={13} />
                    {errors.scheduledAt.message}
                  </p>
                )}
                
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <span>Select a date &amp; time in the future (minimum 1 minute from now)</span>
                </p>
              </div>
            )}

            {/* Now indicator */}
            {scheduleOption === 'now' && (
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-4 py-3 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <div>
                  <p className="text-sm text-foreground font-medium">Immediate Execution</p>
                  <p className="text-xs text-muted-foreground">
                    Job will be queued for immediate processing
                  </p>
                </div>
              </div>
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