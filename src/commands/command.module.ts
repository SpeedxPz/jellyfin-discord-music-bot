import { DiscordModule } from '@discord-nestjs/core';
import { DynamicModule, Module, Provider } from '@nestjs/common';
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
import { YoutubeClientModule } from 'src/clients/youtube/youtube.module';
import { PlayYoutubeItemCommand } from './playyt/playyt.commands';
import { getEnvironmentVariables } from 'src/utils/environment';

@Module({})
export class CommandModule {
  static register(): DynamicModule {
    let commands: Provider[] = [
      SummonCommand,
      DisconnectCommand,
      NextTrackCommand,
      PreviousTrackCommand,
      PausePlaybackCommand,
      StopPlaybackCommand,
      QueueInteractionCollector,
      QueueCommand,
      GoTrackCommand,
      StatusCommand,
      RemoveTrackCommand,
      HelpCommand,
      PlayingCommand,
    ];
    const jellyfinCommand = [PlayItemCommand, EnqueueRandomItemsCommand];
    const youtubeCommand = [PlayYoutubeItemCommand];

    if (getEnvironmentVariables().JELLYFIN_ENABLED) {
      commands = [...commands, ...jellyfinCommand];
    }

    if (getEnvironmentVariables().YOUTUBE_ENABLED) {
      commands = [...commands, ...youtubeCommand];
    }

    return {
      module: CommandModule,
      imports: [
        DiscordModule.forFeature(),
        PlaybackModule,
        DiscordClientModule,
        PlaybackModule,
        JellyfinClientModule,
        YoutubeClientModule,
      ],
      providers: commands,
      exports: [],
    };
  }
}
