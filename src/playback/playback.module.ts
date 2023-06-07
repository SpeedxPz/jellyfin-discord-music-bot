import { Module, OnModuleInit } from '@nestjs/common';
import { JellyfinClientModule } from 'src/clients/jellyfin/jellyfin.module';
import { PlaybackService } from './playback.service';
import * as fs from 'fs';
import { YoutubeClientModule } from 'src/clients/youtube/youtube.module';
import { getEnvironmentVariables } from 'src/utils/environment';

@Module({
  imports: [JellyfinClientModule, YoutubeClientModule],
  controllers: [],
  providers: [PlaybackService],
  exports: [PlaybackService],
})
export class PlaybackModule implements OnModuleInit {
  onModuleInit() {
    if (!fs.existsSync(getEnvironmentVariables().CACHE_PATH)) {
      fs.mkdirSync(getEnvironmentVariables().CACHE_PATH);
    }
  }
}
