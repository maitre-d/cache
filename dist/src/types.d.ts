/**
 * The handler which will be called when a value cannot be retrieved from cache.
 * Returned value is cached if not undefined
 **/
export declare type CacheKeyPartial = (string | number | boolean | Record<string, unknown> | (string | number | boolean | Record<string, unknown>)[]);
export declare type CacheHandler = (...params: unknown[]) => (unknown | Promise<unknown>);
export declare type CacheSegmentHandler = (result: unknown) => (string | string[]);
export declare type CacheSegments = CacheSegment | CacheSegmentHandler | (CacheSegment | CacheSegmentHandler)[];
export declare type CacheSegment = string;
export declare type CacheHandlerOptions = {
    timeout?: number;
    force_new?: boolean;
    segments?: (CacheSegment | CacheSegmentHandler)[];
};
