import { Api } from '@jellyfin/sdk';
import {
  BaseItemKind,
  GeneralCommandType,
} from '@jellyfin/sdk/lib/generated-client/models';
import { getPlaystateApi } from '@jellyfin/sdk/lib/utils/api/playstate-api';
import { getSessionApi } from '@jellyfin/sdk/lib/utils/api/session-api';

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DiscordPlayEvent } from 'src/models/discord/DiscordPlayEvent';
import { DiscordProgressEvent } from 'src/models/discord/DiscordProgressEvent';
import { GuildJellyfinPlayState } from 'src/models/jellyfin/GuildJellyfinPlayState';
import { JellyfinTrack } from 'src/models/shared/JellyfinTrack';

@Injectable()
export class JellyinPlaystateService {
  private readonly logger = new Logger(JellyinPlaystateService.name);
  private jellyfinSession: { [key: string]: GuildJellyfinPlayState };

  constructor() {
    this.jellyfinSession = {};
  }

  getOrCreateJellyfinSession(guildId: string): GuildJellyfinPlayState {
    if (!(guildId in this.jellyfinSession)) {
      this.jellyfinSession[guildId] = new GuildJellyfinPlayState();
      this.jellyfinSession[guildId].id = guildId;
    }
    return this.jellyfinSession[guildId];
  }

  async initializePlayState(guildId: string, api: Api) {
    const jellyfin = this.getOrCreateJellyfinSession(guildId);
    jellyfin.playstateApi = getPlaystateApi(api);
    jellyfin.sessionApi = getSessionApi(api);
    await this.reportCapabilities(guildId);
    jellyfin.initialized = true;
  }

  async destroy(guildId: string) {
    if (guildId in this.jellyfinSession) {
      delete this.jellyfinSession[guildId];
    }
  }

  private async reportCapabilities(guildId: string) {
    const jellyfin = this.getOrCreateJellyfinSession(guildId);
    await jellyfin.sessionApi.postCapabilities({
      playableMediaTypes: [BaseItemKind[BaseItemKind.Audio]],
      supportsMediaControl: true,
      supportedCommands: [
        GeneralCommandType.Play,
        GeneralCommandType.PlayState,
      ],
    });

    this.logger.debug(
      `[${jellyfin.id}] Reported playback capabilities sucessfully`,
    );
  }

  @OnEvent('discord.audioplayer.event.play.started')
  private async onPlaybackNewTrack(event: DiscordPlayEvent) {
    const jellyfin = this.getOrCreateJellyfinSession(event.guild_id);
    if (!jellyfin.initialized) return;
    if (event.track instanceof JellyfinTrack) {
      this.logger.debug(
        `Reporting playback start on track '${event.track.id}'`,
      );
      jellyfin.track = event.track;
      await jellyfin.playstateApi.reportPlaybackStart({
        playbackStartInfo: {
          ItemId: event.track.id,
          PositionTicks: 0,
        },
      });
    }
  }

  @OnEvent('discord.audioplayer.event.play.stopped')
  private async onPlaybackFinished(guildId: string) {
    const jellyfin = this.getOrCreateJellyfinSession(guildId);
    if (!jellyfin.initialized) return;
    this.logger.debug(
      `Reporting playback finish on track '${jellyfin.track.id}'`,
    );
    await jellyfin.playstateApi.reportPlaybackStopped({
      playbackStopInfo: {
        ItemId: jellyfin.track.id,
        PositionTicks: jellyfin.progress * 10000,
      },
    });
  }

  @OnEvent('discord.audioplayer.event.paused')
  private async onPlaybackPause(guildId: string) {
    const jellyfin = this.getOrCreateJellyfinSession(guildId);
    if (!jellyfin.initialized) return;
    if (!jellyfin.track) {
      this.logger.error(
        'Unable to report changed playstate to Jellyfin because no track was active',
      );
      return;
    }

    await jellyfin.playstateApi.reportPlaybackProgress({
      playbackProgressInfo: {
        IsPaused: true,
        ItemId: jellyfin.track.id,
        PositionTicks: jellyfin.progress * 10000,
      },
    });
  }

  @OnEvent('discord.audioplayer.event.resume')
  private async onPlaybackResume(guildId: string) {
    const jellyfin = this.getOrCreateJellyfinSession(guildId);
    if (!jellyfin.initialized) return;
    if (!jellyfin.track) {
      this.logger.error(
        'Unable to report changed playstate to Jellyfin because no track was active',
      );
      return;
    }

    await jellyfin.playstateApi.reportPlaybackProgress({
      playbackProgressInfo: {
        IsPaused: false,
        ItemId: jellyfin.track.id,
        PositionTicks: jellyfin.progress * 10000,
      },
    });
  }

  @OnEvent('discord.audioplayer.event.play.progress')
  handleOnDiscordAudioProgress(event: DiscordProgressEvent) {
    const jellyfin = this.getOrCreateJellyfinSession(event.guildId);
    if (!jellyfin.initialized) return;
    jellyfin.progress = event.progress;

    jellyfin.playstateApi.reportPlaybackProgress({
      playbackProgressInfo: {
        ItemId: jellyfin.track.id,
        PositionTicks: jellyfin.progress * 10000,
      },
    });
    this.logger.verbose(
      `Reported playback progress ${jellyfin.progress} to Jellyfin for item ${jellyfin.track.id}`,
    );
  }
}
