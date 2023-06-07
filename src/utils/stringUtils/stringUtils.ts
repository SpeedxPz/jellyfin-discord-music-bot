export const trimStringToFixedLength = (value: string, maxLength: number) => {
  if (maxLength < 1) {
    throw new Error('max length must be positive');
  }

  if (value.length <= maxLength) {
    return value;
  }

  const upperBound = maxLength - 3;

  return value.substring(0, upperBound) + '...';
};

export const zeroPad = (num: number, places: number) =>
  String(num).padStart(places, '0');

export const emptyOrDash = (value: string) => {
  if (value.length <= 0) {
    return '-';
  }
  return value;
};
