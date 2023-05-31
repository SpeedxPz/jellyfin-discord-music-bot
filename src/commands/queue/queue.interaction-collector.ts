import {
  Filter,
  InjectCauseEvent,
  InteractionEventCollector,
  On,
} from '@discord-nestjs/core';

import { forwardRef, Inject, Injectable, Scope } from '@nestjs/common';
import { Logger } from '@nestjs/common/services';

import {
  ButtonInteraction,
  ChatInputCommandInteraction,
  Guild,
  InteractionUpdateOptions,
} from 'discord.js';
import { QueueCommand } from './queue.command';
import { QueueTempCommandData } from './queue.types';

@Injectable({ scope: Scope.REQUEST })
@InteractionEventCollector({ time: 5 * 60 * 1000 })
export class QueueInteractionCollector {
  private readonly logger = new Logger(QueueInteractionCollector.name);

  constructor(
    @Inject(forwardRef(() => QueueCommand))
    private readonly queueCommand: QueueCommand,
    @InjectCauseEvent()
    private readonly causeInteraction: ChatInputCommandInteraction,
  ) {}

  @Filter()
  filter(interaction: ButtonInteraction): boolean {
    return (
      interaction.message.interaction !== null &&
      this.causeInteraction.id === interaction.message.interaction.id
    );
  }

  @On('collect')
  async onCollect(interaction: ButtonInteraction): Promise<void> {
    const guild = interaction.guild as Guild;
    const targetPage = this.getInteraction(interaction);
    this.logger.verbose(
      `Extracted the target page '${targetPage?.page}' from the button interaction`,
    );

    if (targetPage === undefined) {
      await interaction.update({
        content: 'Unknown error',
      });
      return;
    }

    this.logger.debug(
      `Updating current page for interaction ${this.causeInteraction.id} to ${targetPage.page}`,
    );
    this.queueCommand.pageData.set(this.causeInteraction.id, targetPage);
    const reply = this.queueCommand.getReplyForPage(guild.id, targetPage.page);
    await interaction.update(reply as InteractionUpdateOptions);
  }

  private getInteraction(
    interaction: ButtonInteraction,
  ): QueueTempCommandData | undefined {
    const current = this.queueCommand.pageData.get(this.causeInteraction.id);

    if (current === undefined) {
      this.logger.warn(
        `Unable to extract the current page from the cause interaction '${this.causeInteraction.id}'`,
      );
      return undefined;
    }

    this.logger.debug(
      `Retrieved current page from command using id '${
        this.causeInteraction.id
      }' in list of ${
        Object.keys(this.queueCommand.pageData).length
      }: ${current}`,
    );

    switch (interaction.customId) {
      case 'queue-controls-next':
        return {
          ...current,
          page: current.page + 1,
        };
      case 'queue-controls-previous':
        return {
          ...current,
          page: current.page - 1,
        };
      default:
        this.logger.error(
          'Unable to map button interaction from collector to target page',
        );
        return undefined;
    }
  }
}
