import {
  BaseItemDto,
  SearchHint as JellyfinSearchHint,
} from '@jellyfin/sdk/lib/generated-client/models';

import { Track } from '../shared/Track';
import { JellyfinSearchService } from '../../clients/jellyfin/jellyfin.search.service';

import { SearchHint } from './SearchHint';

export class AlbumSearchHint extends SearchHint {
  override toString(): string {
    return `🎶 ${this.name}`;
  }

  static constructFromHint(hint: JellyfinSearchHint) {
    if (hint.Id === undefined || !hint.Name || !hint.RunTimeTicks) {
      throw new Error(
        'Unable to construct playlist search hint, required properties were undefined',
      );
    }

    return new AlbumSearchHint(hint.Id, hint.Name, hint.RunTimeTicks / 10000);
  }

  static constructFromBaseItem(baseItem: BaseItemDto) {
    if (baseItem.Id === undefined || !baseItem.Name || !baseItem.RunTimeTicks) {
      throw new Error(
        'Unable to construct search hint from base item, required properties were undefined',
      );
    }
    return new AlbumSearchHint(
      baseItem.Id,
      baseItem.Name,
      baseItem.RunTimeTicks / 10000,
    );
  }

  override async toTracks(
    searchService: JellyfinSearchService,
  ): Promise<Track[]> {
    const remoteImages = await searchService.getRemoteImageById(this.id);
    const albumItems = await searchService.getAlbumItems(this.id);
    const tracks = await Promise.all(
      albumItems.map(async (x) =>
        (await x.toTracks(searchService)).find((x) => x !== null),
      ),
    );
    return tracks.map((track: Track): Track => {
      track.remoteImages = remoteImages;
      return track;
    });
  }
}
