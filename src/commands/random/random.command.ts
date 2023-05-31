import { SlashCommandPipe } from '@discord-nestjs/common';
import { Command, Handler, IA, InteractionEvent } from '@discord-nestjs/core';
import { Injectable } from '@nestjs/common';
import { CommandInteraction, Guild, GuildMember } from 'discord.js';
import { DiscordMessageService } from 'src/clients/discord/discord.message.service';
import { DiscordVoiceService } from 'src/clients/discord/discord.voice.service';
import { JellyfinSearchService } from 'src/clients/jellyfin/jellyfin.search.service';
import { PlaybackService } from 'src/playback/playback.service';
import { RandomCommandParams } from './random.params';
import { defaultMemberPermissions } from 'src/utils/environment';
import { NotInVoiceException } from 'src/clients/discord/exception/not-in-voice.exception';

@Command({
  name: 'random',
  description: 'Enqueues a random selection of tracks to your playlist',
  defaultMemberPermissions: defaultMemberPermissions,
})
@Injectable()
export class EnqueueRandomItemsCommand {
  constructor(
    private readonly playbackService: PlaybackService,
    private readonly discordVoiceService: DiscordVoiceService,
    private readonly discordMessageService: DiscordMessageService,
    private readonly jellyfinSearchService: JellyfinSearchService,
  ) {}

  @Handler()
  async handler(
    @InteractionEvent(SlashCommandPipe) dto: RandomCommandParams,
    @IA() interaction: CommandInteraction,
  ): Promise<void> {
    await interaction.deferReply();

    const guild = interaction.guild as Guild;
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

    const tracks = await this.jellyfinSearchService.getRandomTracks(dto.count);

    this.playbackService.enqueue(guild.id, tracks);

    await interaction.editReply({
      embeds: [
        this.discordMessageService.buildMessage({
          title: `Added ${tracks.length} tracks to your playlist`,
          description: 'Use ``/playlist`` to see them',
        }),
      ],
    });
  }
}
