import { Module } from '@nestjs/common';
import { YoutubeSearchService } from './youtube.search.service';

@Module({
  imports: [],
  controllers: [],
  providers: [YoutubeSearchService],
  exports: [YoutubeSearchService],
})
export class YoutubeClientModule {}
