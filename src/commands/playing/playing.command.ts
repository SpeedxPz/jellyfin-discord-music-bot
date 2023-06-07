import { Command, Handler, IA } from '@discord-nestjs/core';
import { Injectable, Logger } from '@nestjs/common';
import { DiscordMessageService } from 'src/clients/discord/discord.message.service';
import { PlaybackService } from 'src/playback/playback.service';
import { defaultMemberPermissions } from 'src/utils/environment';
import {
  CommandInteraction,
  EmbedBuilder,
  Guild,
  InteractionReplyOptions,
  InteractionUpdateOptions,
} from 'discord.js';
import { PlayingTempCommandData } from './playing.types';
import { lightFormat } from 'date-fns';
import {
  emptyOrDash,
  trimStringToFixedLength,
} from 'src/utils/stringUtils/stringUtils';
import { DefaultJellyfinColor, InactiveColor } from 'src/types/colors';
import { Interval } from '@nestjs/schedule';

@Injectable()
@Command({
  name: 'playing',
  description: 'Display information of current playing track',
  defaultMemberPermissions: defaultMemberPermissions,
})
export class PlayingCommand {
  public data: Map<string, PlayingTempCommandData> = new Map();
  private readonly logger = new Logger(PlayingCommand.name);

  constructor(
    private readonly discordMessageService: DiscordMessageService,
    private readonly playbackService: PlaybackService,
  ) {}

  @Handler()
  async handler(@IA() interaction: CommandInteraction): Promise<void> {
    const guild = interaction.guild as Guild;
    await interaction.reply(
      this.getReplyForPlaying(guild.id, true) as InteractionReplyOptions,
    );

    this.data.set(interaction.id, {
      interaction,
    });
    this.logger.debug(
      `Added '${interaction.id}' as a message id for playing data storage`,
    );
    setTimeout(async () => {
      this.logger.log(
        `Remove interval update from '${interaction.id}' because the event collector has reachted the timeout`,
      );
      await interaction.editReply(this.getReplyForPlaying(guild.id, false));
      this.data.delete(interaction.id);
    }, 5 * 60 * 1000);
  }

  @Interval(2 * 1000)
  private async updatePlaying() {
    if (this.data.size === 0) {
      return;
    }

    this.logger.verbose(`Updating playing for ${this.data.size} queue datas`);

    this.data.forEach(async (value) => {
      const guild = value.interaction.guild as Guild;

      await value.interaction.editReply(
        this.getReplyForPlaying(guild.id, true),
      );
    });
  }

  public getReplyForPlaying(
    guildId: string,
    isActive = true,
  ): InteractionReplyOptions | InteractionUpdateOptions {
    const track = this.playbackService.getCurrentTrack(guildId);
    if (!this.playbackService.isPlaying || !track) {
      return {
        embeds: [
          this.discordMessageService.buildMessage({
            title: 'There is nothing playing right now',
            description: 'Start play something to display this',
          }),
        ],
        ephemeral: false,
      };
    }

    const embed = new EmbedBuilder()
      .setTitle('Now Playing')
      .setDescription(trimStringToFixedLength(track.name, 50))
      .setFields(
        {
          name: 'Album',
          value: emptyOrDash(trimStringToFixedLength(track.album, 50)),
          inline: false,
        },
        {
          name: 'Artist',
          value: emptyOrDash(trimStringToFixedLength(track.artist, 50)),
          inline: false,
        },
        {
          name: 'Playing',
          value: lightFormat(
            this.playbackService.getPlaybackProgress(guildId),
            'mm:ss',
          ),
          inline: true,
        },
        {
          name: 'Duration',
          value: lightFormat(track.getDuration(), 'mm:ss'),
          inline: true,
        },
      )
      .setColor(isActive ? DefaultJellyfinColor : InactiveColor);

    if (track.imageURL) {
      return {
        embeds: [embed.setThumbnail(track.imageURL)],
        ephemeral: false,
      };
    } else {
      return {
        embeds: [embed],
        ephemeral: false,
      };
    }
  }
}
