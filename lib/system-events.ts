export type SystemEventType =
  | "password_changed"
  | "user_banned"
  | "deletion_scheduled"
  | "account_deleted"
  | "support_ticket_created";

export type PasswordChangedEvent = {
  type: "password_changed";
  userId: string;
};

export type UserBannedEvent = {
  type: "user_banned";
  userId: string;
  metadata: {
    bannedUntil: string;
  };
};

export type DeletionScheduledEvent = {
  type: "deletion_scheduled";
  userId: string;
  metadata: {
    deletionDate: string;
  };
};

export type AccountDeletedEvent = {
  type: "account_deleted";
  userId: string;
  metadata?: {
    deletedAt?: string;
  };
};

export type SupportTicketCreatedEvent = {
  type: "support_ticket_created";
  // optional user who submitted (null for anonymous)
  userId?: string;
  metadata?: {
    id?: string;
    subject?: string;
    email?: string;
    messageSnippet?: string;
  };
};

export type SystemEventRequest =
  | PasswordChangedEvent
  | UserBannedEvent
  | DeletionScheduledEvent
  | AccountDeletedEvent
  | SupportTicketCreatedEvent;
