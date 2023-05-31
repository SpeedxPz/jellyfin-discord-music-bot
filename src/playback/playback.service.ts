import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Guild } from 'discord.js';
import { JellyfinService } from 'src/clients/jellyfin/jellyfin.service';
import { JellyfinStreamBuilderService } from 'src/clients/jellyfin/jellyfin.stream.builder.service';
import { DiscordPlayEvent } from 'src/models/discord/DiscordPlayEvent';
import { GuildPlayBack } from 'src/models/playback/GuildPlayBack';
import { PlayQueue } from 'src/models/shared/PlayQueue';
import { Track } from 'src/models/shared/Track';
import { NoNextTrackToPlay } from './exception/no-next-track-to-play.exception';

// import { Playlist } from '../models/shared/Playlist';

@Injectable()
export class PlaybackService {
  private readonly logger = new Logger(PlaybackService.name);
  private instances: { [key: string]: GuildPlayBack };
  // private playlist: Playlist | undefined = undefined;

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly jellyfinService: JellyfinService,
    private readonly jellyfinStreamBuilder: JellyfinStreamBuilderService,
  ) {
    this.instances = {};
  }

  getOrCreatePlaybackInstance(guild_id: string): GuildPlayBack {
    if (!(guild_id in this.instances)) {
      this.instances[guild_id] = new GuildPlayBack(guild_id);
    }
    return this.instances[guild_id];
  }

  async init(guild_id: string) {
    await this.jellyfinService.init(guild_id);
  }

  async disconnect(guild_id: string) {
    await this.jellyfinService.disconnect(guild_id);
  }

  async sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  enqueue(guild_id: string, tracks: Track[]): number {
    const instance = this.getOrCreatePlaybackInstance(guild_id);
    const length = instance.queue.enqueueTracks(tracks);

    if (instance.playing === false && instance.pause === false) {
      this.playNext(guild_id);
    }
    return length;
  }

  playNext(guild_id: string) {
    const instance = this.getOrCreatePlaybackInstance(guild_id);
    if (!instance.queue.setNextTrackAsActiveTrack()) {
      throw new NoNextTrackToPlay();
    }

    const track = instance.queue.getActiveTrack();
    if (!track) {
      throw new NoNextTrackToPlay();
    }

    const streamURL = this.jellyfinStreamBuilder.buildStreamUrl(
      guild_id,
      track.id,
      96000,
    );

    instance.playing = true;
    instance.pause = false;

    this.eventEmitter.emit(
      'discord.audioplayer.play',
      new DiscordPlayEvent(guild_id, track, streamURL),
    );
  }

  getQueueLength(guild_id: string): number {
    const instance = this.getOrCreatePlaybackInstance(guild_id);
    return instance.queue.getLength();
  }

  /* getPlaylistOrDefault(): Playlist {
    if (this.playlist) {
      return this.playlist;
    }

    this.playlist = new Playlist(this.eventEmitter);
    return this.playlist;
  }

  @OnEvent('internal.audio.track.previous')
  private handlePreviousTrackEvent() {
    this.getPlaylistOrDefault().setPreviousTrackAsActiveTrack();
  }

  @OnEvent('internal.audio.track.next')
  private handleNextTrackEvent() {
    this.getPlaylistOrDefault().setNextTrackAsActiveTrack();
  } */
}
