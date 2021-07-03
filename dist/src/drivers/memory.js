"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryCacheDriver = exports.MemoryCacheCleanupStrategies = void 0;
const lodash_1 = __importDefault(require("lodash"));
const object_sizeof_1 = __importDefault(require("object-sizeof"));
const CacheDriver_1 = require("src/models/CacheDriver");
const lazy_exploration_1 = require("src/utils/lazy_exploration");
const parse_to_bytes_1 = require("src/utils/parse_to_bytes");
var MemoryCacheCleanupStrategies;
(function (MemoryCacheCleanupStrategies) {
    MemoryCacheCleanupStrategies["Least_Accessed"] = "la";
    MemoryCacheCleanupStrategies["Random"] = "random";
    MemoryCacheCleanupStrategies["Flush"] = "flush";
})(MemoryCacheCleanupStrategies = exports.MemoryCacheCleanupStrategies || (exports.MemoryCacheCleanupStrategies = {}));
const MemoryCache = class MemoryCache {
    constructor() {
        this.size = 0;
        this.access_counter = {};
        this.segments = {};
        this.values = {};
    }
};
class MemoryCacheDriver extends CacheDriver_1.CacheDriver {
    constructor(options) {
        super(options);
        options.max_cache_size = parse_to_bytes_1.parse_to_bytes(options.max_cache_size);
        options.max_record_size = parse_to_bytes_1.parse_to_bytes(options.max_record_size);
        options.minimum_prune_size = parse_to_bytes_1.parse_to_bytes(options.minimum_prune_size);
        this.options = options;
        this._cache = new MemoryCache();
    }
    get free() { return this.options.max_cache_size - this.size; }
    get size() { return this._cache.size; }
    get count() { return Object.keys(this._cache.values).length; }
    /** Remove a value from the cache via the cache_key */
    _remove(cache_key) {
        let status = false;
        const cached_value = this._cache.values[cache_key];
        if (cached_value) {
            status = lodash_1.default.unset(this._cache.values, cache_key);
            lodash_1.default.unset(this._cache.access_counter, cache_key);
            this._cache.size -= cached_value.size;
            // Prune the key from the segments it references
            cached_value.segments.forEach((segment) => {
                const index = this._cache.segments[segment].indexOf(cache_key);
                if (index >= 0)
                    this._cache.segments[segment].splice(index, 1);
            });
        }
        return status;
    }
    prune(required_space, strategy = this.options.strategy) {
        const { values: cache, access_counter } = this._cache;
        let freed = 0;
        let ordered_access_keys;
        let cache_keys;
        switch (strategy) {
            case MemoryCacheCleanupStrategies.Least_Accessed:
                ordered_access_keys = Object.keys(access_counter).sort((a, b) => access_counter[a] - access_counter[b]);
                while (freed < required_space && ordered_access_keys.length > 0) {
                    const cache_key_to_prune = ordered_access_keys.pop();
                    const cached_value = cache[cache_key_to_prune];
                    if (this._remove(cache_key_to_prune)) {
                        freed += cached_value.size;
                    }
                }
                break;
            case MemoryCacheCleanupStrategies.Flush:
                freed = this.flush();
                break;
            case MemoryCacheCleanupStrategies.Random:
            default:
                cache_keys = Object.keys(cache);
                while (freed < required_space && cache_keys.length > 0) {
                    const random_index = Math.floor(Math.random() * cache_keys.length);
                    const cache_key_to_prune = cache_keys.splice(random_index, 1)[0];
                    const cached_value = cache[cache_key_to_prune];
                    if (this._remove(cache_key_to_prune)) {
                        freed += cached_value.size;
                    }
                }
        }
        return freed;
    }
    get(key) {
        const cache_key = this.generate_encoded_cache_key(key);
        const cached_value = this._cache.values[cache_key];
        if (cached_value) {
            const current_time = +new Date();
            // Has not expired
            if (cached_value.expiration === -1 || cached_value.expiration > current_time) {
                if (!this._cache.access_counter[cache_key])
                    this._cache.access_counter[cache_key] = 0;
                this._cache.access_counter[cache_key] += 1;
                // Return a clone of the underlying value
                return lodash_1.default.cloneDeep(cached_value.value);
            }
            else
                this._remove(cache_key);
        }
        return undefined;
    }
    set(key, value, expiration, segments = []) {
        if (!lodash_1.default.isNumber(expiration))
            expiration = this.timeout;
        if (!lodash_1.default.isArray(segments))
            segments = [segments];
        const cache_key = this.generate_encoded_cache_key(key);
        const cache_segments = this.parse_segments_to_cache(segments, value)
            .map((segment) => this.generate_encoded_cache_key('segment', segment));
        const cached_value_size = object_sizeof_1.default(value);
        if (cached_value_size > this.options.max_record_size)
            return false;
        let pruned = false;
        let cleaned = false;
        let cache_size = this._cache.size;
        while (cache_size + cached_value_size > this.options.max_cache_size) {
            // Cleanup the cache first
            if (!cleaned) {
                this.cleanup();
                cleaned = true;
            }
            // Next prune if needed
            else if (!pruned) {
                const required_space = Math.max((cache_size + cached_value_size) - this.options.max_cache_size + 1, this.options.minimum_prune_size);
                this.prune(required_space);
                pruned = true;
            }
            // We have done what we can. This value can't be set at this time
            else {
                const required_space = Math.max((cache_size + cached_value_size) - this.options.max_cache_size + 1, this.options.minimum_prune_size);
                this.prune(required_space, MemoryCacheCleanupStrategies.Random);
                return false;
            }
            cache_size = this._cache.size;
        }
        const cache_value = {
            id: cache_key,
            expiration: -1,
            size: cached_value_size,
            segments: cache_segments,
            // We make a clone to snapshot the value
            value: lodash_1.default.cloneDeep(value)
        };
        // -1 is never expire (It may still be pruned though if we hit cache max size)
        if (expiration !== -1) {
            cache_value.expiration = (+new Date()) + expiration;
        }
        // Set the value into cache
        this._cache.values[cache_key] = cache_value;
        this._cache.size += cache_value.size;
        // Set the segments for the cache_key
        cache_segments.forEach((segment_key) => {
            if (!lodash_1.default.isArray(this._cache.segments[segment_key])) {
                this._cache.segments[segment_key] = [];
            }
            this._cache.segments[segment_key].push(cache_key);
        });
        return true;
    }
    delete(key, segments = []) {
        if (!lodash_1.default.isArray(segments))
            segments = [segments];
        key = this.flatten_cache_key(key);
        const is_wildcard_key = key.indexOf('*') !== -1;
        if (!is_wildcard_key) {
            const cache_key = this.generate_encoded_cache_key(key);
            const status = this._remove(cache_key);
            return status ? 1 : 0;
        }
        let targeted_segments = segments;
        if (targeted_segments.length === 0)
            targeted_segments = this.parse_targeted_segments(key);
        // No targeted segments, so wildcard matches the entire cache
        // EG. '*'
        if (targeted_segments.length === 0) {
            return this.flush();
        }
        // We have segments to crawl through
        return targeted_segments.reduce((removed, targeted_segment) => {
            const segment_key = this.generate_encoded_cache_key('segment', targeted_segment);
            if (!lodash_1.default.has(this._cache.segments, segment_key))
                return removed;
            const segment_members = this._cache.segments[segment_key];
            const wildcard_segment_filter = this.parse_wildcard_to_regex(key);
            const matching_segment_members = segment_members.filter((segment) => wildcard_segment_filter.test(segment));
            const remove_all = matching_segment_members.length === segment_members.length;
            // We remove everything that matches within the set
            matching_segment_members.forEach((cache_key) => {
                const status = this._remove(cache_key);
                if (status)
                    removed += 1;
                if (!remove_all)
                    lodash_1.default.remove(this._cache.segments[segment_key], cache_key);
            });
            if (remove_all)
                lodash_1.default.unset(this._cache.segments, segment_key);
            return removed;
        }, 0);
    }
    cleanup() {
        const current_timestamp = +new Date();
        const { failures } = lazy_exploration_1.lazy_exploration(Object.keys(this._cache.values), (cache_key) => {
            const cached_value = this._cache.values[cache_key];
            if (cached_value.expiration !== -1 && current_timestamp > cached_value.expiration) {
                this._remove(cache_key);
                return false;
            }
            return true;
        }, 20, 5);
        return failures;
    }
    flush() {
        const key_count = Object.keys(this._cache.values).length;
        this._cache = new MemoryCache();
        return key_count;
    }
}
exports.MemoryCacheDriver = MemoryCacheDriver;
MemoryCacheDriver.CleanupStrategies = MemoryCacheCleanupStrategies;
//# sourceMappingURL=memory.js.map