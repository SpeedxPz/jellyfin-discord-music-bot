import { formatDuration, intervalToDuration } from 'date-fns';

export const formatMillisecondsAsHumanReadable = (
  milliseconds: number,
  format = ['years', 'months', 'weeks', 'days', 'hours', 'minutes', 'seconds'],
) => {
  const duration = formatDuration(
    intervalToDuration({
      start: milliseconds,
      end: 0,
    }),
    {
      format: format,
    },
  );
  return duration;
};

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function convertISO8601ToSeconds(input) {
  const reptms = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/;
  let hours = 0,
    minutes = 0,
    seconds = 0,
    totalseconds;

  if (reptms.test(input)) {
    const matches = reptms.exec(input);
    if (matches) {
      if (matches[1]) hours = Number(matches[1]);
      if (matches[2]) minutes = Number(matches[2]);
      if (matches[3]) seconds = Number(matches[3]);
      totalseconds = hours * 3600 + minutes * 60 + seconds;
    }
  }

  return totalseconds;
}
