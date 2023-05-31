import { Module, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { JellyinPlaystateService } from './jellyfin.playstate.service';
import { JellyfinSearchService } from './jellyfin.search.service';
import { JellyfinService } from './jellyfin.service';
import { JellyfinStreamBuilderService } from './jellyfin.stream.builder.service';

@Module({
  imports: [],
  controllers: [],
  providers: [
    JellyfinService,
    JellyfinSearchService,
    JellyfinStreamBuilderService,
    JellyinPlaystateService,
    // JellyfinWebSocketService,
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
