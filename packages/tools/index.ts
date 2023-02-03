export const toTypeString = (value: unknown): string => {
  return Object.prototype.toString.call(value);
};

export const toRawType = (value: unknown): string => {
  return toTypeString(value).slice(8, -1);
};