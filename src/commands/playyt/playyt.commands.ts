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
import {
  Mode,
  PlayYoutubeCommandParams,
  Position,
  SearchType,
} from './playyt.params';
import { trimStringToFixedLength } from 'src/utils/stringUtils/stringUtils';
import { YoutubeSearchService } from 'src/clients/youtube/youtube.search.service';
import { lightFormat } from 'date-fns';
import { Track } from 'src/models/shared/Track';
import { NotInVoiceException } from 'src/clients/discord/exception/not-in-voice.exception';
import { DefaultJellyfinColor } from 'src/types/colors';
import { YoutubeTrack } from 'src/models/shared/YoutubeTrack';
import {
  InvalidYoutubeLink,
  InvalidYoutubePlaylistLink,
} from 'src/clients/youtube/exception/invalid.youtube.link.exception';
import { formatMillisecondsAsHumanReadable } from 'src/utils/timeUtils';

@Injectable()
@Command({
  name: 'playyt',
  description: 'Search for an item on youtube or paste the link to start play',
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
        switch (dto.type) {
          case SearchType.Playlist:
            const playlistId = this.youtubeSearchService.youtubeURLtoPlaylistId(
              dto.name,
            );
            await interaction.editReply({
              embeds: [
                this.discordMessageService.buildMessage({
                  title: 'Loading youtube playlist...',
                }),
              ],
            });
            let nextUpdate = new Date();
            tracks = await this.youtubeSearchService.getTracksByPlaylistId(
              playlistId,
              (length, duration) => {
                const currentDateTime = new Date();
                if (currentDateTime >= nextUpdate) {
                  currentDateTime.setSeconds(currentDateTime.getSeconds() + 1);
                  nextUpdate = currentDateTime;
                  interaction.editReply({
                    embeds: [
                      this.discordMessageService.buildMessage({
                        title: 'Loading youtube playlist...',
                        description: `Loading ${length} songs with total duration of (${formatMillisecondsAsHumanReadable(
                          duration,
                        )})`,
                      }),
                    ],
                  });
                }
              },
            );
            break;
          case SearchType.Audio:
          default:
            const id = this.youtubeSearchService.youtubeURLToId(dto.name);
            tracks = await this.youtubeSearchService.getTracksById(id);
        }
      } catch (e) {
        if (e instanceof InvalidYoutubeLink) {
          await interaction.editReply({
            embeds: [
              this.discordMessageService.buildMessage({
                title: 'Invalid youtube video link',
                description:
                  '- Check for your link\n- If link is youtube playlist please specific ``Type`` to Playlist\n- Should be formatted like this ``https://www.youtube.com/watch?v=xxxxxxx``',
              }),
            ],
          });
        } else if (e instanceof InvalidYoutubePlaylistLink) {
          await interaction.editReply({
            embeds: [
              this.discordMessageService.buildMessage({
                title: 'Invalid youtube playlist link',
                description:
                  '- Check for your link\n- Should be formatted like this ``https://www.youtube.com/playlist?list=xxxxx``\n- Or this or ``https://www.youtube.com/watch?v=xxxxxx&list=xxxxxxx``',
              }),
            ],
          });
        } else {
          this.logger.error(e);
          await interaction.editReply({
            embeds: [
              this.discordMessageService.buildErrorMessage({
                title: 'Something went wrong with Youtube Engine',
                description: '- Please report this error to bot author',
              }),
            ],
          });
        }
        return;
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

    if (dto.mode == Mode.Shuffle) {
      tracks = tracks
        .map((value) => ({ value, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ value }) => value);
    }

    if (dto.position == Position.PlayNext) {
      this.playbackService.enqueueNext(guild.id, tracks);
    } else {
      this.playbackService.enqueue(guild.id, tracks);
    }

    if (tracks.length === 1) {
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
    } else {
      const reducedDuration = tracks.reduce(
        (sum, item) => sum + item.duration,
        0,
      );
      const totalLength = this.playbackService.getQueueLength(guild.id);

      await interaction.editReply({
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
              return embedBuilder.setImage(tracks[0].imageURL);
            },
          }),
        ],
      });
    }
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
