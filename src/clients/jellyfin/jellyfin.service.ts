import { Injectable, Logger } from '@nestjs/common';

import { Jellyfin } from '@jellyfin/sdk';
import { getSystemApi } from '@jellyfin/sdk/lib/utils/api/system-api';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Constants } from '../../utils/constants';
import { GuildJellyfin } from 'src/models/jellyfin/GuildJellyfin';
import { getEnvironmentVariables } from 'src/utils/environment';
import { JellyinPlaystateService } from './jellyfin.playstate.service';

@Injectable()
export class JellyfinService {
  private readonly logger = new Logger(JellyfinService.name);
  private jellyfinSession: { [key: string]: GuildJellyfin };
  private instanceId: number;

  constructor(
    private eventEmitter: EventEmitter2,
    private readonly jellyfinPlayState: JellyinPlaystateService,
  ) {
    this.instanceId = Math.random() * (100000 - 1) + 1;
    this.jellyfinSession = {};
  }

  getOrCreateJellyfinSession(guildId: string): GuildJellyfin {
    if (!(guildId in this.jellyfinSession)) {
      this.jellyfinSession[guildId] = new GuildJellyfin();
      this.jellyfinSession[guildId].id = guildId;
    }
    return this.jellyfinSession[guildId];
  }

  async init(guildId: string, client_name = 'Jellyfin Discord Bot') {
    const jellyfin = this.getOrCreateJellyfinSession(guildId);
    jellyfin.jellyfin = new Jellyfin({
      clientInfo: {
        name: Constants.Metadata.ApplicationName,
        version: Constants.Metadata.Version.All(),
      },
      deviceInfo: {
        id: `jellyfin-discord-bot-${this.instanceId}-${guildId}`,
        name: client_name,
      },
    });
    jellyfin.api = jellyfin.jellyfin.createApi(
      getEnvironmentVariables().JELLYFIN_SERVER_ADDRESS,
    );
    this.logger.debug(`[${guildId}] Created Jellyfin Client and Api`);
    await this.authenticate(guildId);
  }

  async authenticate(guildId: string) {
    const jellyfin = this.getOrCreateJellyfinSession(guildId);
    try {
      const response = await jellyfin.api.authenticateUserByName(
        getEnvironmentVariables().JELLYFIN_AUTHENTICATION_USERNAME ?? '',
        getEnvironmentVariables().JELLYFIN_AUTHENTICATION_PASSWORD,
      );
      if (response.data.SessionInfo?.UserId === undefined) {
        this.logger.error(
          `[${guildId}] Failed to authenticate with response code ${response.status}: '${response.data}'`,
        );
        return;
      }
      this.logger.debug(
        `[${guildId}] Connected using user '${response.data.SessionInfo.UserId}'`,
      );
      jellyfin.userId = response.data.SessionInfo.UserId;
      jellyfin.systemApi = getSystemApi(jellyfin.api);
      jellyfin.connected = true;
      await this.jellyfinPlayState.initializePlayState(guildId, jellyfin.api);
    } catch (e) {
      this.logger.error(e);
      jellyfin.connected = false;
    }
  }

  disconnect(guildId: string) {
    const jellyfin = this.getOrCreateJellyfinSession(guildId);
    if (!jellyfin.api) {
      this.logger.warn(
        `[${guildId}] Jellyfin Api Client was unexpectedly undefined. Graceful destroy has failed`,
      );
      return;
    }
    jellyfin.api.logout();
    jellyfin.connected = false;
    this.jellyfinPlayState.destroy(guildId);
  }

  disconnectGracefully() {
    for (const [key] of Object.entries(this.jellyfinSession)) {
      const jellyfin = this.jellyfinSession[key];
      if (jellyfin.api) {
        jellyfin.api.logout();
        jellyfin.connected = false;
      }
    }
  }

  getApi(guildId: string) {
    return this.getOrCreateJellyfinSession(guildId).api;
  }

  getJellyfin(guildId: string) {
    return this.getOrCreateJellyfinSession(guildId).jellyfin;
  }

  getSystemApi(guildId: string) {
    return this.getOrCreateJellyfinSession(guildId).systemApi;
  }

  getUserId(guildId: string) {
    return this.getOrCreateJellyfinSession(guildId).userId;
  }

  isConnected(guildId: string) {
    return this.getOrCreateJellyfinSession(guildId).connected;
  }
}
