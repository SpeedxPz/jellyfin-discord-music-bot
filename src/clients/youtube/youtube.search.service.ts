import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { MediaKind } from 'src/models/search/MediaKind.enum';
import { SearchHint } from 'src/models/search/SearchHint';
import { Track } from 'src/models/shared/Track';
import {
  YoutubeTrack,
  YoutubeTrackState,
} from 'src/models/shared/YoutubeTrack';
import { getEnvironmentVariables } from 'src/utils/environment';
import { trimStringToFixedLength } from 'src/utils/stringUtils/stringUtils';
import { YoutubeNotFound } from './exception/youtube-not-found.exception';
import { convertISO8601ToSeconds } from 'src/utils/timeUtils';
import {
  InvalidYoutubeLink,
  InvalidYoutubePlaylistLink,
} from './exception/invalid.youtube.link.exception';
import { join } from 'path';
import { spawn } from 'child_process';
import { YoutubeGetAudioError } from './exception/youtube.audio.get.error.exception';
import * as fs from 'fs';
import { PlaylistStatusCallback } from 'src/models/youtube/PlaylistProcessCallback';

@Injectable()
export class YoutubeSearchService {
  private readonly logger = new Logger(YoutubeSearchService.name);
  private apiKey: string;
  private api: AxiosInstance;
  private cachePath: string;

  constructor() {
    this.apiKey = getEnvironmentVariables().YOUTUBE_SEARCH_API_KEY;
    this.api = axios.create({
      baseURL: getEnvironmentVariables().YOUTUBE_APIS_BASE_URL,
    });
    this.cachePath = getEnvironmentVariables().CACHE_PATH;
  }

  async searchItem(searchTerm: string, limit = 20): Promise<SearchHint[]> {
    const result: AxiosResponse = await this.api.get('/search', {
      params: {
        q: searchTerm,
        part: 'snippet',
        type: 'video',
        maxResults: limit,
        fields: 'items(snippet/title,snippet/channelTitle,id/videoId)',
        key: this.apiKey,
      },
    });

    const hints: SearchHint[] = result.data.items.map(
      (item: any) =>
        new SearchHint(
          item.id.videoId,
          `${trimStringToFixedLength(
            item.snippet.title,
            40,
          )} by ${trimStringToFixedLength(item.snippet.channelTitle, 30)}`,
          MediaKind.Audio,
          0,
        ),
    );

    return hints;
  }

  async getTracksById(id: string): Promise<Track[]> {
    const result: AxiosResponse = await this.api.get('/videos', {
      params: {
        id: id,
        part: 'snippet,contentDetails',
        key: this.apiKey,
      },
    });

    if (result.data.items.length <= 0) {
      throw new YoutubeNotFound();
    }

    const item = result.data.items[0];
    const track = new YoutubeTrack(
      id,
      item.snippet.title,
      item.snippet.description,
      item.snippet.channelTitle,
      convertISO8601ToSeconds(item.contentDetails.duration) * 1000,
      this.getThumbnail(item.snippet.thumbnails),
      `https://www.youtube.com/watch?v=${id}`,
    );

    return [track];
  }

  async getTracksByPlaylistId(
    id: string,
    callback?: PlaylistStatusCallback,
  ): Promise<Track[]> {
    let nextPageToken = null;
    let length = 0;
    let totalDuration = 0;
    const tracks: Track[] = [];

    while (true) {
      const result: AxiosResponse = await this.api.get('/playlistItems', {
        params: {
          playlistId: id,
          part: 'snippet,contentDetails',
          key: this.apiKey,
          maxResults: 50,
          pageToken: nextPageToken ? nextPageToken : undefined,
        },
      });
      const videoIds: string[] = [];
      result.data.items.forEach((item: any) => {
        return videoIds.push(item.contentDetails.videoId);
      });
      length += videoIds.length;
      const vidResult: AxiosResponse = await this.api.get('/videos', {
        params: {
          id: videoIds.join(','),
          part: 'snippet,contentDetails',
          key: this.apiKey,
        },
      });
      vidResult.data.items.forEach((item: any) => {
        const duration =
          convertISO8601ToSeconds(item.contentDetails.duration) * 1000;
        totalDuration += duration;

        tracks.push(
          new YoutubeTrack(
            item.id,
            item.snippet.title,
            item.snippet.description,
            item.snippet.channelTitle,
            duration,
            this.getThumbnail(item.snippet.thumbnails),
            `https://www.youtube.com/watch?v=${item.id}`,
          ),
        );
      });
      if (callback) {
        callback(length, totalDuration);
      }

      nextPageToken = result.data.nextPageToken;
      if (!nextPageToken) {
        break;
      }
    }

    return tracks;
  }

  private getThumbnail(thumbnail: any): string {
    if ('maxres' in thumbnail) {
      return thumbnail.maxres.url;
    } else if ('standard' in thumbnail) {
      return thumbnail.standard.url;
    } else if ('high' in thumbnail) {
      return thumbnail.high.url;
    } else if ('medium' in thumbnail) {
      return thumbnail.medium.url;
    } else if ('small' in thumbnail) {
      return thumbnail.small.url;
    } else {
      return thumbnail.default.url;
    }
  }

  async downloadTrack(track: YoutubeTrack): Promise<string> {
    return new Promise(async (resolve, reject) => {
      track.state = YoutubeTrackState.Downloading;
      const filePath = `${this.cachePath}/yt_${track.id}.mp3`;

      if (fs.existsSync(filePath)) {
        track.state = YoutubeTrackState.Ready;
        return resolve(filePath);
      }
      const isWin = process.platform === 'win32';
      const toolPath: string = join('./bin', isWin ? 'yt-dlp.exe' : 'yt-dlp');
      const toolFlags: string[] = [
        `${track.playURL}`,
        `-x`,
        '--audio-format',
        'mp3',
        '--audio-quality',
        '256K',
        '-f',
        'bestaudio',
        '-o',
        `${this.cachePath}/yt_%(id)s.%(ext)s`,
      ];

      const child = spawn(toolPath, toolFlags);
      child.stdout.on('data', (data: string) => console.log(`${data}`));
      child.stderr.on('data', (data: string) => console.log(`${data}`));
      child.once('exit', (code: number) => {
        if (code !== 0) {
          track.state = YoutubeTrackState.Error;
          return reject(new YoutubeGetAudioError());
        } else {
          track.state = YoutubeTrackState.Ready;
          return resolve(filePath);
        }
      });
    });
  }

  youtubeURLToId(url: string): string {
    const regExp =
      /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#\&\?]*).*/;
    const match = url.match(regExp);
    const result = match && match[7].length == 11 ? match[7] : '';
    if (result === '') {
      throw new InvalidYoutubeLink();
    }
    return result;
  }

  youtubeURLtoPlaylistId(url: string): string {
    const regExp =
      /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(playlist\?)|(watch\?)).*(list=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    const result = match && match[8].length == 34 ? match[8] : '';
    if (result === '') {
      throw new InvalidYoutubePlaylistLink();
    }
    return result;
  }
}
