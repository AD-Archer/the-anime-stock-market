import type { Notification } from "./types";

export type SystemEventType =
  | "password_changed"
  | "user_banned"
  | "deletion_scheduled"
  | "account_deleted"
  | "support_ticket_created"
  | "premium_status_changed"
  | "notification_email"
  | "market_drift_completed";

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

export type PremiumStatusChangedEvent = {
  type: "premium_status_changed";
  userId: string;
  metadata?: {
    enabled: boolean;
    performedBy?: string;
  };
};

export type NotificationEmailEvent = {
  type: "notification_email";
  userId: string;
  metadata: {
    notificationId: string;
    type: Notification["type"];
    title: string;
    message: string;
  };
};

export type MarketDriftCompletedEvent = {
  type: "market_drift_completed";
  userId?: string; // Optional - system-wide event
  metadata: {
    stocksProcessed: number;
    totalStocks: number;
    duration: number;
    timestamp: string;
  };
};

export type SystemEventRequest =
  | PasswordChangedEvent
  | UserBannedEvent
  | DeletionScheduledEvent
  | AccountDeletedEvent
  | SupportTicketCreatedEvent
  | PremiumStatusChangedEvent
  | NotificationEmailEvent
  | MarketDriftCompletedEvent;
