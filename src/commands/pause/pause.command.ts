import { Command, Handler, IA } from '@discord-nestjs/core';
import { Injectable } from '@nestjs/common';
import { CommandInteraction, Guild } from 'discord.js';
import { DiscordMessageService } from 'src/clients/discord/discord.message.service';
import { PlaybackService } from 'src/playback/playback.service';

import { defaultMemberPermissions } from 'src/utils/environment';

@Injectable()
@Command({
  name: 'pause',
  description: 'Pause or resume the playback of the current track',
  defaultMemberPermissions: defaultMemberPermissions,
})
export class PausePlaybackCommand {
  constructor(
    private readonly playbackService: PlaybackService,
    private readonly discordMessageService: DiscordMessageService,
  ) {}

  @Handler()
  async handler(@IA() interaction: CommandInteraction): Promise<void> {
    const guild = interaction.guild as Guild;
    try {
      const shouldBePaused = this.playbackService.togglePause(guild.id);
      await interaction.reply({
        embeds: [
          this.discordMessageService.buildMessage({
            title: shouldBePaused ? 'Paused' : 'Unpaused',
          }),
        ],
      });
    } catch (e) {
      await interaction.reply({
        embeds: [
          this.discordMessageService.buildErrorMessage({
            title: 'Player is not playing anything',
          }),
        ],
      });
      return;
    }
  }
}
