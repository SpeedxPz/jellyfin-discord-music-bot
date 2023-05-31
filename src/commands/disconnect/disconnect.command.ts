import { Command, Handler, IA } from '@discord-nestjs/core';
import { Jellyfin } from '@jellyfin/sdk';

import { Injectable } from '@nestjs/common/decorators';

import { CommandInteraction, Guild } from 'discord.js';
import { DiscordMessageService } from 'src/clients/discord/discord.message.service';
import { DiscordVoiceService } from 'src/clients/discord/discord.voice.service';
import { JellyfinService } from 'src/clients/jellyfin/jellyfin.service';
import { PlaybackService } from 'src/playback/playback.service';

import { defaultMemberPermissions } from 'src/utils/environment';

@Injectable()
@Command({
  name: 'disconnect',
  description: 'Join your current voice channel',
  defaultMemberPermissions: defaultMemberPermissions,
})
export class DisconnectCommand {
  constructor(
    private readonly discordVoiceService: DiscordVoiceService,
    private readonly discordMessageService: DiscordMessageService,
    private readonly playbackService: PlaybackService,
  ) {}

  @Handler()
  async handler(@IA() interaction: CommandInteraction): Promise<void> {
    await interaction.reply({
      embeds: [
        this.discordMessageService.buildMessage({
          title: 'Disconnecting...',
        }),
      ],
    });

    const guild = interaction.guild as Guild;

    try {
      this.discordVoiceService.disconnect(guild);
      this.playbackService.disconnect(guild.id);
    } catch (e) {
      await interaction.editReply({
        embeds: [
          this.discordMessageService.buildErrorMessage({
            title: 'Unable to disconnect from voice channel',
            description: 'I am currently not connected to any voice channels',
          }),
        ],
      });
      return;
    }

    await interaction.editReply({
      embeds: [
        this.discordMessageService.buildMessage({
          title: 'Disconnected from your channel',
        }),
      ],
    });
  }
}
