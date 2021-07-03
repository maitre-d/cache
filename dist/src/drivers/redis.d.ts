/// <reference types="node" />
import type IORedis from 'ioredis';
import type { CacheDriver as CacheDriverInterface } from 'src/interfaces/CacheDriver';
import type { CacheSegment, CacheSegments, CacheKeyPartial } from 'src/types';
import { CacheDriver, CacheDriverOptions } from 'src/models/CacheDriver';
export declare type RedisCacheOptions = {
    /** Key partial which will contain a reference to all managed segments */
    segment_key_partial?: string;
    /** Maximum number of pending requests before the queue is flushed */
    max_queue_size?: number;
    /** Interval, in milliseconds, which pending requests are flushed */
    flush_interval?: number;
} & CacheDriverOptions;
/** Redis Cache Driver */
export declare class RedisCacheDriver extends CacheDriver implements CacheDriverInterface {
    count: number;
    failed: number;
    pipeline_index: number;
    pending: {
        [index: number]: Promise<unknown>;
    };
    cache_delimiter: string;
    segment_cache_key: string;
    options: RedisCacheOptions;
    client: IORedis.Redis;
    pipeline: IORedis.Pipeline;
    flush_interval: NodeJS.Timeout;
    queue_interval?: NodeJS.Timeout;
    /** Returns the current queue size of request queue */
    get queue_size(): number;
    /** Indicate if pipelines are pending response */
    get is_pending(): boolean;
    constructor(client: IORedis.Redis, options: RedisCacheOptions);
    /** Wait for pending queues to clear */
    wait(): Promise<void>;
    $queue(command: string, params: unknown[], cb?: (err: Error, result: unknown) => void): void;
    /** Get a cached value from redis */
    get(key: CacheKeyPartial): Promise<unknown>;
    /** Cache a value in redis */
    set(key: CacheKeyPartial, value: unknown, expiration?: number, segments?: CacheSegments): Promise<boolean>;
    /** Delete a value in the redis cache */
    delete(key: CacheKeyPartial, segments?: boolean | CacheSegment | CacheSegment[], allow_unsegmented_wildcard?: boolean): Promise<number>;
    flush(): Promise<number>;
    cleanup(): Promise<number>;
}
