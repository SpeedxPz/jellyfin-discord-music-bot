import { DiscordModule } from '@discord-nestjs/core';
import { Module } from '@nestjs/common';
import { JellyfinClientModule } from 'src/clients/jellyfin/jellyfin.module';
import { PlaybackModule } from 'src/playback/playback.module';

import { DiscordClientModule } from '../clients/discord/discord.module';
import { DisconnectCommand } from './disconnect/disconnect.command';
import { PlayItemCommand } from './play/play.comands';
import { SummonCommand } from './summon/summon.command';
// import { JellyfinClientModule } from '../clients/jellyfin/jellyfin.module';
// import { PlaybackModule } from '../playback/playback.module';
// import { PlaylistCommand } from './playlist/playlist.command';
// import { DisconnectCommand } from './disconnect.command';
// import { HelpCommand } from './help.command';
// import { PausePlaybackCommand } from './pause.command';
// import { PlayItemCommand } from './play/play.comands';
// import { PreviousTrackCommand } from './previous.command';
// import { SkipTrackCommand } from './next.command';
// import { StatusCommand } from './status.command';
// import { StopPlaybackCommand } from './stop.command';
// import { SummonCommand } from './summon.command';
// import { PlaylistInteractionCollector } from './playlist/playlist.interaction-collector';
// import { EnqueueRandomItemsCommand } from './random/random.command';
// import { VolumeCommand } from './volume/volume.command';

@Module({
  imports: [
    DiscordModule.forFeature(),
    PlaybackModule,
    DiscordClientModule,
    PlaybackModule,
    JellyfinClientModule,
  ],
  controllers: [],
  providers: [
    SummonCommand,
    DisconnectCommand,
    PlayItemCommand,
    // PlaylistInteractionCollector,
    // HelpCommand,
    // StatusCommand,
    // EnqueueRandomItemsCommand,
    // PlaylistCommand,
    // PausePlaybackCommand,
    // SkipTrackCommand,
    // StopPlaybackCommand,
    // PreviousTrackCommand,
    // VolumeCommand,
  ],
  exports: [],
})
export class CommandModule {}
