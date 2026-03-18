import type { StoreApi } from "zustand";
import { supportService } from "../database";
import { trackPlausible } from "../analytics";
import { sendSystemEvent } from "../system-events-client";
import type { SupportTicket, SupportTicketTag } from "../types";
import type { StoreState } from "./types";

type StoreMutators = Pick<StoreApi<StoreState>, "setState" | "getState">;

export function createSupportActions({ setState, getState }: StoreMutators) {
  const getSupportTickets = async (filters?: {
    status?: string;
    searchQuery?: string;
    tag?: SupportTicketTag;
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
    trackPlausible("support_ticket_submitted", {
      tag: payload.tag ?? "other",
      signedIn: Boolean(currentUser?.id),
      hasContactEmail: Boolean(payload.contactEmail),
    });
    setState((state) => ({
      supportTickets: [created, ...state.supportTickets],
    }));
    return created as SupportTicket;
  };

  const updateSupportTicket = async (
    id: string,
    patch: Partial<SupportTicket>,
  ): Promise<SupportTicket | null> => {
    const updated = await supportService.update(id, patch as any);

    setState((state) => ({
      supportTickets: state.supportTickets.map((t) =>
        t.id === id ? updated : t,
      ),
    }));

    // Log admin action when an admin performs the update
    const currentUser = getState().currentUser;
    trackPlausible("support_ticket_updated", {
      status: patch.status ?? updated?.status,
      hasAssignment: Boolean(patch.assignedTo ?? updated?.assignedTo),
      isAdmin: Boolean(currentUser?.isAdmin),
    });
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
          },
        );
      } catch (e) {
        console.warn("Failed to log admin action for support ticket update", e);
      }
    }

    return updated as SupportTicket;
  };

  const addSupportFollowUp = async (
    ticketId: string,
    message: string,
  ): Promise<SupportTicket | null> => {
    const currentUser = getState().currentUser;
    const updated = await supportService.addFollowUp(
      ticketId,
      message,
      currentUser?.id,
    );
    trackPlausible("support_followup_submitted", {
      isAdmin: Boolean(currentUser?.isAdmin),
      ticketStatus: updated?.status,
      hasContactEmail: Boolean(updated?.contactEmail),
    });

    if (currentUser?.isAdmin && updated?.contactEmail) {
      try {
        await sendSystemEvent({
          type: "support_ticket_followup",
          userId: updated.userId,
          metadata: {
            id: updated.id,
            subject: updated.subject,
            contactEmail: updated.contactEmail,
            messageSnippet: message.slice(0, 1200),
            senderId: currentUser.id,
            senderDisplay:
              currentUser.displayName || currentUser.username || "Admin",
            isAdminReply: true,
          },
        });
      } catch (error) {
        console.warn("Failed to emit support follow-up event", error);
      }
    }

    setState((state) => ({
      supportTickets: state.supportTickets.map((t) =>
        t.id === ticketId ? updated : t,
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
