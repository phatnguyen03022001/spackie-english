// src/modules/file-manager/file-manager.controller.ts

import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipeBuilder,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { FileManagerService } from '@modules/file-manager/file-manager.service';
import { UploadFileUseCase } from '@modules/file-manager/use-cases/upload-file.use-case';
import { DeleteFileUseCase } from '@modules/file-manager/use-cases/delete-file.use-case';
import { UploadFileDto } from '@modules/file-manager/dto/upload-file.dto';
import { FileResponseDto } from '@modules/file-manager/dto/file-response.dto';
import { FileOwnershipGuard } from '@modules/file-manager/guards/file-ownership.guard';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { RequestUser } from '@common/interfaces/request-user.interface';
import { SuccessResponseDto } from '@common/dto/success-response.dto';

@ApiTags('File Manager')
@ApiBearerAuth()
@Controller('files')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FileManagerController {
  constructor(
    private readonly fileManagerService: FileManagerService,
    private readonly uploadFileUseCase: UploadFileUseCase,
    private readonly deleteFileUseCase: DeleteFileUseCase,
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Upload a file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File to upload (image or audio)',
        },
        refType: {
          type: 'string',
          enum: ['AVATAR', 'CARD_IMAGE', 'CARD_AUDIO', 'DECK_COVER'],
          description: 'Reference type',
        },
        refId: {
          type: 'string',
          description: 'Reference entity ID',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'File uploaded',
    type: SuccessResponseDto<FileResponseDto>,
  })
  @ApiResponse({
    status: 422,
    description: 'UNPROCESSABLE_ENTITY - invalid file type or size',
  })
  async upload(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addMaxSizeValidator({ maxSize: 10 * 1024 * 1024 })
        .build({ errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY }),
    )
    file: Express.Multer.File,
    @Body() body: UploadFileDto,
    @CurrentUser() user: RequestUser,
  ): Promise<SuccessResponseDto<FileResponseDto>> {
    const result = await this.uploadFileUseCase.execute(
      user.id,
      file,
      body.refType,
      body.refId,
    );
    return new SuccessResponseDto(result, 'File uploaded successfully');
  }

  @Delete(':fileId')
  @UseGuards(FileOwnershipGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a file' })
  @ApiParam({ name: 'fileId', description: 'File ID' })
  @ApiResponse({ status: 200, description: 'File deleted' })
  @ApiResponse({ status: 404, description: 'FILE_NOT_FOUND' })
  async delete(
    @Param('fileId') fileId: string,
    @CurrentUser() user: RequestUser,
  ): Promise<SuccessResponseDto<null>> {
    await this.deleteFileUseCase.execute(fileId, user.id);
    return new SuccessResponseDto(null, 'File deleted successfully');
  }

  @Get(':fileId')
  @UseGuards(FileOwnershipGuard)
  @ApiOperation({ summary: 'Get file metadata' })
  @ApiParam({ name: 'fileId', description: 'File ID' })
  @ApiResponse({
    status: 200,
    description: 'File metadata',
    type: SuccessResponseDto<FileResponseDto>,
  })
  @ApiResponse({ status: 404, description: 'FILE_NOT_FOUND' })
  async findOne(
    @Param('fileId') fileId: string,
  ): Promise<SuccessResponseDto<FileResponseDto>> {
    const file = await this.fileManagerService.findById(fileId);
    return new SuccessResponseDto(file);
  }

  @Get(':fileId/signed-url')
  @UseGuards(FileOwnershipGuard)
  @ApiOperation({ summary: 'Get signed URL for private file' })
  @ApiParam({ name: 'fileId', description: 'File ID' })
  @ApiResponse({ status: 200, description: 'Signed URL generated' })
  @ApiResponse({ status: 404, description: 'FILE_NOT_FOUND' })
  async getSignedUrl(
    @Param('fileId') fileId: string,
    @CurrentUser() user: RequestUser,
  ): Promise<SuccessResponseDto<{ url: string }>> {
    const url = await this.fileManagerService.getSignedUrl(fileId, user.id);
    return new SuccessResponseDto({ url });
  }
}
