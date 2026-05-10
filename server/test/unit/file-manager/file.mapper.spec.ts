import { FileMapper } from '@modules/file-manager/mappers/file.mapper';
import { FileResponseDto } from '@modules/file-manager/dto/file-response.dto';

describe('FileMapper', () => {
  let mapper: FileMapper;

  beforeEach(() => {
    mapper = new FileMapper();
  });

  it('should map File entity to FileResponseDto', () => {
    const file = {
      id: 'file123',
      url: 'https://storage.com/img.jpg',
      publicId: 'pub123',
      resourceType: 'image',
      mimeType: 'image/jpeg',
      sizeBytes: 1024,
      refType: 'CARD_IMAGE',
      refId: 'card456',
      createdAt: new Date('2025-01-01T00:00:00Z'),
      meta: {},
      userId: 'user123',
    } as any;

    const dto = mapper.toResponseDto(file);

    expect(dto).toBeInstanceOf(FileResponseDto);
    expect(dto.id).toBe('file123');
    expect(dto.url).toBe('https://storage.com/img.jpg');
    expect(dto.publicId).toBe('pub123');
    expect(dto.resourceType).toBe('image');
    expect(dto.mimeType).toBe('image/jpeg');
    expect(dto.sizeBytes).toBe(1024);
    expect(dto.refType).toBe('CARD_IMAGE');
    expect(dto.refId).toBe('card456');
    expect(dto.createdAt).toEqual(file.createdAt);
  });
});
