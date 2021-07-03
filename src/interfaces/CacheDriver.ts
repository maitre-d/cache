import type {CacheSegment, CacheSegments, CacheKeyPartial, CacheHandlerOptions, CacheHandler} from 'src/types'

export interface CacheDriver {
  /** A unique ID generated for this instance */
  _id: string;

  /** The name of the driver */
  name: string;

  /** The namespace which will prepend all generated cache keys */
  namespace: string;

  /** The default timeout applied to values being cached, if unspecified */
  timeout: number;

  /** Partial keys to omit from being encoded */
  omit_partials: string[];

  /** Fetches a value from the cache or the provided callback */
  fetch: (key: CacheKeyPartial, cb: CacheHandler, options: CacheHandlerOptions) => Promise<unknown>;

  /** Gets a value from the cache */
  get: (key: CacheKeyPartial) => (unknown|Promise<unknown>);

  /** Sets a value in the cache */
  set: (key: CacheKeyPartial, value: unknown, expiration?: number, segments?: CacheSegments) => (boolean|Promise<boolean>);

  /** Delete a value from the cache */
  delete: (key: CacheKeyPartial, segments: CacheSegment|CacheSegment[]) => (number|Promise<number>);

  /** Flush the cache */
  flush: () => (number|Promise<number>)

  /** Perform a cleanup operation, as defined by the driver */
  cleanup: () => (number|Promise<number>)
}