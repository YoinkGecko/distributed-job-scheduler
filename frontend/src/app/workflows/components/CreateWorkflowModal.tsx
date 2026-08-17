'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { XMarkIcon, InformationCircleIcon, ClockIcon, CalendarIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';

type ScheduleType = 'ONCE' | 'INTERVAL' | 'CRON';
type WorkflowStatus = 'ACTIVE' | 'PAUSED' | 'ARCHIVED';

interface CreateWorkflowFormData {
  name: string;
  description: string;
  status: WorkflowStatus;
  scheduleType: ScheduleType;
  scheduleExpression: string;
  timezone: string;
  startAt: string;
  endAt: string;
  metadata: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

const TIMEZONES = [
  'UTC',
  'Asia/Kolkata',
  'Asia/Dubai',
  'Asia/Singapore',
  'Asia/Tokyo',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Australia/Sydney',
];

const SCHEDULE_EXPRESSION_HELP: Record<ScheduleType, { label: string; placeholder: string; hint: string; pattern?: string }> = {
  ONCE: {
    label: 'Date & Time',
    placeholder: '2026-08-17T10:30',
    hint: 'Select a date and time for one-time execution',
  },
  INTERVAL: {
    label: 'Interval',
    placeholder: '5m',
    hint: 'Use m (minutes), h (hours), or d (days) — e.g., 5m, 2h, 1d',
    pattern: '^\\d+[mhd]$',
  },
  CRON: {
    label: 'Cron Expression',
    placeholder: '0 9 * * *',
    hint: '5-part cron expression — minute hour day month weekday',
    pattern: '^(\\S+\\s+){4}\\S+$',
  },
};

export default function CreateWorkflowModal({ isOpen, onClose, onCreated }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<CreateWorkflowFormData>({
    defaultValues: {
      name: '',
      description: '',
      status: 'ACTIVE',
      scheduleType: 'INTERVAL',
      scheduleExpression: '5m',
      timezone: 'Asia/Kolkata',
      startAt: '',
      endAt: '',
      metadata: '{}',
    },
  });

  const scheduleType = watch('scheduleType');

  // Update expression placeholder when schedule type changes
  const handleScheduleTypeChange = (type: ScheduleType) => {
    setValue('scheduleType', type);
    // Set default expression based on type
    if (type === 'ONCE') {
      setValue('scheduleExpression', '');
    } else if (type === 'INTERVAL') {
      setValue('scheduleExpression', '5m');
    } else {
      setValue('scheduleExpression', '0 9 * * *');
    }
  };

  // Validate expression based on schedule type
  const validateExpression = (value: string) => {
    if (!value || value.trim() === '') {
      return 'Schedule expression is required';
    }

    if (scheduleType === 'ONCE') {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        return 'Please select a valid date and time';
      }
      // Check if date is in the future
      if (date < new Date()) {
        return 'Date must be in the future';
      }
    }

    if (scheduleType === 'INTERVAL') {
      const regex = /^\d+(m|h|d)$/;
      if (!regex.test(value.trim())) {
        return 'Format: number + m/h/d (e.g., 5m, 2h, 1d)';
      }
    }

    if (scheduleType === 'CRON') {
      const parts = value.trim().split(/\s+/);
      if (parts.length !== 5) {
        return 'Cron must have exactly 5 fields (e.g., "0 9 * * *")';
      }
    }

    return true;
  };

  async function onSubmit(data: CreateWorkflowFormData) {
    setIsSubmitting(true);

    try {
      let metadata: Record<string, unknown> = {};
      try {
        metadata = JSON.parse(data.metadata || '{}');
      } catch {
        metadata = {};
      }

      // Format expression based on type
      let expression = data.scheduleExpression.trim();
      if (data.scheduleType === 'ONCE') {
        // Convert local datetime to ISO string for backend
        const date = new Date(data.scheduleExpression);
        expression = date.toISOString();
      }

      const payload = {
        name: data.name,
        description: data.description,
        status: data.status,
        scheduleType: data.scheduleType,
        scheduleExpression: expression,
        timezone: data.timezone,
        startAt: data.startAt ? new Date(data.startAt).toISOString() : null,
        endAt: data.endAt ? new Date(data.endAt).toISOString() : null,
        metadata,
      };

      console.log('Sending payload:', payload);

      const response = await fetch('http://localhost:3000/workflow/createworkflow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Failed to create workflow: ${response.statusText}`);
      }

      const result = await response.json();
      toast.success('Workflow created successfully!', {
        description: `${data.name} is now ${data.status.toLowerCase()}`,
      });

      reset();
      onClose();
      if (onCreated) onCreated();
    } catch (err: any) {
      console.error('Error creating workflow:', err);
      toast.error('Failed to create workflow', {
        description: err.message || 'Please try again',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen) return null;

  const scheduleInfo = SCHEDULE_EXPRESSION_HELP[scheduleType];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-secondary/30">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Create New Workflow</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Define a workflow with scheduling rules
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
          >
            <XMarkIcon width={20} height={20} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto max-h-[calc(90vh-8rem)] px-6 py-5">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label-text">Workflow Name *</label>
                  <input
                    type="text"
                    placeholder="e.g., Daily Email Digest"
                    {...register('name', { required: 'Name is required' })}
                    className={`input-field ${errors.name ? 'border-red-500/50' : ''}`}
                  />
                  {errors.name && (
                    <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                      <InformationCircleIcon width={13} height={13} />
                      {errors.name.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="label-text">Status</label>
                  <select
                    {...register('status')}
                    className="input-field"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="PAUSED">Paused</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label-text">Description</label>
                <textarea
                  rows={2}
                  placeholder="What does this workflow do?"
                  {...register('description')}
                  className="input-field resize-none"
                />
              </div>
            </div>

            {/* Schedule Configuration */}
            <div className="border-t border-border pt-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Schedule Configuration</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label-text">Schedule Type *</label>
                  <select
                    {...register('scheduleType', { 
                      required: 'Schedule type is required',
                      onChange: (e) => handleScheduleTypeChange(e.target.value as ScheduleType)
                    })}
                    className="input-field"
                  >
                    <option value="ONCE">Once</option>
                    <option value="INTERVAL">Interval</option>
                    <option value="CRON">Cron</option>
                  </select>
                </div>

                <div>
                  <label className="label-text">{scheduleInfo.label} *</label>
                  
                  {scheduleType === 'ONCE' ? (
                    <input
                      type="datetime-local"
                      {...register('scheduleExpression', {
                        required: 'Date & time is required',
                        validate: validateExpression,
                      })}
                      className={`input-field ${errors.scheduleExpression ? 'border-red-500/50' : ''}`}
                    />
                  ) : (
                    <input
                      type="text"
                      placeholder={scheduleInfo.placeholder}
                      {...register('scheduleExpression', {
                        required: 'Schedule expression is required',
                        validate: validateExpression,
                      })}
                      className={`input-field font-mono-data ${errors.scheduleExpression ? 'border-red-500/50' : ''}`}
                    />
                  )}
                  
                  <div className="mt-1.5 flex items-start gap-1.5">
                    <InformationCircleIcon width={13} height={13} className="text-muted-foreground flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground">{scheduleInfo.hint}</p>
                  </div>
                  
                  {errors.scheduleExpression && (
                    <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                      <InformationCircleIcon width={13} height={13} />
                      {errors.scheduleExpression.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="label-text">Timezone</label>
                  <select
                    {...register('timezone')}
                    className="input-field"
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Start & End At */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="label-text">Start At (Optional)</label>
                  <input
                    type="datetime-local"
                    {...register('startAt')}
                    className="input-field w-full"
                  />
                </div>
                <div>
                  <label className="label-text">End At (Optional)</label>
                  <input
                    type="datetime-local"
                    {...register('endAt')}
                    className="input-field w-full"
                  />
                </div>
              </div>
            </div>

            {/* Advanced: Metadata */}
            <div className="border-t border-border pt-4">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
              >
                <span className="font-medium">
                  {showAdvanced ? '▼' : '►'} Advanced Options
                </span>
              </button>

              {showAdvanced && (
                <div className="mt-3">
                  <label className="label-text">Metadata (JSON)</label>
                  <textarea
                    rows={3}
                    placeholder="{}"
                    {...register('metadata')}
                    className="input-field font-mono-data resize-none"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Additional metadata for this workflow
                  </p>
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-secondary/30">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            className="btn-primary min-w-32 justify-center"
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
                Creating…
              </>
            ) : (
              'Create Workflow'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}