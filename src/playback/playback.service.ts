import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { JellyfinService } from 'src/clients/jellyfin/jellyfin.service';
import { JellyfinStreamBuilderService } from 'src/clients/jellyfin/jellyfin.stream.builder.service';
import { DiscordPlayEvent } from 'src/models/discord/DiscordPlayEvent';
import { DiscordProgressEvent } from 'src/models/discord/DiscordProgressEvent';
import { GuildPlayBack } from 'src/models/playback/GuildPlayBack';
import { JellyfinTrack } from 'src/models/shared/JellyfinTrack';
import { Track } from 'src/models/shared/Track';
import { NoAudioIsPlaying } from './exception/no-audio-is-playing';
import { NoNextTrackToPlay } from './exception/no-next-track-to-play.exception';
import { NoPreviousTrackToPlay } from './exception/no-prev-track-to-play.exception';
import { JellyfinWebSocketService } from 'src/clients/jellyfin/jellyfin.websocket.service';
import { PlaybackEnqueueEvent } from 'src/models/playback/PlaybackEnqueueEvent';
import {
  YoutubeTrack,
  YoutubeTrackState,
} from 'src/models/shared/YoutubeTrack';
import { getEnvironmentVariables } from 'src/utils/environment';
import { YoutubeSearchService } from 'src/clients/youtube/youtube.search.service';

@Injectable()
export class PlaybackService {
  private readonly logger = new Logger(PlaybackService.name);
  private instances: { [key: string]: GuildPlayBack };

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly jellyfinService: JellyfinService,
    private readonly jellyfinStreamBuilder: JellyfinStreamBuilderService,
    private readonly jellyfinWebsocketService: JellyfinWebSocketService,
    private readonly youtubeSearchService: YoutubeSearchService,
  ) {
    this.instances = {};
  }

  getOrCreatePlaybackInstance(guildId: string): GuildPlayBack {
    if (!(guildId in this.instances)) {
      this.instances[guildId] = new GuildPlayBack(guildId);
    }
    return this.instances[guildId];
  }

  async init(guildId: string, guildName: string) {
    if (getEnvironmentVariables().JELLYFIN_ENABLED) {
      await this.jellyfinService.init(guildId, guildName);
      await this.jellyfinWebsocketService.initializeAndConnect(guildId);
    }
  }

  async disconnect(guildId: string) {
    const instance = this.getOrCreatePlaybackInstance(guildId);
    instance.playing = false;
    instance.pause = false;
    instance.queue.clear();
    if (getEnvironmentVariables().JELLYFIN_ENABLED) {
      await this.jellyfinService.disconnect(guildId);
      await this.jellyfinWebsocketService.disconnect(guildId);
    }
  }

  async sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  enqueue(guildId: string, tracks: Track[]): number {
    const instance = this.getOrCreatePlaybackInstance(guildId);
    const length = instance.queue.enqueueTracks(tracks);

    if (instance.playing === false && instance.pause === false) {
      this.playNext(guildId);
    }
    return length;
  }

  enqueueNext(guildId: string, tracks: Track[]): void {
    const instance = this.getOrCreatePlaybackInstance(guildId);
    instance.queue.enqueueNext(tracks);

    if (instance.playing === false && instance.pause === false) {
      this.playNext(guildId);
    }
  }

  removeTrack(guildId: string, trackNo: number): boolean {
    const instance = this.getOrCreatePlaybackInstance(guildId);
    return instance.queue.removeTrack(trackNo);
  }

  togglePause(guildId: string): boolean {
    const instance = this.getOrCreatePlaybackInstance(guildId);
    if (!instance.playing) {
      throw new NoAudioIsPlaying();
    }

    if (instance.pause) {
      this.unpause(guildId);
      return false;
    } else {
      this.pause(guildId);
      return true;
    }
  }

  isPlaying(guildId: string) {
    const instance = this.getOrCreatePlaybackInstance(guildId);
    return instance.playing;
  }

  unpause(guildId: string) {
    const instance = this.getOrCreatePlaybackInstance(guildId);
    if (!instance.playing) {
      throw new NoAudioIsPlaying();
    }
    this.eventEmitter.emit('discord.audioplayer.unpause', guildId);
    instance.pause = false;
  }

  pause(guildId: string) {
    const instance = this.getOrCreatePlaybackInstance(guildId);
    if (!instance.playing) {
      throw new NoAudioIsPlaying();
    }
    this.eventEmitter.emit('discord.audioplayer.pause', guildId);
    instance.pause = true;
  }

  previous(guildId: string) {
    const instance = this.getOrCreatePlaybackInstance(guildId);
    if (!instance.queue.setPreviousTrackAsActiveTrack()) {
      throw new NoPreviousTrackToPlay();
    }

    const track = instance.queue.getActiveTrack();
    if (!track) {
      throw new NoPreviousTrackToPlay();
    }

    this.startTrack(guildId, track);
  }

  private async startTrack(guildId: string, track: Track): Promise<void> {
    const instance = this.getOrCreatePlaybackInstance(guildId);

    if (track instanceof YoutubeTrack) {
      if (track.state === YoutubeTrackState.None) {
        this.logger.debug(`[${guildId}] Start downloading ${track.name}...`);
        try {
          await this.youtubeSearchService.downloadTrack(track);
        } catch {
          this.logger.debug(`[${guildId}] ${track.name} cannot be played.`);
          this.eventEmitter.emit('playback.command.next', guildId);
        }
      } else if (track.state === YoutubeTrackState.Downloading) {
        this.logger.debug(
          `[${guildId}] Waiting track ${track.name} to be ready...`,
        );
        setTimeout(() => {
          this.startTrack(guildId, track);
        }, 1000);
        return;
      } else if (track.state === YoutubeTrackState.Error) {
        this.logger.debug(`[${guildId}] ${track.name} cannot be played.`);
        this.eventEmitter.emit('playback.command.next', guildId);
        return;
      }
    }

    this.logger.debug(`[${guildId}] start playing ${track.name}`);
    const streamURL = this.createStreamURL(guildId, track);

    instance.playing = true;
    instance.pause = false;

    this.eventEmitter.emit(
      'discord.audioplayer.play',
      new DiscordPlayEvent(guildId, track, streamURL),
    );
  }

  private createStreamURL(guildId: string, track: Track): string {
    if (track instanceof JellyfinTrack) {
      return this.jellyfinStreamBuilder.buildStreamUrl(
        guildId,
        track.id,
        160000,
      );
    } else if (track instanceof YoutubeTrack) {
      return `${getEnvironmentVariables().CACHE_PATH}/yt_${track.id}.mp3`;
    } else {
      return '';
    }
  }

  next(guildId: string) {
    const instance = this.getOrCreatePlaybackInstance(guildId);
    if (!instance.queue.setNextTrackAsActiveTrack()) {
      this.logger.debug('set next track failed');
      throw new NoNextTrackToPlay();
    }

    const track = instance.queue.getActiveTrack();
    if (!track) {
      this.logger.debug('no active track');
      throw new NoNextTrackToPlay();
    }

    this.startTrack(guildId, track);
  }

  goto(guildId: string, trackNo: number) {
    const instance = this.getOrCreatePlaybackInstance(guildId);
    if (!instance.queue.setTrackNoAsActiveTrack(trackNo)) {
      this.logger.debug('set track no failed');
      throw new NoNextTrackToPlay();
    }
    const track = instance.queue.getActiveTrack();
    if (!track) {
      this.logger.debug('no active track');
      throw new NoNextTrackToPlay();
    }

    this.startTrack(guildId, track);
  }

  private playNext(guildId: string) {
    const instance = this.getOrCreatePlaybackInstance(guildId);
    try {
      this.next(guildId);
    } catch (e) {
      instance.playing = false;
      instance.pause = false;
    }
  }

  stop(guildId: string) {
    const instance = this.getOrCreatePlaybackInstance(guildId);
    instance.playing = false;
    instance.pause = false;
    instance.queue.clear();
    this.eventEmitter.emit('discord.audioplayer.stop', guildId);
  }

  getQueueLength(guildId: string): number {
    const instance = this.getOrCreatePlaybackInstance(guildId);
    return instance.queue.getLength();
  }

  @OnEvent('playback.command.enqueue')
  handleOnPlaybackEnqueue(event: PlaybackEnqueueEvent) {
    this.enqueue(event.guild_id, event.tracks);
  }

  @OnEvent('playback.command.togglePause')
  handleOnPlaybackTogglePause(guildId: string) {
    try {
      this.togglePause(guildId);
    } catch {}
  }

  @OnEvent('playback.command.pause')
  handleOnPlaybackPause(guildId: string) {
    try {
      this.pause(guildId);
    } catch {}
  }

  @OnEvent('playback.command.stop')
  handleOnPlaybackStop(guildId: string) {
    try {
      this.stop(guildId);
    } catch {}
  }

  @OnEvent('playback.command.next')
  handleOnPlaybackNext(guildId: string) {
    try {
      this.next(guildId);
    } catch {}
  }

  @OnEvent('playback.command.previous')
  handleOnPlaybackPrevious(guildId: string) {
    try {
      this.previous(guildId);
    } catch {}
  }

  @OnEvent('playback.command.unpause')
  handleOnPlaybackUnPause(guildId: string) {
    try {
      this.unpause(guildId);
    } catch {}
  }

  @OnEvent('discord.audioplayer.event.play.stopped')
  handleOnDiscordAudioStopped(guildId: string) {
    const instance = this.getOrCreatePlaybackInstance(guildId);
    if (instance.playing === true && instance.pause === false) {
      this.playNext(guildId);
    }
  }

  @OnEvent('discord.audioplayer.event.play.progress')
  handleOnDiscordAudioProgress(event: DiscordProgressEvent) {
    const instance = this.getOrCreatePlaybackInstance(event.guildId);
    instance.progress = event.progress;

    const nextTrack = instance.queue.getNextTrack();
    if (
      nextTrack &&
      nextTrack.duration != 0 &&
      nextTrack instanceof YoutubeTrack
    ) {
      if (
        nextTrack.duration - instance.progress <= 30000 &&
        nextTrack.state === YoutubeTrackState.None
      ) {
        this.logger.debug(
          `[${event.guildId}] Start pre-download next track ${nextTrack.name}...`,
        );
        this.youtubeSearchService.downloadTrack(nextTrack);
      }
    }
  }

  getQueueTracks(guildId: string): Track[] {
    const instance = this.getOrCreatePlaybackInstance(guildId);
    if (instance.queue) {
      return instance.queue.tracks;
    }
    return [];
  }

  getCurrentTrack(guildId: string): Track | undefined {
    const instance = this.getOrCreatePlaybackInstance(guildId);
    if (instance.queue) {
      return instance.queue.getActiveTrack();
    }
    return undefined;
  }

  getCurrentTrackNo(guildId: string): number {
    const instance = this.getOrCreatePlaybackInstance(guildId);
    return instance.queue.getActiveTrackNo();
  }

  getPlaybackProgress(guildId: string): number {
    const instance = this.getOrCreatePlaybackInstance(guildId);
    return instance.progress;
  }
}
