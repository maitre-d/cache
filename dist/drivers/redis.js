"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisCacheDriver = void 0;
const lodash_1 = __importDefault(require("lodash"));
const CacheDriver_1 = require("src/models/CacheDriver");
const lazy_exploration_1 = require("src/utils/lazy_exploration");
/** Redis Cache Driver */
class RedisCacheDriver extends CacheDriver_1.CacheDriver {
    constructor(client, options) {
        super(options);
        this.count = 0;
        this.failed = 0;
        this.cache_delimiter = '__JSON__';
        this.client = client;
        this.options = Object.assign({ segment_key_partial: 'segments', max_queue_size: 20, flush_interval: 5 }, options);
        this.segment_cache_key = this.generate_encoded_cache_key(this.options.segment_key_partial);
        this.pipeline = this.client.pipeline();
        // Flush interval
        this.flush_interval = setInterval(() => {
            const pipeline = this.pipeline;
            this.pipeline = this.client.pipeline();
            pipeline.exec().then();
        }, this.options.flush_interval);
        // Max queue size check
        if (this.options.max_queue_size > 0) {
            this.queue_interval = setInterval(() => {
                if (this.queue_size > this.options.max_queue_size) {
                    const pipeline = this.pipeline;
                    this.pipeline = this.client.pipeline();
                    pipeline.exec().then();
                }
            }, 1);
        }
        client.on('end', () => {
            clearTimeout(this.flush_interval);
            if (this.queue_interval)
                clearTimeout(this.queue_interval);
        });
    }
    /** Returns the current queue size of request queue */
    get queue_size() {
        // NOTE: _queue is the internal reference to pending commands
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        return this.pipeline._queue.length;
    }
    /** Fetch a cached value from redis */
    fetch(key) {
        return __awaiter(this, void 0, void 0, function* () {
            const cache_key = this.generate_encoded_cache_key(key);
            return new Promise((resolve, reject) => {
                this.pipeline.get(cache_key, (err, result) => {
                    if (err)
                        reject(err);
                    else
                        resolve(result);
                });
            }).then((cache_value) => {
                if (typeof cache_value === 'string') {
                    const is_json = cache_value.substring(0, this.cache_delimiter.length) === this.cache_delimiter;
                    if (is_json) {
                        return JSON.parse(cache_value.substring(this.cache_delimiter.length));
                    }
                    return cache_value;
                }
                return undefined;
            });
        });
    }
    /** Cache a value in redis */
    set(key, value, expiration = this.timeout, segments = []) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!lodash_1.default.isArray(segments))
                segments = [segments];
            const cache_key = this.generate_encoded_cache_key(key);
            const cache_segments = this.parse_segments_to_cache(segments, value)
                .map((segment) => this.generate_encoded_cache_key('segment', segment));
            let encoded_value = value;
            if (typeof value !== 'string') {
                encoded_value = (this.cache_delimiter + JSON.stringify(value));
            }
            let resolved;
            if (expiration > 0) {
                resolved = new Promise((resolve, reject) => {
                    this.pipeline.set(cache_key, encoded_value, 'PX', expiration, (err, result) => {
                        if (err)
                            reject(err);
                        else
                            resolve(result);
                    });
                });
            }
            else {
                resolved = new Promise((resolve, reject) => {
                    this.pipeline.set(cache_key, encoded_value, (err, result) => {
                        if (err)
                            reject(err);
                        else
                            resolve(result);
                    });
                });
            }
            // Set segments. We do not need to wait for these as they aren't necessary real-time
            cache_segments.forEach((segment_key) => {
                this.pipeline.sadd(this.segment_cache_key, segment_key);
                this.pipeline.sadd(segment_key, cache_key);
            });
            return resolved.then((result) => {
                if (result === 'OK') {
                    this.count += 1;
                    return true;
                }
                this.failed += 1;
                return false;
            });
        });
    }
    /** Delete a value in the redis cache */
    delete(key, segments = [], allow_unsegmented_wildcard = false) {
        return __awaiter(this, void 0, void 0, function* () {
            if (lodash_1.default.isBoolean(segments)) {
                allow_unsegmented_wildcard = segments;
                segments = [];
            }
            if (!lodash_1.default.isArray(segments))
                segments = [segments];
            key = this.flatten_cache_key(key);
            const is_wildcard_key = key.indexOf('*') !== -1;
            if (!is_wildcard_key) {
                const cache_key = this.generate_encoded_cache_key(key);
                const status = yield this.client.unlink(cache_key);
                return status ? 1 : 0;
            }
            let targeted_segments = segments;
            if (targeted_segments.length === 0)
                targeted_segments = this.parse_targeted_segments(key);
            if (targeted_segments.length === 0 && allow_unsegmented_wildcard) {
                return this.flush();
            }
            // We have segments to crawl through
            const segment_results_promises = targeted_segments.map((targeted_segment) => __awaiter(this, void 0, void 0, function* () {
                const segment_key = this.generate_encoded_cache_key('segment', targeted_segment);
                const segment_members = yield this.client.smembers(segment_key);
                if (segment_members.length === 0)
                    return 0;
                const wildcard_segment_filter = this.parse_wildcard_to_regex(key);
                const matching_segment_members = segment_members.filter((segment) => wildcard_segment_filter.test(segment));
                const remove_all = matching_segment_members.length === segment_members.length;
                // We remove everything that matches within the set
                const pipeline = this.client.pipeline();
                if (remove_all) {
                    pipeline.srem(this.segment_cache_key, segment_key);
                    pipeline.unlink(segment_key);
                }
                else {
                    pipeline.srem(segment_key, ...matching_segment_members);
                }
                const results = new Promise((resolve) => {
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    pipeline.unlink(...matching_segment_members, (err, result) => {
                        if (err)
                            resolve(0);
                        else
                            resolve(result);
                    });
                });
                yield pipeline.exec();
                return results;
            }));
            // Sum the results
            return Promise.all(segment_results_promises).then((results) => {
                const delete_count = results.reduce((l, r) => l + r, 0);
                this.count -= delete_count;
                return delete_count;
            });
        });
    }
    flush() {
        return __awaiter(this, void 0, void 0, function* () {
            const cached_keys = [];
            let cursor = 0;
            do {
                const [next_cursor, scan_keys] = yield this.client.scan(cursor, 'MATCH', '*');
                cursor = +next_cursor;
                cached_keys.push(...scan_keys);
            } while (cursor > 0);
            if (cached_keys.length > 0) {
                const delete_count = yield this.client.unlink(...cached_keys);
                this.count -= delete_count;
                return delete_count;
            }
            return 0;
        });
    }
    cleanup() {
        return __awaiter(this, void 0, void 0, function* () {
            const pipeline = this.client.pipeline();
            const segments = yield this.client.smembers(this.segment_cache_key);
            // NOTE: We shuffle the segments so we are always exploring random segments from the set
            let removed = 0;
            yield lazy_exploration_1.lazy_exploration(lodash_1.default.shuffle(segments), (segment_key) => __awaiter(this, void 0, void 0, function* () {
                const removal = [];
                const cache_keys = yield this.client.smembers(segment_key); //?.
                const exists_pipeline = this.client.pipeline();
                for (const cache_key of cache_keys) {
                    exists_pipeline.exists(cache_key);
                }
                const exists_results = yield exists_pipeline.exec(); //?.
                for (let i = 0; i < exists_results.length; i += 1) {
                    const cache_key = cache_keys[i];
                    const exists = exists_results[i][1];
                    if (!exists) {
                        removal.push(cache_key);
                    }
                }
                // We are removing all keys from the segment
                if (removal.length === cache_keys.length) {
                    pipeline.unlink(segment_key);
                    pipeline.srem(this.segment_cache_key, segment_key);
                }
                else if (removal.length > 0) {
                    pipeline.srem(segment_key, ...removal);
                }
                else {
                    return true;
                }
                removed += removal.length;
                return false;
            }), 100, 25);
            this.count -= removed;
            // Clear everything we've queued
            yield pipeline.exec();
            return removed;
        });
    }
}
exports.RedisCacheDriver = RedisCacheDriver;
//# sourceMappingURL=redis.js.map