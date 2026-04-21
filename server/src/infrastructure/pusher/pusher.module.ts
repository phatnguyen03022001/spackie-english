import { Module, Global } from '@nestjs/common';
import { PusherService } from './pusher.service';
import { PusherHealthIndicator } from './pusher.health';
import { TerminusModule } from '@nestjs/terminus';

@Global()
@Module({
  imports: [TerminusModule],
  providers: [PusherService, PusherHealthIndicator],
  exports: [PusherService, PusherHealthIndicator],
})
export class PusherModule {}
