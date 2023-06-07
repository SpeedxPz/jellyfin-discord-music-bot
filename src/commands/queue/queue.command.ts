import { CollectorInterceptor, SlashCommandPipe } from '@discord-nestjs/common';
import {
  AppliedCollectors,
  Command,
  Handler,
  IA,
  InteractionEvent,
  UseCollectors,
} from '@discord-nestjs/core';

import { Injectable, Logger, UseInterceptors } from '@nestjs/common';

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  CommandInteraction,
  EmbedBuilder,
  Guild,
  InteractionCollector,
  InteractionReplyOptions,
  InteractionUpdateOptions,
} from 'discord.js';

import { DiscordMessageService } from '../../clients/discord/discord.message.service';
import { Track } from '../../models/shared/Track';
import { PlaybackService } from '../../playback/playback.service';
import { chunkArray } from '../../utils/arrayUtils';
import {
  trimStringToFixedLength,
  zeroPad,
} from '../../utils/stringUtils/stringUtils';

import { Interval } from '@nestjs/schedule';
import { lightFormat } from 'date-fns';
import { defaultMemberPermissions } from 'src/utils/environment';
import { QueueCommandParams } from './queue.params';
import { QueueTempCommandData } from './queue.types';
import { QueueInteractionCollector } from './queue.interaction-collector';
import { DefaultJellyfinColor, InactiveColor } from 'src/types/colors';

@Injectable()
@Command({
  name: 'queue',
  description: 'Print the current track in queue information',
  defaultMemberPermissions: defaultMemberPermissions,
})
@UseInterceptors(CollectorInterceptor)
@UseCollectors(QueueInteractionCollector)
export class QueueCommand {
  public pageData: Map<string, QueueTempCommandData> = new Map();
  private readonly logger = new Logger(QueueCommand.name);

  constructor(
    private readonly discordMessageService: DiscordMessageService,
    private readonly playbackService: PlaybackService,
  ) {}

  @Handler()
  async handler(
    @InteractionEvent(SlashCommandPipe) dto: QueueCommandParams,
    @IA() interaction: CommandInteraction,
    @AppliedCollectors(0) _collector: InteractionCollector<ButtonInteraction>,
  ): Promise<void> {
    let page = dto.page ?? -1;
    const guild = interaction.guild as Guild;

    if (page == -1) {
      const trackNo = this.playbackService.getCurrentTrackNo(guild.id);
      page = Math.floor((trackNo - 1) / 10);
    }

    await interaction.reply(
      this.getReplyForPage(guild.id, page) as InteractionReplyOptions,
    );

    this.pageData.set(interaction.id, {
      page,
      interaction,
    });
    this.logger.debug(
      `Added '${interaction.id}' as a message id for page storage`,
    );

    setTimeout(async () => {
      this.logger.log(
        `Removed the components of message from interaction '${interaction.id}' because the event collector has reachted the timeout`,
      );
      this.pageData.delete(interaction.id);
      await interaction.editReply(
        this.getReplyForPage(guild.id, page, false) as InteractionReplyOptions,
      );
    }, 5 * 60 * 1000);
  }

  private getChunks(guildId: string) {
    const tracks = this.playbackService.getQueueTracks(guildId);
    return chunkArray(tracks, 10);
  }

  private createInterval(interaction: CommandInteraction) {
    return setInterval(async () => {
      const tempData = this.pageData.get(interaction.id);

      if (!tempData) {
        this.logger.warn(
          `Failed to update from interval, because temp data was not found`,
        );
        return;
      }

      const guild = interaction.guild as Guild;
      await interaction.editReply(
        this.getReplyForPage(guild.id, tempData.page),
      );
    }, 2000);
  }

  @Interval(2 * 1000)
  private async updateQueues() {
    if (this.pageData.size === 0) {
      return;
    }

    this.logger.verbose(`Updating queue for ${this.pageData.size} queue datas`);

    this.pageData.forEach(async (value) => {
      const guild = value.interaction.guild as Guild;

      await value.interaction.editReply(
        this.getReplyForPage(guild.id, value.page),
      );
    });
  }

  public getReplyForPage(
    guildId: string,
    page: number,
    isActive = true,
  ): InteractionReplyOptions | InteractionUpdateOptions {
    const chunks = this.getChunks(guildId);

    if (chunks.length === 0) {
      return {
        embeds: [
          this.discordMessageService.buildMessage({
            title: 'There are no items in your queue',
            description:
              'Use the ``/play`` command to add new items to your queue',
          }),
        ],
        ephemeral: false,
      };
    }

    if (page >= chunks.length) {
      return {
        embeds: [
          this.discordMessageService.buildMessage({
            title: 'Page does not exist',
            description: 'Please pass a valid page',
          }),
        ],
        ephemeral: false,
      };
    }

    const contentForPage = this.getContentForPage(guildId, chunks, page);

    if (!contentForPage) {
      return {
        embeds: [
          this.discordMessageService.buildMessage({
            title: 'Your Queue',
            description:
              'You do not have any tracks in your queue.\nStart play something to display the queue',
          }),
        ],
        ephemeral: false,
      };
    }

    const hasPrevious = page;
    const hasNext = page + 1 < chunks.length;

    const rowBuilder = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setDisabled(!hasPrevious)
        .setCustomId('queue-controls-previous')
        .setEmoji('◀️')
        .setLabel('Previous')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setDisabled(!hasNext)
        .setCustomId('queue-controls-next')
        .setEmoji('▶️')
        .setLabel('Next')
        .setStyle(ButtonStyle.Secondary),
    );

    return {
      embeds: [
        contentForPage
          .setColor(isActive ? DefaultJellyfinColor : InactiveColor)
          .toJSON(),
      ],
      ephemeral: false,
      components: isActive ? [rowBuilder] : [],
      fetchReply: true,
    };
  }

  private getContentForPage(
    guildId: string,
    chunks: Track[][],
    page: number,
  ): EmbedBuilder | undefined {
    this.logger.verbose(
      `Received request for page ${page} of queue page chunks`,
    );
    const tracks = this.playbackService.getQueueTracks(guildId);

    if (page >= chunks.length || page < 0) {
      this.logger.warn(`Request for page chunks was out of range: ${page}`);
      return undefined;
    }

    const offset = page * 10;
    const chunk = chunks[page];

    if (!chunk) {
      this.logger.error(
        `Failed to extract chunk from queue chunks array with page ${page}`,
      );
    }

    const paddingNumber = tracks.length >= 100 ? 3 : 2;

    const content = chunk
      .map((track, index) => {
        const isCurrent =
          track === this.playbackService.getCurrentTrack(guildId);

        let line = `\`\`${zeroPad(offset + index + 1, paddingNumber)}.\`\` `;
        line += this.getTrackName(track, isCurrent) + ' • ';
        if (isCurrent) {
          line +=
            lightFormat(
              this.playbackService.getPlaybackProgress(guildId),
              'mm:ss',
            ) + ' / ';
        }
        line += lightFormat(track.getDuration(), 'mm:ss');
        if (isCurrent) {
          line += ' • (:play_pause:)';
        }
        return line;
      })
      .join('\n');

    const embed = new EmbedBuilder()
      .setTitle('Your queue')
      .setDescription(content)
      .setFooter({
        text: `${page + 1} of ${chunks.length} pages`,
      });

    const track = this.playbackService.getCurrentTrack(guildId);
    if (track && track.getImageURL() != '') {
      embed.setThumbnail(track.getImageURL());
    }
    return embed;
  }

  private getTrackName(track: Track, active: boolean) {
    const trimmedTitle = trimStringToFixedLength(track.name, 30);
    if (active) {
      return `**${trimmedTitle}**`;
    }

    return trimmedTitle;
  }
}
