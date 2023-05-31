import { Module } from '@nestjs/common';
import { JellyfinClientModule } from 'src/clients/jellyfin/jellyfin.module';
import { PlaybackService } from './playback.service';

@Module({
  imports: [JellyfinClientModule],
  controllers: [],
  providers: [PlaybackService],
  exports: [PlaybackService],
})
export class PlaybackModule {}
