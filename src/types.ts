/**
 * The handler which will be called when a value cannot be retrieved from cache.
 * Returned value is cached if not undefined
 **/
export type CacheKeyPartial = (string|number|boolean|Record<string, unknown>|(string|number|boolean|Record<string, unknown>)[])
export type CacheHandler = (...params: unknown[]) => (unknown|Promise<unknown>);
export type CacheSegmentHandler = (result: unknown) => (string|string[]);
export type CacheSegments = CacheSegment|CacheSegmentHandler|(CacheSegment|CacheSegmentHandler)[];
export type CacheSegment = string;
