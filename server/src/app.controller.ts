import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { AppService } from './app.service';
import { Public } from '@/common/decorators/public.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  getHome(@Res() res: Response) {
    const html = this.appService.getHome();
    return res.type('text/html').send(html);
  }
}
