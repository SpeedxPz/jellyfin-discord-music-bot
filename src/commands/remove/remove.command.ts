import { SlashCommandPipe } from '@discord-nestjs/common';
import { Command, Handler, IA, InteractionEvent } from '@discord-nestjs/core';
import { Injectable } from '@nestjs/common';
import { CommandInteraction, Guild } from 'discord.js';
import { DiscordMessageService } from 'src/clients/discord/discord.message.service';
import { PlaybackService } from 'src/playback/playback.service';
import { defaultMemberPermissions } from 'src/utils/environment';
import { RemoveTrackCommandParams } from './remove.params';

@Command({
  name: 'remove',
  description: 'Remove track from the queue',
  defaultMemberPermissions: defaultMemberPermissions,
})
@Injectable()
export class RemoveTrackCommand {
  constructor(
    private readonly playbackService: PlaybackService,
    private readonly discordMessageService: DiscordMessageService,
  ) {}

  @Handler()
  async handler(
    @InteractionEvent(SlashCommandPipe) dto: RemoveTrackCommandParams,
    @IA() interaction: CommandInteraction,
  ): Promise<void> {
    const guild = interaction.guild as Guild;

    const result = this.playbackService.removeTrack(guild.id, dto.track_no);
    if (!result) {
      await interaction.reply({
        embeds: [
          this.discordMessageService.buildErrorMessage({
            title:
              'Invalid track number or try to remove current playing track.',
          }),
        ],
      });
    }

    await interaction.reply({
      embeds: [
        this.discordMessageService.buildMessage({
          title: `Removed track ${dto.track_no} from the queue`,
        }),
      ],
    });
  }
}
