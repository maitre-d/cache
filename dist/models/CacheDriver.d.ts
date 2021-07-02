import type { CacheSegment, CacheSegmentHandler, CacheKeyPartial } from 'src/types';
export declare type CacheDriverOptions = {
    name: string;
    timeout: number;
    namespace?: string;
    omit_partials?: string[];
};
export declare class CacheDriver {
    _id: string;
    name: string;
    namespace: string;
    omit_partials: string[];
    timeout: number;
    constructor(options: CacheDriverOptions);
    flatten_cache_key(partials: CacheKeyPartial): string;
    /** Encode keys with namespace information */
    generate_encoded_cache_key(...partials_all: CacheKeyPartial[]): string;
    /** Parse segments options into segment strings for segment caching */
    parse_segments_to_cache(segments: (CacheSegment | CacheSegmentHandler)[], value: unknown): string[];
    parse_targeted_segments(key: string): string[];
    parse_wildcard_to_regex(wildcard_string: string): RegExp;
}
