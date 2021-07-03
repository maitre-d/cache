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
var ioredis_1 = __importDefault(require("ioredis"));
var index_1 = require("src/index");
var client = new ioredis_1.default();
var Cache = new index_1.RedisDriver(client, {
    name: 'test',
    timeout: 10,
    namespace: 'test',
    omit_partials: ['refresh'],
    flush_interval: 5,
    max_queue_size: 100
});
var generate_bytes = function (bytes) {
    return Array.from(new Array(Math.ceil(bytes / 2)), function () { return ' '; }).join('');
};
describe('Cache', function () {
    var _this = this;
    beforeEach(function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
        return [2 /*return*/, Cache.flush()];
    }); }); });
    afterAll(function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
        return [2 /*return*/, client.disconnect()];
    }); }); });
    describe('fetch', function () {
        it('Should generate and set a value if unset', function () { return __awaiter(_this, void 0, void 0, function () {
            var _a, _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        _a = expect;
                        return [4 /*yield*/, Cache.get('foo')];
                    case 1:
                        _a.apply(void 0, [_d.sent()]).toBeUndefined();
                        _b = expect;
                        return [4 /*yield*/, Cache.fetch('foo', function () { return 'bar'; })];
                    case 2:
                        _b.apply(void 0, [_d.sent()]).toEqual('bar');
                        _c = expect;
                        return [4 /*yield*/, Cache.get('foo')];
                    case 3:
                        _c.apply(void 0, [_d.sent()]).toEqual('bar');
                        return [2 /*return*/];
                }
            });
        }); });
        it('Should return the set value if found', function () { return __awaiter(_this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, Cache.set('foo', 'bar')];
                    case 1:
                        _b.sent();
                        _a = expect;
                        return [4 /*yield*/, Cache.fetch('foo', function () { return 'baz'; })];
                    case 2:
                        _a.apply(void 0, [_b.sent()]).toEqual('bar');
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('set', function () {
        it('Should return true to indicate a value was set in the cache', function () { return __awaiter(_this, void 0, void 0, function () {
            var key, _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        key = 'foo';
                        _a = expect;
                        return [4 /*yield*/, Cache.set(key, 'bar')];
                    case 1:
                        _a.apply(void 0, [_c.sent()]).toBeTrue();
                        _b = expect;
                        return [4 /*yield*/, client.exists(Cache.generate_encoded_cache_key(key))];
                    case 2:
                        _b.apply(void 0, [_c.sent()]).toEqual(1);
                        return [2 /*return*/];
                }
            });
        }); });
        it('Should encode a unique key for a passed object when set in the cache', function () { return __awaiter(_this, void 0, void 0, function () {
            var keys, _i, keys_1, key, cache_key, _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        keys = [
                            ['foo', { foo: 'bar' }, true],
                            ['foo', { foo: 'baz' }, true] // Not Equivalent
                        ];
                        _i = 0, keys_1 = keys;
                        _c.label = 1;
                    case 1:
                        if (!(_i < keys_1.length)) return [3 /*break*/, 5];
                        key = keys_1[_i];
                        cache_key = Cache.generate_encoded_cache_key(key);
                        _a = expect;
                        return [4 /*yield*/, Cache.set(key, 'bar')];
                    case 2:
                        _a.apply(void 0, [_c.sent()]).toBeTrue();
                        _b = expect;
                        return [4 /*yield*/, client.exists(cache_key)];
                    case 3:
                        _b.apply(void 0, [_c.sent()]).toEqual(1);
                        expect(cache_key).not.toEqual('foo:true');
                        _c.label = 4;
                    case 4:
                        _i++;
                        return [3 /*break*/, 1];
                    case 5: return [2 /*return*/];
                }
            });
        }); });
        it('Should omit keys from encodable objects if within the omit setting', function () { return __awaiter(_this, void 0, void 0, function () {
            var equivalent_key, _a, _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        equivalent_key = ['foo', {}, true];
                        _a = expect;
                        return [4 /*yield*/, Cache.set(equivalent_key, 'bat')];
                    case 1:
                        _a.apply(void 0, [_d.sent()]).toBeTrue(); // Equivalent
                        _b = expect;
                        return [4 /*yield*/, Cache.set(['foo', { refresh: true }, true], 'bar')];
                    case 2:
                        _b.apply(void 0, [_d.sent()]).toBeTrue();
                        _c = expect;
                        return [4 /*yield*/, Cache.get(equivalent_key)];
                    case 3:
                        _c.apply(void 0, [_d.sent()]).toEqual('bar');
                        return [2 /*return*/];
                }
            });
        }); });
        it('Should set values into their respective segments within the cache', function () { return __awaiter(_this, void 0, void 0, function () {
            var _a, _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        _a = expect;
                        return [4 /*yield*/, Cache.set('foo', 'bar', 1, ['foo'])];
                    case 1:
                        _a.apply(void 0, [_d.sent()]).toBeTrue();
                        _b = expect;
                        return [4 /*yield*/, client.scard(Cache.segment_cache_key)];
                    case 2:
                        _b.apply(void 0, [_d.sent()]).toEqual(1);
                        _c = expect;
                        return [4 /*yield*/, client.smembers(Cache.segment_cache_key)];
                    case 3:
                        _c.apply(void 0, [_d.sent()])
                            .toContain(Cache.generate_encoded_cache_key('segment', 'foo'));
                        return [2 /*return*/];
                }
            });
        }); });
        it('Should set an expiration for the value being set (if specified)', function () { return __awaiter(_this, void 0, void 0, function () {
            var expiration, _a, ttl;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        expiration = 10;
                        _a = expect;
                        return [4 /*yield*/, Cache.set('foo', 'bar', expiration)];
                    case 1:
                        _a.apply(void 0, [_b.sent()]).toBeTrue();
                        return [4 /*yield*/, client.pttl(Cache.generate_encoded_cache_key('foo'))];
                    case 2:
                        ttl = _b.sent();
                        expect(ttl / 100).toBeCloseTo(expiration / 100, 1);
                        return [2 /*return*/];
                }
            });
        }); });
        it('Should default to the internal timeout for the value being set (if unspecified)', function () { return __awaiter(_this, void 0, void 0, function () {
            var ttl;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Cache.set('foo', 'bar')];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, client.pttl(Cache.generate_encoded_cache_key('foo'))];
                    case 2:
                        ttl = _a.sent();
                        expect(ttl / 100).toBeCloseTo(Cache.timeout / 100, 1);
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('get', function () {
        it('Should get the cache value using the cache_key', function () { return __awaiter(_this, void 0, void 0, function () {
            var key, value, cached_value;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        key = 'foo';
                        value = { foo: 'bar' };
                        return [4 /*yield*/, Cache.set(key, value)];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, Cache.get(key)];
                    case 2:
                        cached_value = _a.sent();
                        expect(cached_value).toEqual(value);
                        return [2 /*return*/];
                }
            });
        }); });
        it('Should return undefined if the cache value has expired', function () { return __awaiter(_this, void 0, void 0, function () {
            var key, value, cached_value;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        key = 'foo';
                        value = 'bar';
                        return [4 /*yield*/, Cache.set(key, value, 1)];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(function () { return resolve(); }, 5); })];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, Cache.get(key)];
                    case 3:
                        cached_value = _a.sent();
                        expect(cached_value).toBeUndefined();
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('delete', function () {
        it('Should delete a value from the cache', function () { return __awaiter(_this, void 0, void 0, function () {
            var key, value, _a, cached_value;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        key = 'foo';
                        value = 'bar';
                        return [4 /*yield*/, Cache.set(key, value)];
                    case 1:
                        _b.sent();
                        _a = expect;
                        return [4 /*yield*/, Cache.delete(key)];
                    case 2:
                        _a.apply(void 0, [_b.sent()]).toEqual(1);
                        return [4 /*yield*/, Cache.get(key)];
                    case 3:
                        cached_value = _b.sent();
                        expect(cached_value).toBeUndefined();
                        return [2 /*return*/];
                }
            });
        }); });
        it('Should delete nothing if nothing matches', function () { return __awaiter(_this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, Cache.set('foo', 'bar')];
                    case 1:
                        _b.sent();
                        _a = expect;
                        return [4 /*yield*/, Cache.delete('')];
                    case 2:
                        _a.apply(void 0, [_b.sent()]).toEqual(0);
                        return [2 /*return*/];
                }
            });
        }); });
        it('Should use the segment to delete wildcard keys if possible', function () { return __awaiter(_this, void 0, void 0, function () {
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, Promise.all([
                            Cache.set('foo', 'bar', -1, 'foo'),
                            Cache.set('bing', 'bat', -1, 'foo'),
                            Cache.set('boo', 'baz', -1, 'bar'),
                            Cache.set('baz', 'bing')
                        ])];
                    case 1:
                        _c.sent();
                        _a = expect;
                        return [4 /*yield*/, Cache.delete('*', 'foo')];
                    case 2:
                        _a.apply(void 0, [_c.sent()]).toEqual(2);
                        _b = expect;
                        return [4 /*yield*/, client.scard(Cache.segment_cache_key)];
                    case 3:
                        _b.apply(void 0, [_c.sent()]).toEqual(1);
                        return [2 /*return*/];
                }
            });
        }); });
        it('Should unset the segment if all keys are removed', function () { return __awaiter(_this, void 0, void 0, function () {
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, Cache.set('foo', 'bar', -1, 'foo')];
                    case 1:
                        _c.sent();
                        return [4 /*yield*/, Cache.set('bing', 'bat', -1, 'foo')];
                    case 2:
                        _c.sent();
                        _a = expect;
                        return [4 /*yield*/, Cache.delete('*', 'foo')];
                    case 3:
                        _a.apply(void 0, [_c.sent()]).toEqual(2);
                        _b = expect;
                        return [4 /*yield*/, client.scard(Cache.segment_cache_key)];
                    case 4:
                        _b.apply(void 0, [_c.sent()]).toEqual(0);
                        return [2 /*return*/];
                }
            });
        }); });
        it('Should NOT flush the cache if a wildcard key is passed without segments (wildcard-disallowed)', function () { return __awaiter(_this, void 0, void 0, function () {
            var _a, keys;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, Promise.all([
                            Cache.set('foo', 'bar', -1, 'biz'),
                            Cache.set('bing', 'bat'),
                            Cache.set('boo', 'baz')
                        ])];
                    case 1:
                        _b.sent();
                        _a = expect;
                        return [4 /*yield*/, Cache.delete('*')];
                    case 2:
                        _a.apply(void 0, [_b.sent()]).toEqual(0);
                        return [4 /*yield*/, Promise.all([
                                Cache.get('foo'),
                                Cache.get('bing'),
                                Cache.get('boo')
                            ])];
                    case 3:
                        keys = _b.sent();
                        expect(keys[0]).not.toBeUndefined();
                        expect(keys[1]).not.toBeUndefined();
                        expect(keys[2]).not.toBeUndefined();
                        return [2 /*return*/];
                }
            });
        }); });
        it('Should flush the cache if a wildcard key is passed without segments (wildcard-allowed)', function () { return __awaiter(_this, void 0, void 0, function () {
            var _a, keys;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, Promise.all([
                            Cache.set('foo', 'bar', -1, 'biz'),
                            Cache.set('bing', 'bat'),
                            Cache.set('boo', 'baz')
                        ])];
                    case 1:
                        _b.sent();
                        // NOTE: 5, Because 1 global cache segment key, 1 segment, 3 values
                        _a = expect;
                        return [4 /*yield*/, Cache.delete('*', [], true)];
                    case 2:
                        // NOTE: 5, Because 1 global cache segment key, 1 segment, 3 values
                        _a.apply(void 0, [_b.sent()]).toEqual(5);
                        return [4 /*yield*/, Promise.all([
                                Cache.get('foo'),
                                Cache.get('bing'),
                                Cache.get('boo')
                            ])];
                    case 3:
                        keys = _b.sent();
                        expect(keys[0]).toBeUndefined();
                        expect(keys[1]).toBeUndefined();
                        expect(keys[2]).toBeUndefined();
                        return [2 /*return*/];
                }
            });
        }); });
        it('Should not remove anything if the segment is empty with a wildcard key', function () { return __awaiter(_this, void 0, void 0, function () {
            var _a, keys;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, Promise.all([
                            Cache.set('foo', 'bar', -1, 'biz'),
                            Cache.set('bing', 'bat'),
                            Cache.set('boo', 'baz')
                        ])];
                    case 1:
                        _b.sent();
                        _a = expect;
                        return [4 /*yield*/, Cache.delete('*', 'foo')];
                    case 2:
                        _a.apply(void 0, [_b.sent()]).toEqual(0);
                        return [4 /*yield*/, Promise.all([
                                Cache.get('foo'),
                                Cache.get('bing'),
                                Cache.get('boo')
                            ])];
                    case 3:
                        keys = _b.sent();
                        expect(keys[0]).not.toBeUndefined();
                        expect(keys[1]).not.toBeUndefined();
                        expect(keys[2]).not.toBeUndefined();
                        return [2 /*return*/];
                }
            });
        }); });
        it('Should further filter the segmented keys if a key is provided', function () { return __awaiter(_this, void 0, void 0, function () {
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, Cache.set('foo', 'bar', -1, 'foo')];
                    case 1:
                        _c.sent();
                        return [4 /*yield*/, Cache.set('bing', 'bat', -1, 'foo')];
                    case 2:
                        _c.sent();
                        _a = expect;
                        return [4 /*yield*/, Cache.delete('bing', 'foo')];
                    case 3:
                        _a.apply(void 0, [_c.sent()]).toEqual(1);
                        _b = expect;
                        return [4 /*yield*/, Cache.get('foo')];
                    case 4:
                        _b.apply(void 0, [_c.sent()]).not.toBeUndefined();
                        return [2 /*return*/];
                }
            });
        }); });
        it('Should further filter the segmented keys if a wildcard has additional filtering', function () { return __awaiter(_this, void 0, void 0, function () {
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, Promise.all([
                            Cache.set('foo', 'bar', -1, 'foo'),
                            Cache.set('bing:bat', 'bat', -1, 'foo'),
                            Cache.set('bing:boo', 'boo', -1, 'foo')
                        ])];
                    case 1:
                        _c.sent();
                        _a = expect;
                        return [4 /*yield*/, Cache.delete('bing:*', 'foo')];
                    case 2:
                        _a.apply(void 0, [_c.sent()]).toEqual(2);
                        _b = expect;
                        return [4 /*yield*/, Cache.get('foo')];
                    case 3:
                        _b.apply(void 0, [_c.sent()]).not.toBeUndefined();
                        return [2 /*return*/];
                }
            });
        }); });
        it('Should automatically look for a segment if a wildcard key is passed without segments', function () { return __awaiter(_this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, Cache.set('bing:bat', 'bat', -1, 'bing')];
                    case 1:
                        _b.sent();
                        return [4 /*yield*/, Cache.set('bing:boo', 'boo', -1, 'bing')];
                    case 2:
                        _b.sent();
                        _a = expect;
                        return [4 /*yield*/, Cache.delete('bing:*')];
                    case 3:
                        _a.apply(void 0, [_b.sent()]).toEqual(2);
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('cleanup', function () {
        it('Should prune expired values from the cache', function () { return __awaiter(_this, void 0, void 0, function () {
            var results;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Promise.all([
                            Cache.set('test0', 'bar', -1, 'foo'),
                            Cache.set('test1', 'bar', 5, 'foo'),
                            Cache.set('test2', 'bar', 10, 'bar'),
                            Cache.set('test3', 'bar', 1000, 'baz')
                        ])];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(function () { return resolve(); }, 100); })];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, Cache.cleanup()];
                    case 3:
                        results = _a.sent();
                        expect(results).toEqual(2);
                        return [2 /*return*/];
                }
            });
        }); });
        describe.skip('Performance', function () {
            jest.setTimeout(5000); // 5s
            it('Should be performant on cleanup (10k records)', function () { return __awaiter(_this, void 0, void 0, function () {
                var record_count, flush_count, segment_count, start_time, segments, set, i, segment, expire, results;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            record_count = 1E4;
                            flush_count = 1E3;
                            segment_count = 3500;
                            start_time = new Date();
                            segments = Array.from(new Array(segment_count), function (_, ind) { return 'segment' + ind; });
                            set = [];
                            i = 0;
                            _a.label = 1;
                        case 1:
                            if (!(i < record_count)) return [3 /*break*/, 4];
                            segment = segments[lodash_1.default.random(0, segments.length)];
                            expire = 100;
                            set.push(Cache.set('test' + i, generate_bytes(1000), expire, segment));
                            if (!(set.length > flush_count || i === record_count - 1)) return [3 /*break*/, 3];
                            return [4 /*yield*/, Promise.all(set)];
                        case 2:
                            _a.sent();
                            set = [];
                            _a.label = 3;
                        case 3:
                            i += 1;
                            return [3 /*break*/, 1];
                        case 4:
                            +new Date() - +start_time; //?
                            // Wait to invalidate the cache
                            return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(function () { return resolve(); }, 100); })];
                        case 5:
                            // Wait to invalidate the cache
                            _a.sent(); //?.
                            return [4 /*yield*/, Cache.cleanup()]; //?.
                        case 6:
                            results = _a.sent() //?.
                            ;
                            results; //?
                            expect(results / record_count).toBeCloseTo(1, 1);
                            return [2 /*return*/];
                    }
                });
            }); });
        });
    });
});
//# sourceMappingURL=Redis.spec.js.map