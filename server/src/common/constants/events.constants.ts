// src/common/constants/events.constants.ts
export const USER_EVENTS = {
  CREATED: 'user.created',
  UPDATED: 'user.updated',
  DELETED: 'user.deleted',
  BANNED: 'user.banned',
  UNBANNED: 'user.unbanned',
} as const;

export const DECK_EVENTS = {
  CREATED: 'deck.created',
  UPDATED: 'deck.updated',
  DELETED: 'deck.deleted',
} as const;

export const CARD_EVENTS = {
  CREATED: 'card.created',
  UPDATED: 'card.updated',
  DELETED: 'card.deleted',
} as const;

export const STUDY_EVENTS = {
  CARD_REVIEWED: 'study.card_reviewed',
  DUE_COUNT_UPDATED: 'study.due_count_updated',
  STREAK_UPDATED: 'study.streak_updated',
} as const;

export const LISTENING_EVENTS = {
  COMPLETED: 'listening.completed',
  STARTED: 'listening.started',
} as const;

export const PAYMENT_EVENTS = {
  SUCCESS: 'payment.success',
  SUBSCRIPTION_ACTIVATED: 'subscription.activated',
  SUBSCRIPTION_EXPIRED: 'subscription.expired',
  SUBSCRIPTION_CANCELLED: 'subscription.cancelled',
} as const;

// Pusher events sent to client
export const PUSHER_EVENTS = {
  CARD_MEANING_READY: 'card.meaning.ready',
  CARD_MEANING_FAILED: 'card.meaning.failed',
  CARD_MEDIA_READY: 'card.media.ready',
  CARD_TTS_FAILED: 'card.tts.failed',
  BATCH_PROGRESS: 'batch.progress',
  // Study events
  STUDY_DUE_COUNT_UPDATED: 'study.due_count_updated',
  STUDY_STREAK_UPDATED: 'study.streak_updated',
  // Listening events
  LISTENING_COMPLETED: 'listening.completed',
  // Payment events
  PAYMENT_SUCCESS: 'payment.success',
  SUBSCRIPTION_WILL_EXPIRE: 'subscription.will_expire',
} as const;
