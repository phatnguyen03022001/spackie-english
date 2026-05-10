// src/common/interfaces/job.interface.ts

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface EnrichmentJobData {
  cardId: string;
  front: string;
  normalizedFront: string;
  userId: string;
  deckId: string;
  batchId: string;
}

export interface AiEnrichmentJobData {
  cardId: string;
  front: string;
  userId: string;
  deckId: string;
  batchId?: string;
}

export interface MediaEnrichmentJobData {
  cardId: string;
  front: string;
  normalizedFront: string;
  userId: string;
  deckId: string;
  batchId?: string;
}

export interface FailedTtsJobData {
  cardId: string;
  front: string;
  userId: string;
  deckId: string;
  error: string;
}

export interface JobResult {
  status: JobStatus;
  cardId?: string;
  front?: string;
  error?: string;
  updatedAt?: string;
}

export interface BatchJobResult {
  batchId: string;
  status: 'processing' | 'completed' | 'partial';
  progress: {
    total: number;
    completed: number;
    failed: number;
  };
  items: Array<{
    front: string;
    status: JobStatus;
    cardId: string | null;
    jobId?: string;
    error?: string;
  }>;
}
