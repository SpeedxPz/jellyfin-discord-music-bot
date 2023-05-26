import { JellyfinSearchService } from 'src/clients/jellyfin/jellyfin.search.service';
import { SearchHint } from 'src/models/search/SearchHint';
import { Track } from 'src/models/shared/Track';

export const convertToTracks = async (
  hints: SearchHint[],
  jellyfinSearchService: JellyfinSearchService,
): Promise<Track[]> => {
  let tracks: Track[] = [];

  for (const hint of hints) {
    const searchedTracks = await hint.toTracks(jellyfinSearchService);
    tracks = [...tracks, ...searchedTracks];
  }

  return tracks;
};
