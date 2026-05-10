// test/factories/file.factory.ts
import { File, FileRefType } from '@prisma/client';
import { randomUUID } from 'crypto';

type PartialFile = Partial<File>;

export class FileFactory {
  static create(overrides: PartialFile = {}): File {
    const now = new Date();
    return {
      id: randomUUID(),
      userId: randomUUID(),
      url: `https://example.com/uploads/${randomUUID()}.jpg`,
      publicId: `uploads/${randomUUID()}`,
      resourceType: 'image',
      mimeType: 'image/jpeg',
      sizeBytes: 1024,
      refType: FileRefType.CARD_IMAGE,
      refId: null,
      meta: {},
      createdAt: now,
      ...overrides,
    } as File;
  }

  static image(overrides: PartialFile = {}): File {
    return FileFactory.create({
      resourceType: 'image',
      mimeType: 'image/jpeg',
      refType: FileRefType.CARD_IMAGE,
      ...overrides,
    });
  }

  static audio(overrides: PartialFile = {}): File {
    return FileFactory.create({
      resourceType: 'video',
      mimeType: 'audio/mpeg',
      refType: FileRefType.CARD_AUDIO,
      ...overrides,
    });
  }

  static withOwner(userId: string, overrides: PartialFile = {}): File {
    return FileFactory.create({ userId, ...overrides });
  }
}
