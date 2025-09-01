import {
  AudioResource,
  joinVoiceChannel,
  getVoiceConnection,
  createAudioPlayer,
  NoSubscriberBehavior,
  AudioPlayerStatus,
  getVoiceConnections,
  createAudioResource,
  DiscordGatewayAdapterCreator,
} from '@discordjs/voice';
import { Injectable, Logger } from '@nestjs/common';
import { DiscordMessageService } from './discord.message.service';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Guild, GuildMember } from 'discord.js';
import { GuildVoice } from 'src/models/discord/GuildVoice';
import { NotInVoiceException } from './exception/not-in-voice.exception';
import { DiscordPlayEvent } from 'src/models/discord/DiscordPlayEvent';
import { Interval } from '@nestjs/schedule';
import { DiscordProgressEvent } from 'src/models/discord/DiscordProgressEvent';
import { Track } from 'src/models/shared/Track';

@Injectable()
export class DiscordVoiceService {
  private readonly logger = new Logger(DiscordVoiceService.name);
  private voiceSession: { [key: string]: GuildVoice };

  constructor(
    private readonly discordMessageService: DiscordMessageService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.voiceSession = {};
  }

  getOrCreateVoiceSession(guild_id: string): GuildVoice {
    if (!(guild_id in this.voiceSession)) {
      this.voiceSession[guild_id] = new GuildVoice();
      this.voiceSession[guild_id].id = guild_id;
    }
    return this.voiceSession[guild_id];
  }

  /**
   * Play the current audio player
   */
  @OnEvent('discord.audioplayer.play')
  handleOnNewTrack(event: DiscordPlayEvent) {
    const voice = this.getOrCreateVoiceSession(event.guild_id);
    if (!voice.voiceConnection) return;
    const resource = createAudioResource(event.streamURL, {
      inlineVolume: true,
    });

    if (resource.volume) {
      resource.volume.setVolume(0.5);
    }
    this.playResource(event.guild_id, resource, event.track);
  }

  /**
   * Stop the current audio player
   */
  @OnEvent('discord.audioplayer.stop')
  stop(guild_id: string) {
    const voice = this.getOrCreateVoiceSession(guild_id);
    if (!voice.voiceConnection) return;
    voice.audioPlayer?.stop();
    voice.audioResource = undefined;
  }

  /**
   * Pauses the current audio player
   */
  @OnEvent('discord.audioplayer.pause')
  pause(guild_id: string) {
    const voice = this.getOrCreateVoiceSession(guild_id);
    if (!voice.voiceConnection) return;
    voice.audioPlayer?.pause();
    this.eventEmitter.emit('discord.audioplayer.event.paused', guild_id);
  }

  /**
   * Unpauses the current audio player
   */
  @OnEvent('discord.audioplayer.unpause')
  unpause(guild_id) {
    const voice = this.getOrCreateVoiceSession(guild_id);
    if (!voice.voiceConnection) return;
    voice.audioPlayer?.unpause();
    this.eventEmitter.emit('discord.audioplayer.event.resume', guild_id);
  }

  playResource(
    guild_id: string,
    resource: AudioResource<unknown>,
    track: Track,
  ) {
    const voice = this.getOrCreateVoiceSession(guild_id);
    this.logger.debug(
      `Playing audio resource with volume ${
        resource.volume?.volume ?? 'unknown'
      }`,
    );
    if (voice.audioPlayer) {
      voice.audioPlayer.play(resource);
      voice.audioResource = resource;
      this.eventEmitter.emit(
        'discord.audioplayer.event.play.started',
        new DiscordPlayEvent(guild_id, track, ''),
      );
    }
  }

  tryJoinChannelAndEstablishVoiceConnection(
    guild: Guild,
    member: GuildMember,
  ): void {
    const voice = this.getOrCreateVoiceSession(guild.id);
    if (voice.voiceConnection !== undefined) {
      this.logger.debug(
        `[${guild.id}] Avoided joining the voice channel because voice connection is already defined`,
      );
      return;
    }

    if (member.voice.channel === null) {
      this.logger.log(
        `[${guild.id}] Unable to join a voice channel because the member ${member.user.username} is not in a voice channel`,
      );
      throw new NotInVoiceException();
    }

    const channel = member.voice.channel;

    joinVoiceChannel({
      channelId: channel.id,
      adapterCreator: channel.guild
        .voiceAdapterCreator as DiscordGatewayAdapterCreator,
      guildId: channel.guildId,
    });

    if (voice.voiceConnection === undefined) {
      voice.voiceConnection = getVoiceConnection(member.guild.id);
    }

    if (voice.voiceConnection !== undefined) {
      this.logger.debug(
        `[${guild.id}] Initialized new instance of AudioPlayer because it has not been defined yet`,
      );
      voice.audioPlayer = createAudioPlayer({
        debug: process.env.DEBUG?.toLowerCase() === 'true',
        behaviors: {
          noSubscriber: NoSubscriberBehavior.Play,
        },
      });
      voice.voiceConnection.subscribe(voice.audioPlayer);
      this.attachEventListenersToAudioPlayer(voice);
    }
    return;
  }

  disconnect(guild: Guild): void {
    const voice = this.getOrCreateVoiceSession(guild.id);
    if (voice.voiceConnection === undefined) {
      throw new NotInVoiceException();
    }

    voice.voiceConnection.destroy();
    voice.destroy();
    return;
  }

  disconnectGracefully() {
    const connections = getVoiceConnections();
    this.logger.debug(
      `Disconnecting gracefully from ${
        Object.keys(connections).length
      } connections`,
    );

    connections.forEach((connection) => {
      connection.destroy();
    });
  }

  isHaveVoiceConnection(guild_id: string): boolean {
    const voice = this.getOrCreateVoiceSession(guild_id);
    return voice.voiceConnection !== undefined;
  }

  private attachEventListenersToAudioPlayer(voice: GuildVoice) {
    if (!voice.voiceConnection) {
      this.logger.error(
        `[${voice.id}] Unable to attach listener events, because the VoiceConnection was undefined`,
      );
      return;
    }
    if (!voice.audioPlayer) {
      this.logger.error(
        `[${voice.id}] Unable to attach listener events, because the AudioPlayer was undefined`,
      );
      return;
    }

    voice.voiceConnection.on('debug', (message) => {
      if (process.env.DEBUG?.toLowerCase() !== 'true') {
        return;
      }
      this.logger.debug(`[${voice.id}] ${message}`);
    });
    voice.voiceConnection.on('error', (err) => {
      this.logger.error(`[${voice.id}] Voice connection error: ${err}`);
    });

    voice.audioPlayer.on('debug', (message) => {
      this.logger.debug(`[${voice.id}] ${message}`);
    });
    voice.audioPlayer.on('error', (message) => {
      this.logger.error(`[${voice.id}] ${message}`);
    });

    voice.audioPlayer.on('stateChange', (previousState) => {
      if (!voice.audioPlayer) {
        this.logger.error(
          `[${voice.id}] Unable to process state change from audio player, because the current audio player in the callback was undefined`,
        );
        return;
      }

      this.logger.debug(
        `[${voice.id}] Audio player changed state from ${previousState.status} to ${voice.audioPlayer.state.status}`,
      );

      if (previousState.status !== AudioPlayerStatus.Playing) {
        return;
      }

      if (voice.audioPlayer.state.status !== AudioPlayerStatus.Idle) {
        return;
      }

      this.logger.debug(
        `[${voice.id}] Audio player finished playing old resource with ${voice.audioResource?.playbackDuration}`,
      );

      this.eventEmitter.emit(
        'discord.audioplayer.event.play.stopped',
        voice.id,
      );
    });
  }

  @Interval(1000)
  private checkAudioResourcePlayback() {
    for (const [key] of Object.entries(this.voiceSession)) {
      const voice = this.voiceSession[key];
      if (!voice.audioResource) {
        continue;
      }
      const progress = voice.audioResource.playbackDuration;

      this.eventEmitter.emit(
        'discord.audioplayer.event.play.progress',
        new DiscordProgressEvent(voice.id, progress),
      );

      this.logger.verbose(`Reporting progress: ${progress} for ${voice.id}`);
    }
  }
}
