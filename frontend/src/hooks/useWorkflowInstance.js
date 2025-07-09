// src/hooks/useWorkflowInstance.js
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { workflowService } from "../services/workflowService";
import { workflowExecutionService } from "../services/workflowExecutionService";

/**
 * Custom hook for managing workflow instance operations
 * @param {string} instanceId - The workflow instance ID
 * @param {Object} options - Configuration options
 * @returns {Object} Hook methods and state
 */
export const useWorkflowInstance = (instanceId, options = {}) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const {
    autoRefresh = true,
    refreshInterval = 30000,
    onActionSuccess,
    onActionError,
  } = options;

  // Fetch workflow instance details
  const {
    data: instance,
    isLoading,
    error,
    refetch,
  } = useQuery(
    ["workflow-instance", instanceId],
    () => workflowService.getWorkflowInstance(instanceId),
    {
      enabled: !!instanceId,
      refetchInterval: (data) => {
        // Auto-refresh if instance is running and autoRefresh is enabled
        return autoRefresh && data?.instance?.status === "running"
          ? refreshInterval
          : false;
      },
      staleTime: 30000, // Consider data fresh for 30 seconds
    }
  );

  // Pause instance mutation
  const pauseMutation = useMutation(
    () => workflowService.pauseWorkflowInstance(instanceId),
    {
      onSuccess: (data) => {
        toast.success(t("workflows.instancePaused"));
        queryClient.invalidateQueries(["workflow-instance", instanceId]);
        onActionSuccess?.("pause", data);
      },
      onError: (error) => {
        const message = error.message || t("workflows.pauseFailed");
        toast.error(message);
        onActionError?.("pause", error);
      },
    }
  );

  // Resume instance mutation
  const resumeMutation = useMutation(
    () => workflowService.resumeWorkflowInstance(instanceId),
    {
      onSuccess: (data) => {
        toast.success(t("workflows.instanceResumed"));
        queryClient.invalidateQueries(["workflow-instance", instanceId]);
        onActionSuccess?.("resume", data);
      },
      onError: (error) => {
        const message = error.message || t("workflows.resumeFailed");
        toast.error(message);
        onActionError?.("resume", error);
      },
    }
  );

  // Cancel instance mutation
  const cancelMutation = useMutation(
    () => workflowService.cancelWorkflowInstance(instanceId),
    {
      onSuccess: (data) => {
        toast.success(t("workflows.instanceCancelled"));
        queryClient.invalidateQueries(["workflow-instance", instanceId]);
        onActionSuccess?.("cancel", data);
      },
      onError: (error) => {
        const message = error.message || t("workflows.cancelFailed");
        toast.error(message);
        onActionError?.("cancel", error);
      },
    }
  );

  // Clone instance mutation
  const cloneMutation = useMutation(
    () => workflowExecutionService.cloneWorkflowInstance(instanceId),
    {
      onSuccess: (data) => {
        toast.success(t("workflows.instanceCloned"));
        queryClient.invalidateQueries(["workflow-instances"]);
        onActionSuccess?.("clone", data);
      },
      onError: (error) => {
        const message = error.message || t("workflows.cloneFailed");
        toast.error(message);
        onActionError?.("clone", error);
      },
    }
  );

  // Helper functions
  const canPerformAction = (action) => {
    const status = instance?.instance?.status;

    switch (action) {
      case "pause":
        return status === "running";
      case "resume":
        return status === "paused";
      case "cancel":
        return ["running", "paused", "pending"].includes(status);
      case "clone":
        return true; // Can always clone
      default:
        return false;
    }
  };

  const executeAction = async (action, confirmationMessage = null) => {
    // Show confirmation if required
    if (confirmationMessage && !window.confirm(confirmationMessage)) {
      return false;
    }

    try {
      switch (action) {
        case "pause":
          await pauseMutation.mutateAsync();
          break;
        case "resume":
          await resumeMutation.mutateAsync();
          break;
        case "cancel":
          await cancelMutation.mutateAsync();
          break;
        case "clone":
          const result = await cloneMutation.mutateAsync();
          return result;
        default:
          throw new Error(`Unknown action: ${action}`);
      }
      return true;
    } catch (error) {
      console.error(`Failed to execute action ${action}:`, error);
      return false;
    }
  };

  const getDuration = () => {
    const instanceData = instance?.instance;
    if (!instanceData?.created_at) return t("workflows.notStarted");

    const start = new Date(instanceData.created_at);
    const end = instanceData.completed_at
      ? new Date(instanceData.completed_at)
      : new Date();
    const diffMs = end - start;

    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return t("workflows.durationDaysHours", { days, hours });
    if (hours > 0)
      return t("workflows.durationHoursMinutes", { hours, minutes });
    return t("workflows.durationMinutes", { minutes });
  };

  const getProgress = () => {
    const instanceData = instance?.instance;
    if (!instanceData?.total_steps) return 0;
    return Math.round(
      (instanceData.completed_steps / instanceData.total_steps) * 100
    );
  };

  const isActionLoading = (action) => {
    switch (action) {
      case "pause":
        return pauseMutation.isLoading;
      case "resume":
        return resumeMutation.isLoading;
      case "cancel":
        return cancelMutation.isLoading;
      case "clone":
        return cloneMutation.isLoading;
      default:
        return false;
    }
  };

  const isAnyActionLoading = () => {
    return (
      pauseMutation.isLoading ||
      resumeMutation.isLoading ||
      cancelMutation.isLoading ||
      cloneMutation.isLoading
    );
  };

  return {
    // Data
    instance: instance?.instance,
    tasks: instance?.tasks || [],

    // Loading states
    isLoading,
    isActionLoading,
    isAnyActionLoading,

    // Error state
    error,

    // Actions
    executeAction,
    canPerformAction,
    refetch,

    // Computed values
    getDuration,
    getProgress,

    // Individual mutations (for advanced usage)
    mutations: {
      pause: pauseMutation,
      resume: resumeMutation,
      cancel: cancelMutation,
      clone: cloneMutation,
    },
  };
};

export default useWorkflowInstance;
