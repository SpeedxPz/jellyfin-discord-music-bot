import { Command, Handler, IA } from '@discord-nestjs/core';
import { Injectable } from '@nestjs/common';
import { CommandInteraction, Guild } from 'discord.js';
import { DiscordMessageService } from 'src/clients/discord/discord.message.service';
import { DiscordVoiceService } from 'src/clients/discord/discord.voice.service';
import { PlaybackService } from 'src/playback/playback.service';

import { defaultMemberPermissions } from 'src/utils/environment';

@Command({
  name: 'stop',
  description: 'Stop playback entirely and clear the current playlist',
  defaultMemberPermissions: defaultMemberPermissions,
})
@Injectable()
export class StopPlaybackCommand {
  constructor(
    private readonly playbackService: PlaybackService,
    private readonly discordMessageService: DiscordMessageService,
    private readonly discordVoiceService: DiscordVoiceService,
  ) {}

  @Handler()
  async handler(@IA() interaction: CommandInteraction): Promise<void> {
    const guild = interaction.guild as Guild;
    const hasVoiceConnection = this.discordVoiceService.isHaveVoiceConnection(
      guild.id,
    );
    const title = hasVoiceConnection
      ? 'Playback stopped successfully'
      : 'Playback failed to stop';
    const description = hasVoiceConnection
      ? 'In addition, your playlist has been cleared'
      : 'There is no active track in the queue';
    if (hasVoiceConnection) {
      this.playbackService.stop(guild.id);
    }

    await interaction.reply({
      embeds: [
        this.discordMessageService[
          hasVoiceConnection ? 'buildMessage' : 'buildErrorMessage'
        ]({
          title: title,
          description: description,
        }),
      ],
    });
  }
}
