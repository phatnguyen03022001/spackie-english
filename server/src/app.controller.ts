import { Controller, Get, Res } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import type { Response } from 'express';
import { AppService } from '@/app.service';
import { Public } from '@common/decorators/public.decorator';

@ApiTags('App')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Home page' })
  getHome(@Res() res: Response) {
    const html = this.appService.getHome();
    return res.type('text/html').send(html);
  }
}
