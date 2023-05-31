import { Module, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { JellyfinSearchService } from './jellyfin.search.service';
import { JellyfinService } from './jellyfin.service';
import { JellyfinStreamBuilderService } from './jellyfin.stream.builder.service';
// import { JellyfinSearchService } from './jellyfin.search.service';
// import { JellyfinService } from './jellyfin.service';
// import { JellyfinStreamBuilderService } from './jellyfin.stream.builder.service';
// import { JellyinPlaystateService } from './jellyfin.playstate.service';
// import { JellyfinWebSocketService } from './jellyfin.websocket.service';
// import { PlaybackModule } from './../../playback/playback.module';

@Module({
  imports: [
    // PlaybackModule
  ],
  controllers: [],
  providers: [
    JellyfinService,
    JellyfinSearchService,
    JellyfinStreamBuilderService,
    // JellyinPlaystateService,
    // JellyfinWebSocketService,
    // JellyfinSearchService,
  ],
  exports: [
    JellyfinService,
    JellyfinSearchService,
    JellyfinStreamBuilderService,
    // JellyfinWebSocketService,
  ],
})
export class JellyfinClientModule implements OnModuleInit, OnModuleDestroy {
  constructor(private jellyfinService: JellyfinService) {}

  onModuleDestroy() {
    this.jellyfinService.disconnectGracefully();
  }

  onModuleInit() {
    this.jellyfinService.init('0', 'Main');
  }
}
