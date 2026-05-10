// src/modules/listening/listening.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ListeningRepository } from '@modules/listening/listening.repository';
import { StartListeningDto } from '@modules/listening/dto/start-listening.dto';
import { SubmitListeningDto } from '@modules/listening/dto/submit-listening.dto';
import { ListeningResultDto } from '@modules/listening/dto/listening-result.dto';
import { PusherService } from '@infrastructure/pusher/pusher.service';
import { LISTENING_EVENTS } from '@common/constants/events.constants';

@Injectable()
export class ListeningService {
  constructor(
    private readonly listeningRepository: ListeningRepository,
    private readonly pusherService: PusherService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async startExercise(userId: string, dto: StartListeningDto) {
    const practice = await this.listeningRepository.createPractice({
      userId,
      globalCardId: dto.globalCardId,
      type: dto.type,
      score: 0,
      duration: 0,
      youtubeId: dto.youtubeUrl ? this.extractYoutubeId(dto.youtubeUrl) : null,
    });

    return practice;
  }

  async submitExercise(
    userId: string,
    exerciseId: string,
    _dto: SubmitListeningDto,
  ): Promise<ListeningResultDto> {
    const practice =
      await this.listeningRepository.findPracticeById(exerciseId);
    if (!practice || practice.userId !== userId) {
      throw new NotFoundException('Listening practice not found');
    }

    // Simulate scoring (in production, use Google STT for actual scoring)
    const score = Math.round(Math.random() * 100);
    const accuracy = Math.round(Math.random() * 100);
    const fluency = Math.round(Math.random() * 100);
    const duration = 30000; // 30 seconds default

    await this.listeningRepository.updatePractice(exerciseId, {
      score,
      accuracy,
      fluency,
      duration,
      result: {
        transcript: _dto.transcriptText || '',
        submittedAt: new Date(),
      },
    });

    // Emit event for statistics
    this.eventEmitter.emit(LISTENING_EVENTS.COMPLETED, {
      userId,
      practiceId: exerciseId,
      globalCardId: practice.globalCardId,
      type: practice.type,
      score,
      accuracy,
      fluency,
      duration,
    });

    // Send realtime notification via Pusher
    await this.pusherService.triggerToUser(userId, 'listening.completed', {
      globalCardId: practice.globalCardId,
      type: practice.type,
      score,
      accuracy,
      fluency,
      duration,
    });

    return new ListeningResultDto({ score, accuracy, fluency, duration });
  }

  async getHistory(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    return this.listeningRepository.findHistoryByUser(userId, skip, limit);
  }

  async getStats(userId: string) {
    return this.listeningRepository.getUserStats(userId);
  }

  private extractYoutubeId(url: string): string | null {
    const match = url.match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    );
    return match ? match[1] : null;
  }
}
