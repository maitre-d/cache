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
const index_1 = require("src/index");
const client = new ioredis_1.default();
const Cache = new index_1.RedisDriver(client, {
    name: 'test',
    timeout: 10,
    namespace: 'test',
    omit_partials: ['refresh'],
    flush_interval: 5,
    max_queue_size: 100
});
const generate_bytes = (bytes) => Array.from(new Array(Math.ceil(bytes / 2)), () => ' ').join('');
describe('Cache', function () {
    beforeEach(() => __awaiter(this, void 0, void 0, function* () { return Cache.flush(); }));
    afterAll(() => __awaiter(this, void 0, void 0, function* () { return client.disconnect(); }));
    describe('fetch', () => {
        it('Should generate and set a value if unset', () => __awaiter(this, void 0, void 0, function* () {
            expect(yield Cache.get('foo')).toBeUndefined();
            expect(yield Cache.fetch('foo', () => 'bar')).toEqual('bar');
            expect(yield Cache.get('foo')).toEqual('bar');
        }));
        it('Should return the set value if found', () => __awaiter(this, void 0, void 0, function* () {
            yield Cache.set('foo', 'bar');
            expect(yield Cache.fetch('foo', () => 'baz')).toEqual('bar');
        }));
    });
    describe('set', () => {
        it('Should return true to indicate a value was set in the cache', () => __awaiter(this, void 0, void 0, function* () {
            const key = 'foo';
            expect(yield Cache.set(key, 'bar')).toBeTrue();
            expect(yield client.exists(Cache.generate_encoded_cache_key(key))).toEqual(1);
        }));
        it('Should encode a unique key for a passed object when set in the cache', () => __awaiter(this, void 0, void 0, function* () {
            const keys = [
                ['foo', { foo: 'bar' }, true],
                ['foo', { foo: 'baz' }, true] // Not Equivalent
            ];
            for (const key of keys) {
                const cache_key = Cache.generate_encoded_cache_key(key);
                expect(yield Cache.set(key, 'bar')).toBeTrue();
                expect(yield client.exists(cache_key)).toEqual(1);
                expect(cache_key).not.toEqual('foo:true');
            }
        }));
        it('Should omit keys from encodable objects if within the omit setting', () => __awaiter(this, void 0, void 0, function* () {
            const equivalent_key = ['foo', {}, true];
            expect(yield Cache.set(equivalent_key, 'bat')).toBeTrue(); // Equivalent
            expect(yield Cache.set(['foo', { refresh: true }, true], 'bar')).toBeTrue();
            expect(yield Cache.get(equivalent_key)).toEqual('bar');
        }));
        it('Should set values into their respective segments within the cache', () => __awaiter(this, void 0, void 0, function* () {
            expect(yield Cache.set('foo', 'bar', 1, ['foo'])).toBeTrue();
            expect(yield client.scard(Cache.segment_cache_key)).toEqual(1);
            expect(yield client.smembers(Cache.segment_cache_key))
                .toContain(Cache.generate_encoded_cache_key('segment', 'foo'));
        }));
        it('Should set an expiration for the value being set (if specified)', () => __awaiter(this, void 0, void 0, function* () {
            const expiration = 10;
            expect(yield Cache.set('foo', 'bar', expiration)).toBeTrue();
            const ttl = yield client.pttl(Cache.generate_encoded_cache_key('foo'));
            expect(ttl / 100).toBeCloseTo(expiration / 100, 1);
        }));
        it('Should default to the internal timeout for the value being set (if unspecified)', () => __awaiter(this, void 0, void 0, function* () {
            yield Cache.set('foo', 'bar');
            const ttl = yield client.pttl(Cache.generate_encoded_cache_key('foo'));
            expect(ttl / 100).toBeCloseTo(Cache.timeout / 100, 1);
        }));
    });
    describe('get', () => {
        it('Should get the cache value using the cache_key', () => __awaiter(this, void 0, void 0, function* () {
            const key = 'foo';
            const value = { foo: 'bar' };
            yield Cache.set(key, value);
            const cached_value = yield Cache.get(key);
            expect(cached_value).toEqual(value);
        }));
        it('Should return undefined if the cache value has expired', () => __awaiter(this, void 0, void 0, function* () {
            const key = 'foo';
            const value = 'bar';
            yield Cache.set(key, value, 1);
            yield new Promise((resolve) => setTimeout(() => resolve(), 5));
            const cached_value = yield Cache.get(key);
            expect(cached_value).toBeUndefined();
        }));
    });
    describe('delete', () => {
        it('Should delete a value from the cache', () => __awaiter(this, void 0, void 0, function* () {
            const key = 'foo';
            const value = 'bar';
            yield Cache.set(key, value);
            expect(yield Cache.delete(key)).toEqual(1);
            const cached_value = yield Cache.get(key);
            expect(cached_value).toBeUndefined();
        }));
        it('Should delete nothing if nothing matches', () => __awaiter(this, void 0, void 0, function* () {
            yield Cache.set('foo', 'bar');
            expect(yield Cache.delete('')).toEqual(0);
        }));
        it('Should use the segment to delete wildcard keys if possible', () => __awaiter(this, void 0, void 0, function* () {
            yield Promise.all([
                Cache.set('foo', 'bar', -1, 'foo'),
                Cache.set('bing', 'bat', -1, 'foo'),
                Cache.set('boo', 'baz', -1, 'bar'),
                Cache.set('baz', 'bing')
            ]);
            expect(yield Cache.delete('*', 'foo')).toEqual(2);
            expect(yield client.scard(Cache.segment_cache_key)).toEqual(1);
        }));
        it('Should unset the segment if all keys are removed', () => __awaiter(this, void 0, void 0, function* () {
            yield Cache.set('foo', 'bar', -1, 'foo');
            yield Cache.set('bing', 'bat', -1, 'foo');
            expect(yield Cache.delete('*', 'foo')).toEqual(2);
            expect(yield client.scard(Cache.segment_cache_key)).toEqual(0);
        }));
        it('Should NOT flush the cache if a wildcard key is passed without segments (wildcard-disallowed)', () => __awaiter(this, void 0, void 0, function* () {
            yield Promise.all([
                Cache.set('foo', 'bar', -1, 'biz'),
                Cache.set('bing', 'bat'),
                Cache.set('boo', 'baz')
            ]);
            expect(yield Cache.delete('*')).toEqual(0);
            const keys = yield Promise.all([
                Cache.get('foo'),
                Cache.get('bing'),
                Cache.get('boo')
            ]);
            expect(keys[0]).not.toBeUndefined();
            expect(keys[1]).not.toBeUndefined();
            expect(keys[2]).not.toBeUndefined();
        }));
        it('Should flush the cache if a wildcard key is passed without segments (wildcard-allowed)', () => __awaiter(this, void 0, void 0, function* () {
            yield Promise.all([
                Cache.set('foo', 'bar', -1, 'biz'),
                Cache.set('bing', 'bat'),
                Cache.set('boo', 'baz')
            ]);
            // NOTE: 5, Because 1 global cache segment key, 1 segment, 3 values
            expect(yield Cache.delete('*', [], true)).toEqual(5);
            const keys = yield Promise.all([
                Cache.get('foo'),
                Cache.get('bing'),
                Cache.get('boo')
            ]);
            expect(keys[0]).toBeUndefined();
            expect(keys[1]).toBeUndefined();
            expect(keys[2]).toBeUndefined();
        }));
        it('Should not remove anything if the segment is empty with a wildcard key', () => __awaiter(this, void 0, void 0, function* () {
            yield Promise.all([
                Cache.set('foo', 'bar', -1, 'biz'),
                Cache.set('bing', 'bat'),
                Cache.set('boo', 'baz')
            ]);
            expect(yield Cache.delete('*', 'foo')).toEqual(0);
            const keys = yield Promise.all([
                Cache.get('foo'),
                Cache.get('bing'),
                Cache.get('boo')
            ]);
            expect(keys[0]).not.toBeUndefined();
            expect(keys[1]).not.toBeUndefined();
            expect(keys[2]).not.toBeUndefined();
        }));
        it('Should further filter the segmented keys if a key is provided', () => __awaiter(this, void 0, void 0, function* () {
            yield Cache.set('foo', 'bar', -1, 'foo');
            yield Cache.set('bing', 'bat', -1, 'foo');
            expect(yield Cache.delete('bing', 'foo')).toEqual(1);
            expect(yield Cache.get('foo')).not.toBeUndefined();
        }));
        it('Should further filter the segmented keys if a wildcard has additional filtering', () => __awaiter(this, void 0, void 0, function* () {
            yield Promise.all([
                Cache.set('foo', 'bar', -1, 'foo'),
                Cache.set('bing:bat', 'bat', -1, 'foo'),
                Cache.set('bing:boo', 'boo', -1, 'foo')
            ]);
            expect(yield Cache.delete('bing:*', 'foo')).toEqual(2);
            expect(yield Cache.get('foo')).not.toBeUndefined();
        }));
        it('Should automatically look for a segment if a wildcard key is passed without segments', () => __awaiter(this, void 0, void 0, function* () {
            yield Cache.set('bing:bat', 'bat', -1, 'bing');
            yield Cache.set('bing:boo', 'boo', -1, 'bing');
            expect(yield Cache.delete('bing:*')).toEqual(2);
        }));
    });
    describe('cleanup', () => {
        it('Should prune expired values from the cache', () => __awaiter(this, void 0, void 0, function* () {
            yield Promise.all([
                Cache.set('test0', 'bar', -1, 'foo'),
                Cache.set('test1', 'bar', 5, 'foo'),
                Cache.set('test2', 'bar', 10, 'bar'),
                Cache.set('test3', 'bar', 1000, 'baz')
            ]);
            yield new Promise((resolve) => setTimeout(() => resolve(), 100));
            const results = yield Cache.cleanup(); //?.
            expect(results).toEqual(2);
        }));
        describe.skip('Performance', () => {
            jest.setTimeout(5000); // 5s
            it('Should be performant on cleanup (10k records)', () => __awaiter(this, void 0, void 0, function* () {
                // Fill the cache with a lot of data
                const record_count = 1E4;
                const flush_count = 1E3;
                const segment_count = 3500;
                const start_time = new Date();
                const segments = Array.from(new Array(segment_count), (_, ind) => 'segment' + ind);
                let set = [];
                for (let i = 0; i < record_count; i += 1) {
                    const segment = segments[lodash_1.default.random(0, segments.length)];
                    const expire = 100; // 100ms
                    set.push(Cache.set('test' + i, generate_bytes(1000), expire, segment));
                    // Flush every set of records or final cycle
                    if (set.length > flush_count || i === record_count - 1) {
                        yield Promise.all(set);
                        set = [];
                    }
                }
                +new Date() - +start_time; //?
                // Wait to invalidate the cache
                yield new Promise((resolve) => setTimeout(() => resolve(), 100)); //?.
                // Cleanup the results
                const results = yield Cache.cleanup(); //?.
                results; //?
                expect(results / record_count).toBeCloseTo(1, 1);
            }));
        });
    });
});
//# sourceMappingURL=Redis.spec.js.map