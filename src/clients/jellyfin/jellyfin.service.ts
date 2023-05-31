import { Injectable, Logger } from '@nestjs/common';

import { Api, Jellyfin } from '@jellyfin/sdk';
import { SystemApi } from '@jellyfin/sdk/lib/generated-client/api/system-api';
import { getSystemApi } from '@jellyfin/sdk/lib/utils/api/system-api';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Constants } from '../../utils/constants';
// import { JellyinPlaystateService } from './jellyfin.playstate.service';
import { GuildJellyfin } from 'src/models/jellyfin/GuildJellyfin';
import { Guild } from 'discord.js';
import { GuildVoice } from 'src/models/discord/GuildVoice';
import { getEnvironmentVariables } from 'src/utils/environment';

@Injectable()
export class JellyfinService {
  private readonly logger = new Logger(JellyfinService.name);
  private jellyfinSession: { [key: string]: GuildJellyfin };

  constructor(
    private eventEmitter: EventEmitter2, // private readonly jellyfinPlayState: JellyinPlaystateService,
  ) {
    this.jellyfinSession = {};
  }

  getOrCreateJellyfinSession(guild_id: string): GuildJellyfin {
    if (!(guild_id in this.jellyfinSession)) {
      this.jellyfinSession[guild_id] = new GuildJellyfin();
      this.jellyfinSession[guild_id].id = guild_id;
    }
    return this.jellyfinSession[guild_id];
  }

  async init(guild_id: string, client_name: string = 'Jellyfin Discord Bot') {
    const jellyfin = this.getOrCreateJellyfinSession(guild_id);
    jellyfin.jellyfin = new Jellyfin({
      clientInfo: {
        name: Constants.Metadata.ApplicationName,
        version: Constants.Metadata.Version.All(),
      },
      deviceInfo: {
        id: `jellyfin-discord-bot-${guild_id}`,
        name: client_name,
      },
    });
    jellyfin.api = jellyfin.jellyfin.createApi(
      getEnvironmentVariables().JELLYFIN_SERVER_ADDRESS,
    );
    this.logger.debug(`[${guild_id}] Created Jellyfin Client and Api`);
    await this.authenticate(guild_id);
  }

  async authenticate(guild_id: string) {
    const jellyfin = this.getOrCreateJellyfinSession(guild_id);
    try {
      const response = await jellyfin.api.authenticateUserByName(
        getEnvironmentVariables().JELLYFIN_AUTHENTICATION_USERNAME ?? '',
        getEnvironmentVariables().JELLYFIN_AUTHENTICATION_PASSWORD,
      );
      if (response.data.SessionInfo?.UserId === undefined) {
        this.logger.error(
          `[${guild_id}] Failed to authenticate with response code ${response.status}: '${response.data}'`,
        );
        return;
      }
      this.logger.debug(
        `[${guild_id}] Connected using user '${response.data.SessionInfo.UserId}'`,
      );
      jellyfin.userId = response.data.SessionInfo.UserId;
      jellyfin.systemApi = getSystemApi(jellyfin.api);
      jellyfin.connected = true;
      // await this.jellyfinPlayState.initializePlayState(jellyfin.api);
    } catch (e) {
      this.logger.error(test);
      jellyfin.connected = false;
    }
  }

  disconnect(guild_id: string) {
    const jellyfin = this.getOrCreateJellyfinSession(guild_id);
    if (!jellyfin.api) {
      this.logger.warn(
        `[${guild_id}] Jellyfin Api Client was unexpectedly undefined. Graceful destroy has failed`,
      );
      return;
    }
    jellyfin.api.logout();
    jellyfin.connected = false;
  }

  disconnectGracefully() {
    for (const [key, value] of Object.entries(this.jellyfinSession)) {
      const jellyfin = this.jellyfinSession[key];
      if (jellyfin.api) {
        jellyfin.api.logout();
        jellyfin.connected = false;
      }
    }
  }

  getApi(guild_id: string) {
    return this.getOrCreateJellyfinSession(guild_id).api;
  }

  getJellyfin(guild_id: string) {
    return this.getOrCreateJellyfinSession(guild_id).jellyfin;
  }

  getSystemApi(guild_id: string) {
    return this.getOrCreateJellyfinSession(guild_id).systemApi;
  }

  getUserId(guild_id: string) {
    return this.getOrCreateJellyfinSession(guild_id).userId;
  }

  isConnected(guild_id: string) {
    return this.getOrCreateJellyfinSession(guild_id).connected;
  }
}
