export type SystemEventType =
  | "password_changed"
  | "user_banned"
  | "deletion_scheduled"
  | "account_deleted";

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

export type SystemEventRequest =
  | PasswordChangedEvent
  | UserBannedEvent
  | DeletionScheduledEvent
  | AccountDeletedEvent;
