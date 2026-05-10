import { Module, Global } from '@nestjs/common';
import { PusherService } from '@infrastructure/pusher/pusher.service';
import { PusherHealthIndicator } from '@infrastructure/pusher/pusher.health';
import { TerminusModule } from '@nestjs/terminus';

@Global()
@Module({
  imports: [TerminusModule],
  providers: [PusherService, PusherHealthIndicator],
  exports: [PusherService, PusherHealthIndicator],
})
export class PusherModule {}
