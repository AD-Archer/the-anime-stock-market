import type { StoreApi } from "zustand";
import { appealService } from "../database";
import type { Appeal, AppealStatus } from "../types";
import type { StoreState } from "./types";

type StoreMutators = Pick<StoreApi<StoreState>, "setState" | "getState">;

export function createAppealActions({ setState, getState }: StoreMutators) {
  const submitAppeal = async (message: string): Promise<Appeal | null> => {
    const currentUser = getState().currentUser;
    if (!currentUser) return null;

    const created = await appealService.create({
      userId: currentUser.id,
      message,
    });

    setState((state) => ({ appeals: [created, ...state.appeals] }));
    return created;
  };

  const reviewAppeal = async (
    appealId: string,
    status: AppealStatus,
    notes?: string
  ): Promise<void> => {
    const admin = getState().currentUser;
    if (!admin) return;

    const updated = await appealService.update(appealId, {
      status,
      resolvedAt: new Date(),
      resolvedBy: admin.id,
      resolutionNotes: notes,
    });

    setState((state) => ({
      appeals: state.appeals.map((appeal) =>
        appeal.id === appealId ? updated : appeal
      ),
    }));
  };

  return {
    submitAppeal,
    reviewAppeal,
  };
}
