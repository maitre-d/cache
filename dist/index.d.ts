import type { CacheDriver } from 'src/interfaces/CacheDriver';
import type { CacheHandler, CacheSegment, CacheSegmentHandler, CacheSegments, CacheKeyPartial } from 'src/types';
import { MemoryCacheDriver as MemoryDriver } from 'src/drivers/memory';
import { RedisCacheDriver as RedisDriver } from 'src/drivers/redis';
declare type CacheHandlerOptions = {
    timeout: number;
    force_new?: boolean;
    segments?: (CacheSegment | CacheSegmentHandler)[];
};
declare type CacheOptions = {
    name: string;
    omit_replication?: (string | RegExp)[];
    /** Control if a driver is utilized for fetch/set/delete operations */
    driver_methods: {
        default?: ('include' | 'omit');
        fetch?: string[];
        set?: string[];
        delete?: string[];
        flush?: string[];
    };
};
/** Cache manager responsible for controlling data flow between registered drivers */
export declare class Cache {
    drivers: CacheDriver[];
    options: CacheOptions;
    constructor(options: CacheOptions, drivers?: CacheDriver[]);
    /** Get a list of drivers which are active for the specified action */
    get_active(action: ('fetch' | 'set' | 'delete' | 'flush')): CacheDriver[];
    /** Add a driver to be managed */
    add(driver: CacheDriver): void;
    get(key: CacheKeyPartial, cb: CacheHandler, options: CacheHandlerOptions): Promise<unknown>;
    /** Fetch a value from the active drivers */
    fetch(key: CacheKeyPartial): Promise<unknown>;
    set(key: CacheKeyPartial, value: unknown, expiration?: number, segments?: CacheSegments): Promise<boolean>;
    delete(key: CacheKeyPartial, segments?: CacheSegment | CacheSegment[]): Promise<number>;
    flush(): Promise<number>;
}
/** Driver Re-exports */
export { MemoryDriver, RedisDriver };
