import { Injectable, Logger } from '@nestjs/common';

import { JellyfinService } from './jellyfin.service';

@Injectable()
export class JellyfinStreamBuilderService {
  private readonly logger = new Logger(JellyfinStreamBuilderService.name);

  constructor(private readonly jellyfinService: JellyfinService) {}

  buildStreamUrl(
    guild_id: string,
    jellyfinItemId: string,
    bitrate: number,
  ): string {
    const api = this.jellyfinService.getApi(guild_id);

    this.logger.debug(
      `Building stream for '${jellyfinItemId}' with bitrate ${bitrate}`,
    );

    const accessToken = this.jellyfinService.getApi(guild_id).accessToken;

    const uri = new URL(api.basePath);
    uri.pathname = `/Audio/${jellyfinItemId}/universal`;
    uri.searchParams.set('UserId', this.jellyfinService.getUserId(guild_id));
    uri.searchParams.set(
      'DeviceId',
      this.jellyfinService.getJellyfin(guild_id).clientInfo.name,
    );
    uri.searchParams.set('MaxStreamingBitrate', `${bitrate}`);
    uri.searchParams.set('Container', 'ogg,opus');
    uri.searchParams.set('AudioCodec', 'opus');
    uri.searchParams.set('TranscodingContainer', 'ts');
    uri.searchParams.set('TranscodingProtocol', 'hls');
    uri.searchParams.set('api_key', accessToken);

    return uri.toString();
  }
}
