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
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var lodash_1 = __importDefault(require("lodash"));
var index_1 = require("src/index");
var memory_1 = require("src/drivers/memory");
var Cache = new index_1.MemoryDriver({
    name: 'memory',
    timeout: -1,
    namespace: 'test',
    omit_partials: ['refresh'],
    strategy: memory_1.MemoryCacheCleanupStrategies.Least_Accessed,
    max_cache_size: '10kb',
    max_record_size: '1kb',
    minimum_prune_size: '1kb'
});
var generate_bytes = function (bytes) {
    return Array.from(new Array(Math.ceil(bytes / 2)), function () { return ' '; }).join('');
};
describe('MemoryCache', function () {
    var _this = this;
    beforeEach(function () { return Cache.flush(); });
    describe('fetch', function () {
        var _this = this;
        it('Should generate and set a value if unset', function () { return __awaiter(_this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        expect(Cache.get('foo')).toBeUndefined();
                        _a = expect;
                        return [4 /*yield*/, Cache.fetch('foo', function () { return 'bar'; })];
                    case 1:
                        _a.apply(void 0, [_b.sent()]).toEqual('bar');
                        expect(Cache.get('foo')).toEqual('bar');
                        return [2 /*return*/];
                }
            });
        }); });
        it('Should return the set value if found', function () { return __awaiter(_this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        Cache.set('foo', 'bar');
                        _a = expect;
                        return [4 /*yield*/, Cache.fetch('foo', function () { return 'baz'; })];
                    case 1:
                        _a.apply(void 0, [_b.sent()]).toEqual('bar');
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('set', function () {
        it('Should return true to indicate a value was set in the cache', function () {
            var key = 'foo';
            expect(Cache.set(key, 'bar')).toBeTrue();
            expect(Object.keys(Cache._cache.values)).toBeArrayOfSize(1);
        });
        it('Should encode a unique key for a passed object when set in the cache', function () {
            expect(Cache.set(['foo', { foo: 'bar' }, true], 'bar1')).toBeTrue(); // Not Equivalent
            expect(Cache.set(['foo', { foo: 'baz' }, true], 'bar2')).toBeTrue(); // Not Equivalent
            expect(Object.keys(Cache._cache.values)).toBeArrayOfSize(2);
        });
        it('Should omit keys from encodable objects if within the omit setting', function () {
            expect(Cache.set(['foo', { refresh: true }], 'bar')).toBeTrue(); // Equivalent
            expect(Cache.set(['foo', {}], 'bat')).toBeTrue(); // Equivalent
            expect(Object.keys(Cache._cache.values)).toBeArrayOfSize(1);
            expect(Object.values(Cache._cache.values)[0].value).toEqual('bat');
        });
        it('Should set values into their respective segments within the cache', function () {
            expect(Cache.set('foo', 'bar', 1, ['foo'])).toBeTrue();
            expect(Object.keys(Cache._cache.segments)).toBeArrayOfSize(1);
            var cached_value = Object.values(Cache._cache.values)[0];
            expect(cached_value.segments).toBeArrayOfSize(1);
            for (var _i = 0, _a = cached_value.segments; _i < _a.length; _i++) {
                var segment = _a[_i];
                expect(Cache._cache.segments[segment]).toBeArrayOfSize(1);
                expect(Cache._cache.segments[segment][0]).toEqual(cached_value.id);
            }
        });
        it('Should increment the size of the cache when a value is set in the cache', function () {
            expect(Cache.size).toEqual(0);
            var value = generate_bytes(6);
            Cache.set('foo', value);
            var cached_value = Object.values(Cache._cache.values)[0];
            expect(cached_value.size).toEqual(6);
            expect(Cache.size).toEqual(cached_value.size);
        });
        it('Should set an expiration for the value being set (if specified)', function () {
            var expiration = 1;
            Cache.set('foo', 'bar', expiration);
            var cached_value = Object.values(Cache._cache.values)[0];
            expect(cached_value.expiration / 1000).toBeCloseTo((+new Date() + expiration) / 1000, 1);
        });
        it('Should default to the internal timeout for the value being set (if unspecified)', function () {
            Cache.set('foo', 'bar');
            var cached_value = Object.values(Cache._cache.values)[0];
            expect(cached_value.expiration).toEqual(-1);
        });
        it('Should not set a value whose size exceeds the cache value limit', function () {
            var very_large_object = Array.from(new Array(10000), function (_, ind) { return Math.random() * ind; });
            expect(Cache.set('foo', very_large_object)).toBeFalse();
        });
        describe('Pruning', function () {
            describe('Random (Default)', function () {
                it('Should prune values in the cache if the cache will exceed the global maximum (success)', function () {
                    Cache.options.strategy = memory_1.MemoryCacheCleanupStrategies.Random;
                    var status = [];
                    // 9.99kb
                    for (var i = 0; i < 10; i += 1) {
                        // We can only fill 1kb at a time
                        status.push(Cache.set('fill' + i, generate_bytes(998)));
                    }
                    status.push(Cache.set('val0', generate_bytes(100)));
                    // NOTE: We remove two large keys here because they are under the 1kb threshold
                    expect(Cache.size).toEqual(998 * 8 + 100);
                    expect(status.every(function (status) { return status === true; })).toBeTrue();
                });
            });
            describe('Last Accessed', function () {
                it('Should prune values in the cache if the cache will exceed the global maximum', function () {
                    Cache.options.strategy = memory_1.MemoryCacheCleanupStrategies.Least_Accessed;
                    var status = [];
                    // 9.99kb
                    for (var i = 0; i < 10; i += 1) {
                        // We can only fill 1kb at a time
                        status.push(Cache.set('fill' + i, generate_bytes(998)));
                    }
                    // Get something so we have a candidate to remove on the next set
                    Cache.get('fill0');
                    // >10kb
                    expect(Cache.set('val', generate_bytes(21))).toBeTrue();
                    // NOTE: If we had not accessed any values up to this point, we would fallback to random deletion
                    // NOTE: It'd remove two keys if we had observed more than one here
                    expect(Cache.size).toEqual(998 * 9 + 21 + 1);
                    expect(status.every(function (status) { return status === true; })).toBeTrue();
                });
                it('Should prune values in the cache in the order they are accessed', function () {
                    Cache.options.strategy = memory_1.MemoryCacheCleanupStrategies.Least_Accessed;
                    // 3kb each
                    // 9.99kb
                    for (var i = 0; i < 10; i += 1) {
                        // We can only fill 1kb at a time
                        Cache.set('fill' + i, generate_bytes(998));
                    }
                    // Access simulation stuff
                    Cache.get('fill1');
                    Cache.get('fill1');
                    Cache.get('fill2');
                    Cache.get('fill2');
                    Cache.get('fill2');
                    Cache.get('fill3');
                    expect(Cache.set('val', generate_bytes(100))).toBeTrue();
                    expect(Cache.get('fill2')).toBeUndefined();
                });
            });
        });
    });
    describe('get', function () {
        it('Should get the cache value using the cache_key', function () {
            var key = 'foo';
            var value = 'bar';
            Cache.set(key, value);
            var cached_value = Cache.get(key);
            expect(cached_value).toEqual(value);
        });
        it('Should return undefined if the cache value has expired', function () {
            return __awaiter(this, void 0, void 0, function () {
                var key, value, cached_value;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            key = 'foo';
                            value = 'bar';
                            Cache.set(key, value, 1);
                            return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(function () { return resolve(); }, 5); })];
                        case 1:
                            _a.sent();
                            cached_value = Cache.get(key);
                            expect(cached_value).toBeUndefined();
                            return [2 /*return*/];
                    }
                });
            });
        });
    });
    describe('delete', function () {
        it('Should delete a value from the cache', function () {
            var key = 'foo';
            var value = 'bar';
            Cache.set(key, value);
            expect(Cache.delete(key)).toEqual(1);
            var cached_value = Cache.get(key);
            expect(cached_value).toBeUndefined();
        });
        it('Should delete nothing if nothing matches', function () {
            Cache.set('foo', 'bar');
            expect(Cache.delete('')).toEqual(0);
        });
        it('Should use the segment to delete wildcard keys if possible', function () {
            Cache.set('foo', 'bar', -1, 'foo');
            Cache.set('bing', 'bat', -1, 'foo');
            Cache.set('boo', 'baz');
            expect(Cache.delete('*', 'foo')).toEqual(2);
            expect(Object.keys(Cache._cache.values)).toBeArrayOfSize(1);
        });
        it('Should unset the segment if all keys are removed', function () {
            Cache.set('foo', 'bar', -1, 'foo');
            Cache.set('bing', 'bat', -1, 'foo');
            expect(Cache.delete('*', 'foo')).toEqual(2);
            expect(Object.keys(Cache._cache.segments)).toBeArrayOfSize(0);
            expect(Object.keys(Cache._cache.access_counter)).toBeArrayOfSize(0);
        });
        it('Should unset the access_counter for each key removed', function () {
            Cache.set('foo', 'bar', -1, 'foo');
            Cache.set('bing', 'bat', -1, 'foo');
            Cache.get('foo'); // Increment the counter
            expect(Object.keys(Cache._cache.access_counter)).toBeArrayOfSize(1);
            expect(Cache.delete('*', 'foo')).toEqual(2);
            expect(Object.keys(Cache._cache.access_counter)).toBeArrayOfSize(0);
        });
        it('Should flush the cache if a wildcard key is passed without segments', function () {
            Cache.set('foo', 'bar', -1, 'biz');
            Cache.set('bing', 'bat');
            Cache.set('boo', 'baz');
            expect(Cache.delete('*')).toEqual(3);
            expect(Cache.get('foo')).toBeUndefined();
            expect(Cache.get('bing')).toBeUndefined();
            expect(Cache.get('boo')).toBeUndefined();
        });
        it('Should not remove anything if the segment is empty with a wildcard key', function () {
            Cache.set('foo', 'bar', -1, 'biz');
            Cache.set('bing', 'bat');
            Cache.set('boo', 'baz');
            expect(Cache.delete('*', 'foo')).toEqual(0);
            expect(Cache.get('foo')).not.toBeUndefined();
            expect(Cache.get('bing')).not.toBeUndefined();
            expect(Cache.get('boo')).not.toBeUndefined();
        });
        it('Should further filter the segmented keys if a key is provided', function () {
            Cache.set('foo', 'bar', -1, 'foo');
            Cache.set('bing', 'bat', -1, 'foo');
            expect(Cache.delete('bing', 'foo')).toEqual(1);
            expect(Cache.get('foo')).not.toBeUndefined();
        });
        it('Should further filter the segmented keys if a wildcard has additional filtering', function () {
            Cache.set('foo', 'bar', -1, 'foo');
            Cache.set('bing:bat', 'bat', -1, 'foo');
            Cache.set('bing:boo', 'boo', -1, 'foo');
            expect(Cache.delete('bing:*', 'foo')).toEqual(2);
            expect(Cache.get('foo')).not.toBeUndefined();
        });
        it('Should automatically look for a segment if a wildcard key is passed without segments', function () {
            Cache.set('bing:bat', 'bat', -1, 'bing');
            Cache.set('bing:boo', 'boo', -1, 'bing');
            expect(Cache.delete('bing:*')).toEqual(2);
        });
    });
    describe('cleanup', function () {
        it('Should prune expired values from the cache', function () { return __awaiter(_this, void 0, void 0, function () {
            var results;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        Cache.set('test0', 'bar', -1);
                        Cache.set('test1', 'bar', 1);
                        Cache.set('test2', 'bar', 2);
                        Cache.set('test3', 'bar', 10);
                        return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(function () { return resolve(); }, 5); })];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, Cache.cleanup()];
                    case 2:
                        results = _a.sent();
                        expect(results).toEqual(2);
                        return [2 /*return*/];
                }
            });
        }); });
        describe.skip('Performance', function () {
            var Cache;
            beforeEach(function () { return __awaiter(_this, void 0, void 0, function () {
                var segments, set, i, segment;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            // Initialize a large cache
                            Cache = new index_1.MemoryDriver({
                                name: 'test',
                                timeout: -1,
                                namespace: 'test',
                                omit_partials: ['refresh'],
                                strategy: memory_1.MemoryCacheCleanupStrategies.Least_Accessed,
                                max_cache_size: '1gb',
                                max_record_size: '1mb',
                                minimum_prune_size: '10mb',
                            });
                            segments = Array.from(new Array(5000), function (_, ind) { return 'segment:' + ind; });
                            set = [];
                            i = 0;
                            _a.label = 1;
                        case 1:
                            if (!(i < 1E5)) return [3 /*break*/, 4];
                            segment = void 0;
                            if (Math.random() > 0.2)
                                segment = segments[lodash_1.default.random(0, segments.length)];
                            set.push(Cache.set('test' + i, generate_bytes(2), lodash_1.default.random(1000, 3000), segment));
                            if (!(set.length > 1E4 || i === 1E5 - 1)) return [3 /*break*/, 3];
                            return [4 /*yield*/, Promise.all(set.splice(0, 1E4))];
                        case 2:
                            _a.sent();
                            _a.label = 3;
                        case 3:
                            i += 1;
                            return [3 /*break*/, 1];
                        case 4: return [2 /*return*/];
                    }
                });
            }); });
            it('Should be performant on cleanup (100k records)', function () { return __awaiter(_this, void 0, void 0, function () {
                var results;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: 
                        // Wait 5ms
                        return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(function () { return resolve(); }, 2000); })];
                        case 1:
                            // Wait 5ms
                            _a.sent();
                            return [4 /*yield*/, Cache.cleanup()];
                        case 2:
                            results = _a.sent();
                            results; //?
                            return [2 /*return*/];
                    }
                });
            }); });
        });
    });
});
//# sourceMappingURL=Memory.spec.js.map