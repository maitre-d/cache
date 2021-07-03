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
const lodash_1 = __importDefault(require("lodash"));
const ioredis_1 = __importDefault(require("ioredis"));
const async_1 = __importDefault(require("async"));
const uuid_1 = require("uuid");
const index_1 = require("src/index");
const memory_1 = require("src/drivers/memory");
const client = new ioredis_1.default();
const RedisCache = new index_1.RedisDriver(client, {
    name: 'test',
    timeout: 10,
    flush_interval: 5,
    max_queue_size: 100
});
const MemoryCache = new index_1.MemoryDriver({
    name: 'memory',
    timeout: -1,
    strategy: memory_1.MemoryCacheCleanupStrategies.Least_Accessed,
    max_cache_size: '100mb',
    max_record_size: '1kb',
    minimum_prune_size: 100,
});
const Cache = new index_1.Cache({
    name: 'cache',
    driver_methods: {
        default: 'omit'
    }
}, [MemoryCache, RedisCache]);
const generate_bytes = (bytes) => Array.from(new Array(Math.ceil(bytes / 2)), () => ' ').join('');
describe('Cache', function () {
    beforeEach(() => __awaiter(this, void 0, void 0, function* () { return Cache.flush(); }));
    afterAll(() => __awaiter(this, void 0, void 0, function* () { return client.disconnect(); }));
    describe('get', function () {
        it('Should set the cache value using a callback function if unset.', function () {
            return __awaiter(this, void 0, void 0, function* () {
                const key = 'foo';
                const value = 'bar';
                const cb = jest.fn(() => value);
                const result = yield Cache.fetch(key, cb, { timeout: 1, force_new: false });
                expect(result).toEqual(value);
                expect(cb.mock.calls.length).toBe(1);
            });
        });
    });
    describe('set', function () {
        it('Should return true to indicate a value was set in the cache', function () {
            return __awaiter(this, void 0, void 0, function* () {
                const key = 'foo';
                expect(yield Cache.set(key, 'bar', 1)).toBeTrue();
            });
        });
    });
    describe('delete', function () {
        it('Should use the segment to delete wildcard keys if possible', function () {
            return __awaiter(this, void 0, void 0, function* () {
                const segment = 'foo_bar';
                const iterations = 5;
                yield async_1.default.times(iterations, () => __awaiter(this, void 0, void 0, function* () {
                    const id = uuid_1.v4();
                    const key = segment + ':' + id;
                    return Cache.set(key, id, -1, segment);
                }));
                const deleted = yield Cache.delete(segment + ':*');
                expect(deleted).toEqual(iterations);
            });
        });
        it('Should further filter the segmented keys if a wildcard has additional filtering', function () {
            return __awaiter(this, void 0, void 0, function* () {
                const segment = 'foo_bar';
                const iterations = 5;
                const partialID = 'baz';
                yield Promise.all(Array.from(new Array(iterations), (_, ind) => {
                    const id = uuid_1.v4();
                    const fuzzy = (ind % 2 > 0) ? 'bar' : 'bax';
                    const key = segment + ':' + partialID + ':' + id + ':' + fuzzy;
                    return Cache.set(key, id, 20, [segment]);
                }));
                const deleted = yield Cache.delete(segment + ':' + partialID + ':*:bar');
                expect(deleted).toEqual(2);
            });
        });
        it('Should delete non-wildcard keys', function () {
            return __awaiter(this, void 0, void 0, function* () {
                const key = 'foo:bar:baz:1251';
                yield Cache.set(key, 1251, 20);
                const deleted = yield Cache.delete(key);
                expect(deleted).toEqual(1);
            });
        });
        it('Should delete nothing if nothing matches', function () {
            return __awaiter(this, void 0, void 0, function* () {
                const segment = 'foo:bar:baz';
                const deleted = yield Cache.delete('bing:bat:biz:baz:*:bar', segment);
                expect(deleted).toEqual(0);
            });
        });
        it('Should remove all keys in a target segment with wildcard as key', function () {
            return __awaiter(this, void 0, void 0, function* () {
                const segment = 'foo:bar:baz';
                const altKeys = 'bing:bat:biz'.split(':');
                const iterations = 5;
                const partialID = 'baz';
                yield Promise.all(Array.from(new Array(iterations), () => {
                    const id = uuid_1.v4();
                    const fuzzy = 'bar';
                    const altKey = altKeys[Math.floor(Math.random() * (altKeys.length - 1))];
                    const key = altKey + ':' + partialID + ':' + id + ':' + fuzzy;
                    return Cache.set(key, id, -1, segment);
                }));
                const deleted = yield Cache.delete('*', segment);
                expect(deleted).toEqual(iterations); // +1 because we expect the segment to be removed too
            });
        });
    });
    describe('Performance', () => {
        let segments;
        beforeEach(() => __awaiter(this, void 0, void 0, function* () {
            // Fill the cache with a lot of data
            const segment_partials = Array.from(new Array(100), (_, ind) => ind);
            segments = Array.from(new Array(5000), (el, ind) => {
                let partial;
                if (Math.random() > 0.8) {
                    const ind = lodash_1.default.random(0, segment_partials.length);
                    partial = segment_partials[ind];
                }
                return ['segment', partial, ind].join(':');
            });
        }));
        it('Should be performant on cleanup', () => __awaiter(this, void 0, void 0, function* () {
            const n = 1E5;
            const set = [];
            const defined_segments = [];
            const start = new Date();
            for (let i = 0; i < n; i += 1) {
                let segment;
                if (Math.random() > 0.2) {
                    segment = segments[lodash_1.default.random(0, segments.length)];
                    defined_segments.push(segment);
                }
                set.push(Cache.set('test:' + i, generate_bytes(2), 100, segment)); //?.
            }
            +new Date() - +start; //?
            yield Promise.all(set); //?.
            // Wait 100ms
            yield new Promise((resolve) => setTimeout(() => resolve(), 100));
            expect(MemoryCache.count).toEqual(n);
            expect(RedisCache.count).toBeGreaterThan(n * 0.8);
            // Cleanup the results
            // NOTE: Redis cleanup is limited by the Redis server
            // 			 as we rely on redis ttl, which is not guaranteed
            //       millisecond precision.
            const redis_results = yield RedisCache.cleanup(); //?.
            const memory_results = yield MemoryCache.cleanup(); //?.
            expect(memory_results).toEqual(n);
            expect(redis_results).toBeGreaterThan(n * 0.7);
            expect(RedisCache.failed).toEqual(0);
            expect(RedisCache.count).toBeLessThan(n * 0.3);
            expect(MemoryCache.count).toEqual(0);
        }), 40000);
    });
});
//# sourceMappingURL=index.spec.js.map