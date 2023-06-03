import { SlashCommandPipe } from '@discord-nestjs/common';
import {
  Command,
  Handler,
  IA,
  InteractionEvent,
  On,
} from '@discord-nestjs/core';

import { Injectable } from '@nestjs/common';
import { Logger } from '@nestjs/common/services';

import {
  CommandInteraction,
  Events,
  Guild,
  GuildMember,
  Interaction,
} from 'discord.js';

import { DiscordMessageService } from '../../clients/discord/discord.message.service';
import { DiscordVoiceService } from '../../clients/discord/discord.voice.service';
import { JellyfinSearchService } from '../../clients/jellyfin/jellyfin.search.service';
import { PlaybackService } from '../../playback/playback.service';
import { formatMillisecondsAsHumanReadable } from '../../utils/timeUtils';

import { defaultMemberPermissions } from 'src/utils/environment';
import { PlayCommandParams, SearchType, Mode, Position } from './play.params';
import { Track } from 'src/models/shared/Track';
import { NotInVoiceException } from 'src/clients/discord/exception/not-in-voice.exception';
import { trimStringToFixedLength } from 'src/utils/stringUtils/stringUtils';

@Injectable()
@Command({
  name: 'play',
  description: 'Search for an item on your Jellyfin instance',
  defaultMemberPermissions: defaultMemberPermissions,
})
export class PlayItemCommand {
  private readonly logger: Logger = new Logger(PlayItemCommand.name);

  constructor(
    private readonly jellyfinSearchService: JellyfinSearchService,
    private readonly discordMessageService: DiscordMessageService,
    private readonly discordVoiceService: DiscordVoiceService,
    private readonly playbackService: PlaybackService,
  ) {}

  @Handler()
  async handler(
    @InteractionEvent(SlashCommandPipe) dto: PlayCommandParams,
    @IA() interaction: CommandInteraction,
  ) {
    await interaction.deferReply({ ephemeral: false });

    const guild = interaction.guild as Guild;

    const mediaKind = PlayCommandParams.getMediaKinds(dto.type);

    let tracks: Track[];
    if (dto.name.startsWith('native-')) {
      tracks = await this.jellyfinSearchService.getTracksById(
        dto.name.replace('native-', ''),
        mediaKind,
      );
    } else {
      const hint = (
        await this.jellyfinSearchService.searchItem(dto.name, 1, mediaKind)
      ).find((x) => x);

      if (!hint) {
        tracks = [];
      } else {
        tracks = await this.jellyfinSearchService.getTracksById(
          hint.getId(),
          mediaKind,
        );
      }
    }

    if (tracks.length <= 0) {
      await interaction.followUp({
        embeds: [
          this.discordMessageService.buildMessage({
            title: 'No results found',
            description:
              '- Check for any misspellings\n- Grant me access to your desired libraries\n- Avoid special characters',
          }),
        ],
        ephemeral: false,
      });
      return;
    }

    const guildMember = interaction.member as GuildMember;

    try {
      this.discordVoiceService.tryJoinChannelAndEstablishVoiceConnection(
        guild,
        guildMember,
      );
      await this.playbackService.init(guild.id, guild.name);
    } catch (e) {
      if (e instanceof NotInVoiceException) {
        await interaction.editReply({
          embeds: [
            this.discordMessageService.buildMessage({
              title: 'Unable to join your channel',
              description:
                "I am unable to join your channel, because you don't seem to be in a voice channel. Connect to a channel first to use this command",
            }),
          ],
        });
      } else {
        await interaction.editReply({
          embeds: [
            this.discordMessageService.buildMessage({
              title: 'Unable to join your channel',
              description:
                'I am unable to join your channel, Unknown error. This should not happen!',
            }),
          ],
        });
      }
      return;
    }

    this.logger.debug(`Extracted ${tracks.length} tracks from the search item`);
    const reducedDuration = tracks.reduce(
      (sum, item) => sum + item.duration,
      0,
    );

    this.logger.debug(
      `Adding ${tracks.length} tracks with a duration of ${reducedDuration} ticks`,
    );

    const images = tracks.flatMap((track) => track.getImageURL());
    const image: string = images.length > 0 ? images[0] : '';

    if (dto.mode == Mode.Shuffle) {
      tracks = tracks
        .map((value) => ({ value, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ value }) => value);
    }

    if (dto.position == Position.EndOfQueue) {
      this.playbackService.enqueue(guild.id, tracks);
    } else {
      this.playbackService.enqueueNext(guild.id, tracks);
    }

    const totalLength = this.playbackService.getQueueLength(guild.id);

    await interaction.followUp({
      embeds: [
        this.discordMessageService.buildMessage({
          title: `Added ${
            tracks.length
          } tracks (${formatMillisecondsAsHumanReadable(
            reducedDuration,
          )}) to your queue`,
          description: `You have ${totalLength} tracks (${formatMillisecondsAsHumanReadable(
            reducedDuration,
          )}) in this queue`,
          mixin(embedBuilder) {
            if (!image) {
              return embedBuilder;
            }
            return embedBuilder.setThumbnail(image);
          },
        }),
      ],
      ephemeral: false,
    });
  }

  @On(Events.InteractionCreate)
  async onAutocomplete(interaction: Interaction) {
    if (!interaction.isAutocomplete()) {
      return;
    }

    const focusedAutoCompleteAction = interaction.options.getFocused(true);
    const typeIndex = interaction.options.getInteger('type');
    const type =
      typeIndex !== null ? Object.values(SearchType)[typeIndex] : undefined;
    const searchQuery = focusedAutoCompleteAction.value;

    if (!searchQuery || searchQuery.length < 1) {
      await interaction.respond([]);
      this.logger.debug(
        'Did not attempt a search, because the auto-complete option was empty',
      );
      return;
    }

    this.logger.debug(
      `Initiating auto-complete search for query '${searchQuery}' with type '${type}'`,
    );

    const hints = await this.jellyfinSearchService.searchItem(
      searchQuery,
      20,
      PlayCommandParams.getMediaKinds(type as SearchType),
    );

    if (hints.length === 0) {
      await interaction.respond([]);
      return;
    }

    const hintList = hints.map((hint) => {
      const title = trimStringToFixedLength(hint.toString(), 90);

      return {
        name: title,
        value: `native-${hint.getId()}`,
      };
    });

    await interaction.respond(hintList);
  }
}
