// src/modules/prisma/prisma.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }

  async ensureUserStatsExist(userId: string) {
    return this.userStats.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        totalWords: 0,
        learnedWords: 0,
        masteredWords: 0,
        totalReviews: 0,
      },
    });
  }
}
