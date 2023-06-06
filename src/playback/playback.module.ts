import { Module, OnModuleInit } from '@nestjs/common';
import { JellyfinClientModule } from 'src/clients/jellyfin/jellyfin.module';
import { PlaybackService } from './playback.service';
import * as fs from 'fs';

@Module({
  imports: [JellyfinClientModule],
  controllers: [],
  providers: [PlaybackService],
  exports: [PlaybackService],
})
export class PlaybackModule implements OnModuleInit {
  onModuleInit() {
    if (!fs.existsSync('./cache')) {
      fs.mkdirSync('./cache');
    }
  }
}
