import {
  BaseItemDto,
  BaseItemKind,
  SearchHint as JellySearchHint,
} from '@jellyfin/sdk/lib/generated-client/models';
import { getItemsApi } from '@jellyfin/sdk/lib/utils/api/items-api';
import { getPlaylistsApi } from '@jellyfin/sdk/lib/utils/api/playlists-api';
import { getSearchApi } from '@jellyfin/sdk/lib/utils/api/search-api';

import { Injectable } from '@nestjs/common';
import { Logger } from '@nestjs/common/services';
import { GuildJellyfin } from 'src/models/jellyfin/GuildJellyfin';
import { MediaKind } from 'src/models/search/MediaKind.enum';
import { SearchHint } from 'src/models/search/SearchHint';
import { JellyfinTrack } from 'src/models/shared/JellyfinTrack';
import { Track } from 'src/models/shared/Track';
import { getEnvironmentVariables } from 'src/utils/environment';
import { z } from 'zod';

import { JellyfinService } from './jellyfin.service';

@Injectable()
export class JellyfinSearchService {
  private readonly logger = new Logger(JellyfinSearchService.name);
  private readonly searchClientId = '0';

  constructor(private readonly jellyfinService: JellyfinService) {}

  async getJellyfinService(): Promise<GuildJellyfin> {
    if (!this.jellyfinService.isConnected(this.searchClientId)) {
      await this.jellyfinService.init(this.searchClientId, 'Main');
    }
    return this.jellyfinService.getOrCreateJellyfinSession(this.searchClientId);
  }

  async searchItem(
    searchTerm: string,
    limit?: number,
    includedMediaTypes: MediaKind[] = [
      MediaKind.Audio,
      MediaKind.AudioAlbum,
      MediaKind.Playlist,
    ],
  ): Promise<SearchHint[]> {
    const jellyfinClient = await this.getJellyfinService();
    const api = jellyfinClient.api;
    const searchApi = getSearchApi(api);

    if (includedMediaTypes.length === 0) {
      this.logger.warn(
        'Included item types are empty. This may lead to unwanted results',
      );
    }

    const baseItemKinds: BaseItemKind[] = [];
    for (const kind of includedMediaTypes) {
      baseItemKinds.push(this.mediaKind2BaseItemKind(kind));
    }

    try {
      const { data, status } = await searchApi.get({
        searchTerm: searchTerm,
        includeItemTypes: baseItemKinds,
        limit: limit,
      });

      if (status !== 200) {
        this.logger.error(
          `Jellyfin Search failed with status code ${status}: ${data}`,
        );
        return [];
      }

      const { SearchHints } = data;

      if (!SearchHints) {
        throw new Error('SearchHints were undefined');
      }

      return SearchHints.map((hint) =>
        this.transformToSearchHintFromHint(hint),
      ).filter((x) => x !== null) as SearchHint[];
    } catch (err) {
      this.logger.error(
        `Unable to retrieve random items from Jellyfin: ${err}`,
      );
      return [];
    }
  }

  private transformToSearchHintFromHint(jellyfinHint: JellySearchHint) {
    switch (jellyfinHint.Type) {
      case BaseItemKind[BaseItemKind.Audio]:
        return this.audioHint2SearchHint(jellyfinHint);
      case BaseItemKind[BaseItemKind.MusicAlbum]:
        return this.albumHint2SearchHint(jellyfinHint);
      case BaseItemKind[BaseItemKind.Playlist]:
        return this.playlistHint2SearchHint(jellyfinHint);
      default:
        this.logger.warn(
          `Received unexpected item type from Jellyfin search: ${jellyfinHint.Type}`,
        );
        return undefined;
    }
  }

  private audioHint2SearchHint(hint: JellySearchHint): SearchHint {
    const schema = z
      .object({
        Id: z.string(),
        Name: z.string(),
        AlbumArtist: z.string(),
        RunTimeTicks: z.number(),
      })
      .partial();
    const result = schema.safeParse(hint);

    if (!result.success) {
      throw new Error(
        `Unable to construct search hint, required properties were undefined: ${JSON.stringify(
          hint,
        )}`,
      );
    }

    let itemName = result.data.Name;
    if (result.data.AlbumArtist != '') {
      itemName = `${result.data.Name} (${result.data.AlbumArtist})`;
    }

    return new SearchHint(
      result.data.Id,
      itemName,
      MediaKind.Audio,
      result.data.RunTimeTicks / 10000,
    );
  }

  private playlistHint2SearchHint(hint: JellySearchHint): SearchHint {
    if (hint.Id === undefined || !hint.Name || !hint.RunTimeTicks) {
      throw new Error(
        'Unable to construct playlist search hint, required properties were undefined',
      );
    }
    return new SearchHint(
      hint.Id,
      hint.Name,
      MediaKind.Playlist,
      hint.RunTimeTicks / 10000,
    );
  }

  private albumHint2SearchHint(hint: JellySearchHint): SearchHint {
    if (hint.Id === undefined || !hint.Name || !hint.RunTimeTicks) {
      throw new Error(
        'Unable to construct playlist search hint, required properties were undefined',
      );
    }
    return new SearchHint(
      hint.Id,
      hint.Name,
      MediaKind.AudioAlbum,
      hint.RunTimeTicks / 10000,
    );
  }

  private mediaKind2BaseItemKind(media: MediaKind): BaseItemKind {
    switch (media) {
      case MediaKind.Audio:
        return BaseItemKind.Audio;
      case MediaKind.AudioAlbum:
        return BaseItemKind.MusicAlbum;
      case MediaKind.Playlist:
        return BaseItemKind.Playlist;
      default:
        return BaseItemKind.Audio;
    }
  }

  async getTracksById(
    id: string,
    includedMediaTypes: MediaKind[],
  ): Promise<Track[]> {
    const jellyfinClient = await this.getJellyfinService();
    const api = jellyfinClient.api;
    const searchApi = getItemsApi(api);

    const baseItemKinds: BaseItemKind[] = [];
    for (const kind of includedMediaTypes) {
      baseItemKinds.push(this.mediaKind2BaseItemKind(kind));
    }

    const { data } = await searchApi.getItems({
      ids: [id],
      userId: this.jellyfinService.getUserId(this.searchClientId),
      includeItemTypes: baseItemKinds,
    });

    if (!data.Items || data.Items.length !== 1) {
      this.logger.warn(`Failed to retrieve item via id '${id}'`);
      return [];
    }

    return await this.transformToTracksFromBaseItemDto(data.Items[0]);
  }

  private async transformToTracksFromBaseItemDto(
    baseItemDto: BaseItemDto,
  ): Promise<Track[]> {
    switch (baseItemDto.Type) {
      case BaseItemKind[BaseItemKind.Audio]:
        return await this.audio2Tracks(baseItemDto);
      case BaseItemKind[BaseItemKind.MusicAlbum]:
        return await this.album2Tracks(baseItemDto);
      case BaseItemKind[BaseItemKind.Playlist]:
        return await this.playlist2Tracks(baseItemDto);
      default:
        this.logger.warn(
          `Received unexpected item type from Jellyfin search: ${baseItemDto.Type}`,
        );
        return [];
    }
  }

  private async audio2Tracks(baseItemDto: BaseItemDto): Promise<Track[]> {
    if (
      baseItemDto.Id === undefined ||
      !baseItemDto.Name ||
      !baseItemDto.RunTimeTicks
    ) {
      throw new Error(
        'Unable to construct search hint from base item, required properties were undefined',
      );
    }

    return [
      new JellyfinTrack(
        baseItemDto.Id,
        baseItemDto.Name,
        baseItemDto.Album ? baseItemDto.Album : '',
        baseItemDto.Artists ? baseItemDto.Artists.join(',') : '',
        baseItemDto.RunTimeTicks / 10000,
        this.buildImageURL(baseItemDto.Id),
      ),
    ];
  }

  private buildImageURL(id: string): string {
    getEnvironmentVariables().JELLYFIN_SERVER_ADDRESS;
    if (!getEnvironmentVariables().JELLYFIN_INTERNAL_IMAGE_ENABLED) {
      return '';
    }
    const baseURL = getEnvironmentVariables().JELLYFIN_SERVER_ADDRESS;
    return `${baseURL}/Items/${id}/Images/Primary`;
  }

  private async album2Tracks(baseItemDto: BaseItemDto): Promise<Track[]> {
    const jellyfinClient = await this.getJellyfinService();
    const api = jellyfinClient.api;
    const searchApi = getSearchApi(api);
    const axiosResponse = await searchApi.get({
      parentId: baseItemDto.Id,
      userId: this.jellyfinService.getUserId(this.searchClientId),
      mediaTypes: [BaseItemKind[BaseItemKind.Audio]],
      searchTerm: '%',
    });

    if (axiosResponse.status !== 200) {
      this.logger.error(
        `Jellyfin Search failed with status code ${axiosResponse.status}`,
      );
      return [];
    }

    if (!axiosResponse.data.SearchHints) {
      this.logger.error(
        `Received an unexpected empty list but expected a list of tracks of the album`,
      );
      return [];
    }

    return [...axiosResponse.data.SearchHints].reverse().map((hint) => {
      return new JellyfinTrack(
        hint.Id ? hint.Id : '',
        hint.Name ? hint.Name : '',
        hint.Album ? hint.Album : '',
        hint.Artists ? hint.Artists.join(',') : '',
        (hint.RunTimeTicks ? hint.RunTimeTicks : 0) / 10000,
        this.buildImageURL(hint.Id ? hint.Id : ''),
      );
    });
  }

  private async playlist2Tracks(baseItemDto: BaseItemDto): Promise<Track[]> {
    const jellyfinClient = await this.getJellyfinService();
    const api = jellyfinClient.api;
    const searchApi = getPlaylistsApi(api);
    const axiosResponse = await searchApi.getPlaylistItems({
      userId: this.jellyfinService.getUserId(this.searchClientId),
      playlistId: baseItemDto.Id ? baseItemDto.Id : '',
    });

    if (axiosResponse.status !== 200) {
      this.logger.error(
        `Jellyfin Search failed with status code ${axiosResponse.status}`,
      );
      return [];
    }

    if (!axiosResponse.data.Items) {
      this.logger.error(
        `Jellyfin search returned no items: ${axiosResponse.data}`,
      );
      return [];
    }

    return axiosResponse.data.Items.map((hint) => {
      return new JellyfinTrack(
        hint.Id ? hint.Id : '',
        hint.Name ? hint.Name : '',
        hint.Album ? hint.Album : '',
        hint.Artists ? hint.Artists.join(',') : '',
        (hint.RunTimeTicks ? hint.RunTimeTicks : 0) / 10000,
        this.buildImageURL(hint.Id ? hint.Id : ''),
      );
    });
  }

  async getAllById(
    ids: string[],
    includeItemTypes: BaseItemKind[] = [BaseItemKind.Audio],
  ): Promise<Track[]> {
    const jellyfinClient = await this.getJellyfinService();
    const api = jellyfinClient.api;

    const searchApi = getItemsApi(api);
    const { data } = await searchApi.getItems({
      ids: ids,
      userId: this.jellyfinService.getUserId(this.searchClientId),
      includeItemTypes: includeItemTypes,
    });

    if (!data.Items || data.Items.length !== 1) {
      this.logger.warn(`Failed to retrieve item via id '${ids}'`);
      return [];
    }

    const result: Track[] = [];
    for (const item of data.Items) {
      const track = await this.audio2Tracks(item);
      result.push(track[0]);
    }
    return result;
  }

  async getRandomTracks(limit: number): Promise<Track[]> {
    const jellyfinClient = await this.getJellyfinService();
    const api = jellyfinClient.api;
    const searchApi = getItemsApi(api);

    try {
      const response = await searchApi.getItems({
        includeItemTypes: [BaseItemKind.Audio],
        limit: limit,
        sortBy: ['random'],
        userId: this.jellyfinService.getUserId(this.searchClientId),
        recursive: true,
      });

      if (!response.data.Items) {
        this.logger.error(
          `Received empty list of items but expected a random list of tracks`,
        );
        return [];
      }

      const result: Track[] = [];
      for (const item of response.data.Items) {
        const track = await this.audio2Tracks(item);
        result.push(track[0]);
      }
      return result;
    } catch (err) {
      this.logger.error(
        `Unable to retrieve random items from Jellyfin: ${err}`,
      );
      return [];
    }
  }
}
