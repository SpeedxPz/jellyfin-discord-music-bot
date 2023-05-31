import { Command, Handler, IA } from '@discord-nestjs/core';
import { Injectable } from '@nestjs/common/decorators';
import { CommandInteraction, Guild } from 'discord.js';
import { DiscordMessageService } from 'src/clients/discord/discord.message.service';
import { PlaybackService } from 'src/playback/playback.service';
import { defaultMemberPermissions } from 'src/utils/environment';

@Injectable()
@Command({
  name: 'previous',
  description: 'Go to the previous track',
  defaultMemberPermissions: defaultMemberPermissions,
})
export class PreviousTrackCommand {
  constructor(
    private readonly playbackService: PlaybackService,
    private readonly discordMessageService: DiscordMessageService,
  ) {}

  @Handler()
  async handler(@IA() interaction: CommandInteraction): Promise<void> {
    const guild = interaction.guild as Guild;
    try {
      this.playbackService.previous(guild.id);
      await interaction.reply({
        embeds: [
          this.discordMessageService.buildMessage({
            title: 'Went to previous track',
          }),
        ],
      });
    } catch (e) {
      await interaction.reply({
        embeds: [
          this.discordMessageService.buildErrorMessage({
            title: 'There is no previous track',
          }),
        ],
      });
      return;
    }
  }
}
