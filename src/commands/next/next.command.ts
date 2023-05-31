import { Command, Handler, IA } from '@discord-nestjs/core';
import { Injectable } from '@nestjs/common';
import { CommandInteraction, Guild } from 'discord.js';
import { DiscordMessageService } from 'src/clients/discord/discord.message.service';
import { PlaybackService } from 'src/playback/playback.service';

import { defaultMemberPermissions } from 'src/utils/environment';

@Command({
  name: 'next',
  description: 'Go to the next track in the playlist',
  defaultMemberPermissions: defaultMemberPermissions,
})
@Injectable()
export class NextTrackCommand {
  constructor(
    private readonly playbackService: PlaybackService,
    private readonly discordMessageService: DiscordMessageService,
  ) {}

  @Handler()
  async handler(@IA() interaction: CommandInteraction): Promise<void> {
    const guild = interaction.guild as Guild;
    try {
      this.playbackService.next(guild.id);
      await interaction.reply({
        embeds: [
          this.discordMessageService.buildMessage({
            title: 'Skipped to the next track',
          }),
        ],
      });
    } catch (e) {
      await interaction.reply({
        embeds: [
          this.discordMessageService.buildErrorMessage({
            title: 'There is no next track',
          }),
        ],
      });
      return;
    }
  }
}
