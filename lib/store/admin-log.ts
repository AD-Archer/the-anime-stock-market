import type { StoreApi } from "zustand";
import { adminActionLogService } from "../database";
import type { AdminActionLog, AdminActionType } from "../types";
import type { StoreState } from "./types";

type StoreMutators = Pick<StoreApi<StoreState>, "setState" | "getState">;

export function createAdminLogActions({ setState, getState }: StoreMutators) {
  const logAdminAction = async (
    action: AdminActionType,
    targetUserId: string,
    metadata?: Record<string, unknown>
  ): Promise<void> => {
    const admin = getState().currentUser;
    if (!admin) return;

    const entry = await adminActionLogService.create({
      action,
      performedBy: admin.id,
      targetUserId,
      metadata,
    });

    setState((state) => ({ adminActionLogs: [entry, ...state.adminActionLogs] }));
  };

  return {
    logAdminAction,
  };
}
