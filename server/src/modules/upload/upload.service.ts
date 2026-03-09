import {
  Injectable,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import * as streamifier from 'streamifier';

@Injectable()
export class UploadService {
  constructor(private configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  async uploadFile(
    file: Express.Multer.File,
    folder = 'general',
  ): Promise<string> {
    if (!file) throw new BadRequestException('Invalid file');

    return new Promise((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'auto' },
        (error: Error | undefined, result?: UploadApiResponse) => {
          if (error || !result) {
            return reject(new InternalServerErrorException('Upload failed'));
          }

          resolve(result.secure_url);
        },
      );

      streamifier.createReadStream(file.buffer).pipe(upload);
    });
  }
}
