import { DiscordModule } from '@discord-nestjs/core';
import { Module } from '@nestjs/common';
import { JellyfinClientModule } from 'src/clients/jellyfin/jellyfin.module';
import { PlaybackModule } from 'src/playback/playback.module';
import { DiscordClientModule } from '../clients/discord/discord.module';
import { DisconnectCommand } from './disconnect/disconnect.command';
import { GoTrackCommand } from './go/go.command';
import { NextTrackCommand } from './next/next.command';
import { PausePlaybackCommand } from './pause/pause.command';
import { PlayItemCommand } from './play/play.comands';
import { PreviousTrackCommand } from './previous/previous.command';
import { QueueCommand } from './queue/queue.command';
import { QueueInteractionCollector } from './queue/queue.interaction-collector';
import { EnqueueRandomItemsCommand } from './random/random.command';
import { StatusCommand } from './status/status.command';
import { StopPlaybackCommand } from './stop/stop.command';
import { SummonCommand } from './summon/summon.command';
import { RemoveTrackCommand } from './remove/remove.command';
import { HelpCommand } from './help/help.command';
import { PlayingCommand } from './playing/playing.command';

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
    NextTrackCommand,
    PreviousTrackCommand,
    PausePlaybackCommand,
    StopPlaybackCommand,
    QueueInteractionCollector,
    QueueCommand,
    GoTrackCommand,
    EnqueueRandomItemsCommand,
    StatusCommand,
    RemoveTrackCommand,
    HelpCommand,
    PlayingCommand,
  ],
  exports: [],
})
export class CommandModule {}
