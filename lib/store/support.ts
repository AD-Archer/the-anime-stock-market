import type { StoreApi } from "zustand";
import { supportService } from "../database";
import type { SupportTicket } from "../types";
import type { StoreState } from "./types";

type StoreMutators = Pick<StoreApi<StoreState>, "setState" | "getState">;

export function createSupportActions({ setState, getState }: StoreMutators) {
  const getSupportTickets = async (filters?: {
    status?: string;
    searchQuery?: string;
  }): Promise<SupportTicket[]> => {
    const tickets = await supportService.list(filters);
    setState((state) => ({ supportTickets: tickets }));
    return tickets as SupportTicket[];
  };

  const submitSupportTicket = async (input: {
    subject: string;
    message: string;
    contactEmail?: string;
    tag?: import("../types").SupportTicketTag;
    referenceId?: string;
  }): Promise<SupportTicket | null> => {
    const currentUser = getState().currentUser;
    const payload: Omit<SupportTicket, "id" | "createdAt" | "updatedAt"> = {
      userId: currentUser?.id,
      contactEmail: input.contactEmail ?? currentUser?.email,
      subject: input.subject,
      message: input.message,
      messages: [],
      status: "open",
      tag: input.tag ?? "other",
      referenceId: input.referenceId,
      assignedTo: undefined,
    };

    const created = await supportService.create(payload as any);
    setState((state) => ({
      supportTickets: [created, ...state.supportTickets],
    }));
    return created as SupportTicket;
  };

  const updateSupportTicket = async (
    id: string,
    patch: Partial<SupportTicket>
  ): Promise<SupportTicket | null> => {
    const updated = await supportService.update(id, patch as any);

    setState((state) => ({
      supportTickets: state.supportTickets.map((t) =>
        t.id === id ? updated : t
      ),
    }));

    // Log admin action when an admin performs the update
    const currentUser = getState().currentUser;
    if (currentUser?.isAdmin && updated) {
      try {
        // metadata: include ticket id, new status, assignedTo and snippet of latest message
        const latestMessage =
          updated.messages && updated.messages.length > 0
            ? updated.messages[updated.messages.length - 1].text.slice(0, 200)
            : updated.message.slice(0, 200);
        await getState().logAdminAction(
          "support_update",
          updated.userId ?? "anonymous",
          {
            ticketId: updated.id,
            status: updated.status,
            assignedTo: updated.assignedTo,
            latestMessage,
          }
        );
      } catch (e) {
        console.warn("Failed to log admin action for support ticket update", e);
      }
    }

    return updated as SupportTicket;
  };

  const addSupportFollowUp = async (
    ticketId: string,
    message: string
  ): Promise<SupportTicket | null> => {
    const currentUser = getState().currentUser;
    const updated = await supportService.addFollowUp(
      ticketId,
      message,
      currentUser?.id
    );
    setState((state) => ({
      supportTickets: state.supportTickets.map((t) =>
        t.id === ticketId ? updated : t
      ),
    }));
    return updated as SupportTicket;
  };

  return {
    getSupportTickets,
    submitSupportTicket,
    updateSupportTicket,
    addSupportFollowUp,
  };
}
