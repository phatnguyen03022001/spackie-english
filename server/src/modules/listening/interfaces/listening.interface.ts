// src/modules/listening/interfaces/listening.interface.ts

export enum ListeningType {
  REPEAT = 'REPEAT',
  DICTATION = 'DICTATION',
  COMPREHENSION = 'COMPREHENSION',
  YOUTUBE_SYNC = 'YOUTUBE_SYNC',
}

export interface IListeningResult {
  score: number;
  accuracy: number;
  fluency: number;
  duration: number;
  transcript?: string;
  feedback?: string;
}
