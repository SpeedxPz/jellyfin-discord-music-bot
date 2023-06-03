import {
  PlaystateCommand,
  SessionMessageType,
} from '@jellyfin/sdk/lib/generated-client/models';

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron } from '@nestjs/schedule';
import { WebSocket } from 'ws';

import {
  PlayNowCommand,
  SessionApiSendPlaystateCommandRequest,
} from '../../types/websocket';

import { JellyfinSearchService } from './jellyfin.search.service';
import { JellyfinService } from './jellyfin.service';
import { GuildJellyfinWebsocket } from 'src/models/jellyfin/GuildJellyfinWebsocket';
import { PlaybackEnqueueEvent } from 'src/models/playback/PlaybackEnqueueEvent';

@Injectable()
export class JellyfinWebSocketService implements OnModuleDestroy {
  private jellyfinSession: { [key: string]: GuildJellyfinWebsocket };

  private readonly logger = new Logger(JellyfinWebSocketService.name);

  constructor(
    private readonly jellyfinService: JellyfinService,
    private readonly jellyfinSearchService: JellyfinSearchService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.jellyfinSession = {};
  }

  getOrCreateJellyfinSession(guildId: string): GuildJellyfinWebsocket {
    if (!(guildId in this.jellyfinSession)) {
      this.jellyfinSession[guildId] = new GuildJellyfinWebsocket();
      this.jellyfinSession[guildId].id = guildId;
    }
    return this.jellyfinSession[guildId];
  }

  @Cron('*/30 * * * * *')
  private handlePeriodicAliveMessage() {
    for (const [key] of Object.entries(this.jellyfinSession)) {
      const jellyfin = this.jellyfinSession[key];
      if (
        jellyfin.webSocket === undefined ||
        jellyfin.webSocket.readyState !== WebSocket.OPEN
      ) {
        return;
      }

      this.sendMessage(jellyfin.id, 'KeepAlive');
      this.logger.debug('Sent a KeepAlive package to the server');
    }
  }

  initializeAndConnect(guildId: string) {
    const jellyfin = this.getOrCreateJellyfinSession(guildId);
    const deviceId = this.jellyfinService.getJellyfin(guildId).deviceInfo.id;
    const url = this.buildSocketUrl(
      this.jellyfinService.getApi(guildId).basePath,
      this.jellyfinService.getApi(guildId).accessToken,
      deviceId,
    );

    this.logger.debug(`Opening WebSocket with client id ${deviceId}...`);

    jellyfin.webSocket = new WebSocket(url);
    this.bindWebSocketEvents(guildId);
  }

  disconnect(guildId) {
    const jellyfin = this.getOrCreateJellyfinSession(guildId);
    if (!jellyfin.webSocket) {
      this.logger.warn(
        `[${jellyfin.id}] Tried to disconnect but WebSocket was unexpectitly undefined`,
      );
      return;
    }

    this.logger.debug(`[${jellyfin.id}] Closing WebSocket...`);
    jellyfin.webSocket.close();
  }

  sendMessage(guildId: string, type: string, data?: any) {
    const jellyfin = this.getOrCreateJellyfinSession(guildId);
    if (
      !jellyfin.webSocket ||
      jellyfin.webSocket.readyState !== WebSocket.OPEN
    ) {
      throw new Error('Socket not open');
    }

    const obj: Record<string, any> = { MessageType: type };
    if (data) obj.Data = data;

    jellyfin.webSocket.send(JSON.stringify(obj));
  }

  getReadyState(guildId: string) {
    const jellyfin = this.getOrCreateJellyfinSession(guildId);
    return jellyfin.webSocket.readyState;
  }

  protected async messageHandler(guildId: string, data: any) {
    const msg: JellyMessage<unknown> = JSON.parse(data);

    switch (msg.MessageType) {
      case SessionMessageType[SessionMessageType.KeepAlive]:
      case SessionMessageType[SessionMessageType.ForceKeepAlive]:
        this.logger.debug(
          `Received a ${msg.MessageType} package from the server`,
        );
        break;
      case SessionMessageType[SessionMessageType.Play]:
        const data = msg.Data as PlayNowCommand;
        data.hasSelection = PlayNowCommand.prototype.hasSelection;
        data.getSelection = PlayNowCommand.prototype.getSelection;
        const ids = data.getSelection();
        this.logger.log(
          `Processing ${ids.length} ids received via websocket and adding them to the queue`,
        );

        const tracks = await this.jellyfinSearchService.getAllById(ids);
        this.eventEmitter.emit(
          'playback.command.enqueue',
          new PlaybackEnqueueEvent(guildId, tracks),
        );
        break;
      case SessionMessageType[SessionMessageType.Playstate]:
        const sendPlaystateCommandRequest =
          msg.Data as SessionApiSendPlaystateCommandRequest;
        this.handleSendPlaystateCommandRequest(
          guildId,
          sendPlaystateCommandRequest,
        );
        break;
      default:
        this.logger.warn(
          `Received a package from the socket of unknown type: ${msg.MessageType}`,
        );
        break;
    }
  }

  private async handleSendPlaystateCommandRequest(
    guildId: string,
    request: SessionApiSendPlaystateCommandRequest,
  ) {
    switch (request.Command) {
      case PlaystateCommand.PlayPause:
        this.eventEmitter.emit('playback.command.togglePause', guildId);
        break;
      case PlaystateCommand.Pause:
        this.eventEmitter.emit('playback.command.pause', guildId);
        break;
      case PlaystateCommand.Unpause:
        this.eventEmitter.emit('playback.command.unpause', guildId);
        break;
      case PlaystateCommand.Stop:
        this.eventEmitter.emit('playback.command.stop', guildId);
        break;
      case PlaystateCommand.NextTrack:
        this.eventEmitter.emit('playback.command.next', guildId);
        break;
      case PlaystateCommand.PreviousTrack:
        this.eventEmitter.emit('playback.command.previous', guildId);
        break;
      default:
        this.logger.warn(
          `Unable to process incoming playstate command request: ${request.Command}`,
        );
        break;
    }
  }

  private bindWebSocketEvents(guildId: string) {
    const jellyfin = this.getOrCreateJellyfinSession(guildId);
    jellyfin.webSocket.on('message', this.messageHandler.bind(this, guildId));
  }

  private buildSocketUrl(baseName: string, apiToken: string, device: string) {
    const url = new URL(baseName);
    url.pathname = '/socket';
    url.protocol = url.protocol.replace('http', 'ws');
    url.search = `?api_key=${apiToken}&deviceId=${device}`;
    return url;
  }

  onModuleDestroy() {
    for (const [key] of Object.entries(this.jellyfinSession)) {
      this.disconnect(this.jellyfinSession[key].id);
    }
  }
}

export interface JellyMessage<T> {
  MessageType: string;
  MessageId?: string;
  Data: T;
}

interface JellySockEvents {
  connected: (s: JellySock, ws: WebSocket) => any;
  message: (s: JellySock, msg: JellyMessage<any>) => any;
  disconnected: () => any;
}

export declare interface JellySock {
  on<U extends keyof JellySockEvents>(
    event: U,
    listener: JellySockEvents[U],
  ): this;

  once<U extends keyof JellySockEvents>(
    event: U,
    listener: JellySockEvents[U],
  ): this;

  emit<U extends keyof JellySockEvents>(
    event: U,
    ...args: Parameters<JellySockEvents[U]>
  ): boolean;
}
