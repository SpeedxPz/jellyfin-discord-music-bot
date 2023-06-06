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
  EmbedBuilder,
  Events,
  Guild,
  GuildMember,
  Interaction,
} from 'discord.js';

import { DiscordMessageService } from '../../clients/discord/discord.message.service';
import { DiscordVoiceService } from '../../clients/discord/discord.voice.service';
import { PlaybackService } from '../../playback/playback.service';

import {
  defaultMemberPermissions,
  getEnvironmentVariables,
} from 'src/utils/environment';
import { PlayYoutubeCommandParams, Position } from './playyt.params';
import { trimStringToFixedLength } from 'src/utils/stringUtils/stringUtils';
import { YoutubeSearchService } from 'src/clients/youtube/youtube.search.service';
import { lightFormat } from 'date-fns';
import { Track } from 'src/models/shared/Track';
import { NotInVoiceException } from 'src/clients/discord/exception/not-in-voice.exception';
import { DefaultJellyfinColor } from 'src/types/colors';
import { YoutubeTrack } from 'src/models/shared/YoutubeTrack';

@Injectable()
@Command({
  name: 'playyt',
  description: 'Search for an item on youtube',
  defaultMemberPermissions: defaultMemberPermissions,
})
export class PlayYoutubeItemCommand {
  private readonly logger: Logger = new Logger(PlayYoutubeItemCommand.name);

  constructor(
    private readonly youtubeSearchService: YoutubeSearchService,
    private readonly discordMessageService: DiscordMessageService,
    private readonly discordVoiceService: DiscordVoiceService,
    private readonly playbackService: PlaybackService,
  ) {}

  @Handler()
  async handler(
    @InteractionEvent(SlashCommandPipe) dto: PlayYoutubeCommandParams,
    @IA() interaction: CommandInteraction,
  ) {
    await interaction.deferReply({ ephemeral: false });

    const guild = interaction.guild as Guild;

    let tracks: Track[] = [];

    if (dto.name.startsWith('native-')) {
      tracks = await this.youtubeSearchService.getTracksById(
        dto.name.replace('native-', ''),
      );
    } else if (dto.name.startsWith('https://')) {
      try {
        const id = this.youtubeSearchService.youtubeURLToId(dto.name);
        tracks = await this.youtubeSearchService.getTracksById(id);
      } catch {
        tracks = [];
      }
    } else {
      try {
        const hint = (
          await this.youtubeSearchService.searchItem(dto.name, 1)
        ).find((x) => x);

        if (!hint) {
          tracks = [];
        } else {
          tracks = await this.youtubeSearchService.getTracksById(hint.getId());
        }
      } catch {
        tracks = [];
      }
    }

    if (tracks.length <= 0) {
      await interaction.followUp({
        embeds: [
          this.discordMessageService.buildMessage({
            title: 'No results found',
            description:
              '- Check for any misspellings\n- Avoid special characters',
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

    try {
      await this.youtubeSearchService.downloadTrack(tracks[0] as YoutubeTrack);
    } catch {
      await interaction.editReply({
        embeds: [
          this.discordMessageService.buildErrorMessage({
            title: 'Unable to get track from youtube',
            description:
              'There is might something to do with youtube, You should report this!',
          }),
        ],
      });
    }

    if (dto.position == Position.EndOfQueue) {
      this.playbackService.enqueue(guild.id, tracks);
    } else {
      this.playbackService.enqueueNext(guild.id, tracks);
    }

    const embed = new EmbedBuilder()
      .setTitle('Added song to the queue')
      .setDescription(trimStringToFixedLength(tracks[0].name, 50))
      .setFields(
        {
          name: 'Channel',
          value: trimStringToFixedLength(tracks[0].artist, 50),
          inline: true,
        },
        {
          name: 'Duration',
          value: lightFormat(tracks[0].getDuration(), 'mm:ss'),
          inline: true,
        },
      )
      .setColor(DefaultJellyfinColor)
      .setImage(tracks[0].imageURL)
      .setURL((tracks[0] as YoutubeTrack).playURL);

    await interaction.editReply({
      embeds: [embed],
    });
  }

  @On(Events.InteractionCreate)
  async onAutocomplete(interaction: Interaction) {
    if (!interaction.isAutocomplete()) {
      return;
    }

    if (interaction.commandName != 'playyt') {
      return;
    }

    if (!getEnvironmentVariables().YOUTUBE_SEARCH_API_KEY) {
      return;
    }

    const focusedAutoCompleteAction = interaction.options.getFocused(true);
    const searchQuery = focusedAutoCompleteAction.value;

    if (
      !searchQuery ||
      searchQuery.length < 3 ||
      searchQuery.startsWith('http')
    ) {
      await interaction.respond([]);
      this.logger.debug(
        'Did not attempt a search, because the auto-complete option was empty',
      );
      return;
    }

    this.logger.debug(
      `Initiating auto-complete search for query '${searchQuery}'`,
    );

    try {
      const hints = await this.youtubeSearchService.searchItem(searchQuery, 20);

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
    } catch (e) {
      this.logger.error(
        `Youtube query error, might hit quota limit maybe: ${e}`,
      );
      await interaction.respond([]);
    }
  }
}
