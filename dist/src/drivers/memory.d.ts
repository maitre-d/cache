import type { CacheDriver as CacheDriverInterface } from 'src/interfaces/CacheDriver';
import type { CacheSegment, CacheSegments, CacheKeyPartial } from 'src/types';
import { CacheDriver, CacheDriverOptions } from 'src/models/CacheDriver';
export declare type MemoryCachedValue = {
    id: string;
    value: unknown;
    expiration: number;
    size: number;
    segments: string[];
};
export declare type MemoryCacheOptions = {
    /**
     * Strategy used for clearing up space in the cache when exceeding the maximum size of the cache.
     * + la - Least Accessed (recommended, fast)
     * + random - Random deletion (fallback, slow)
     * + flush - Flush the entire cache (not recommended)
     */
    strategy: MemoryCacheCleanupStrategies;
    max_cache_size: (number | string);
    max_record_size: (number | string);
    minimum_prune_size: (number | string);
} & CacheDriverOptions;
export declare enum MemoryCacheCleanupStrategies {
    Least_Accessed = "la",
    Random = "random",
    Flush = "flush"
}
declare type MemoryCacheType = {
    values: {
        [index: string]: MemoryCachedValue;
    };
    segments: {
        [index: string]: string[];
    };
    access_counter: {
        [index: string]: number;
    };
    size: number;
};
export declare class MemoryCacheDriver extends CacheDriver implements CacheDriverInterface {
    static CleanupStrategies: typeof MemoryCacheCleanupStrategies;
    options: MemoryCacheOptions;
    _cache: MemoryCacheType;
    get free(): number;
    get size(): number;
    get count(): number;
    constructor(options: MemoryCacheOptions);
    /** Remove a value from the cache via the cache_key */
    _remove(cache_key: string): boolean;
    prune(required_space: number, strategy?: MemoryCacheCleanupStrategies): number;
    get(key: CacheKeyPartial): unknown;
    set(key: CacheKeyPartial, value: unknown, expiration?: number, segments?: CacheSegments): boolean;
    delete(key: CacheKeyPartial, segments?: CacheSegment | CacheSegment[]): number;
    cleanup(): number;
    flush(): number;
}
export {};
