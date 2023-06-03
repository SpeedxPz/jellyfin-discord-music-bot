import { Command, Handler, IA } from '@discord-nestjs/core';
import { Injectable, Logger } from '@nestjs/common';
import { CommandInteraction, Guild, GuildMember } from 'discord.js';
import { DiscordMessageService } from '../../clients/discord/discord.message.service';
import { defaultMemberPermissions } from 'src/utils/environment';
import { DiscordVoiceService } from 'src/clients/discord/discord.voice.service';
import { NotInVoiceException } from 'src/clients/discord/exception/not-in-voice.exception';
import { PlaybackService } from 'src/playback/playback.service';

@Injectable()
@Command({
  name: 'summon',
  description: 'Join your current voice channel',
  defaultMemberPermissions: defaultMemberPermissions,
})
export class SummonCommand {
  private readonly logger = new Logger(SummonCommand.name);

  constructor(
    private readonly discordMessageService: DiscordMessageService,
    private readonly discordVoiceService: DiscordVoiceService,
    private readonly playbackService: PlaybackService,
  ) {}

  @Handler()
  async handler(@IA() interaction: CommandInteraction): Promise<void> {
    await interaction.deferReply();

    const guildMember = interaction.member as GuildMember;
    const guild = interaction.guild as Guild;

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

    await interaction.editReply({
      embeds: [
        this.discordMessageService.buildMessage({
          title: 'Joined your voice channel',
          description:
            "I'm ready to play media. Use ``Cast to device`` in Jellyfin or the ``/play`` command to get started.",
        }),
      ],
    });
  }
}
