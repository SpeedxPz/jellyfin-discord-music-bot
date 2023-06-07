import { SlashCommandPipe } from '@discord-nestjs/common';
import { Command, Handler, IA, InteractionEvent } from '@discord-nestjs/core';
import { Injectable } from '@nestjs/common';
import { CommandInteraction, Guild } from 'discord.js';
import { DiscordMessageService } from 'src/clients/discord/discord.message.service';
import { PlaybackService } from 'src/playback/playback.service';
import { defaultMemberPermissions } from 'src/utils/environment';
import { GoTrackCommandParams } from './go.params';

@Command({
  name: 'go',
  description: 'Go to the specific tracks in the queue by track number',
  defaultMemberPermissions: defaultMemberPermissions,
})
@Injectable()
export class GoTrackCommand {
  constructor(
    private readonly playbackService: PlaybackService,
    private readonly discordMessageService: DiscordMessageService,
  ) {}

  @Handler()
  async handler(
    @InteractionEvent(SlashCommandPipe) dto: GoTrackCommandParams,
    @IA() interaction: CommandInteraction,
  ): Promise<void> {
    const guild = interaction.guild as Guild;
    try {
      this.playbackService.goto(guild.id, dto.track_no);
      await interaction.reply({
        embeds: [
          this.discordMessageService.buildMessage({
            title: `Start playing track ${dto.track_no}`,
          }),
        ],
      });
    } catch (e) {
      await interaction.reply({
        embeds: [
          this.discordMessageService.buildErrorMessage({
            title: 'Your specify track does not exists',
          }),
        ],
      });
      return;
    }
  }
}
