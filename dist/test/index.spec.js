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
var async_1 = __importDefault(require("async"));
var uuid_1 = require("uuid");
var index_1 = require("src/index");
var memory_1 = require("src/drivers/memory");
var client = new ioredis_1.default();
var RedisCache = new index_1.RedisDriver(client, {
    name: 'test',
    timeout: 10,
    flush_interval: 5,
    max_queue_size: 100
});
var MemoryCache = new index_1.MemoryDriver({
    name: 'memory',
    timeout: -1,
    strategy: memory_1.MemoryCacheCleanupStrategies.Least_Accessed,
    max_cache_size: '100mb',
    max_record_size: '1kb',
    minimum_prune_size: 100,
});
var Cache = new index_1.Cache({
    name: 'cache',
    driver_methods: {
        default: 'omit'
    }
}, [MemoryCache, RedisCache]);
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
    describe('get', function () {
        it('Should set the cache value using a callback function if unset.', function () {
            return __awaiter(this, void 0, void 0, function () {
                var key, value, cb, result;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            key = 'foo';
                            value = 'bar';
                            cb = jest.fn(function () { return value; });
                            return [4 /*yield*/, Cache.fetch(key, cb, { timeout: 1, force_new: false })];
                        case 1:
                            result = _a.sent();
                            expect(result).toEqual(value);
                            expect(cb.mock.calls.length).toBe(1);
                            return [2 /*return*/];
                    }
                });
            });
        });
    });
    describe('set', function () {
        it('Should return true to indicate a value was set in the cache', function () {
            return __awaiter(this, void 0, void 0, function () {
                var key, _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            key = 'foo';
                            _a = expect;
                            return [4 /*yield*/, Cache.set(key, 'bar', 1)];
                        case 1:
                            _a.apply(void 0, [_b.sent()]).toBeTrue();
                            return [2 /*return*/];
                    }
                });
            });
        });
    });
    describe('delete', function () {
        it('Should use the segment to delete wildcard keys if possible', function () {
            return __awaiter(this, void 0, void 0, function () {
                var segment, iterations, deleted;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            segment = 'foo_bar';
                            iterations = 5;
                            return [4 /*yield*/, async_1.default.times(iterations, function () { return __awaiter(_this, void 0, void 0, function () {
                                    var id, key;
                                    return __generator(this, function (_a) {
                                        id = uuid_1.v4();
                                        key = segment + ':' + id;
                                        return [2 /*return*/, Cache.set(key, id, -1, segment)];
                                    });
                                }); })];
                        case 1:
                            _a.sent();
                            return [4 /*yield*/, Cache.delete(segment + ':*')];
                        case 2:
                            deleted = _a.sent();
                            expect(deleted).toEqual(iterations);
                            return [2 /*return*/];
                    }
                });
            });
        });
        it('Should further filter the segmented keys if a wildcard has additional filtering', function () {
            return __awaiter(this, void 0, void 0, function () {
                var segment, iterations, partialID, deleted;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            segment = 'foo_bar';
                            iterations = 5;
                            partialID = 'baz';
                            return [4 /*yield*/, Promise.all(Array.from(new Array(iterations), function (_, ind) {
                                    var id = uuid_1.v4();
                                    var fuzzy = (ind % 2 > 0) ? 'bar' : 'bax';
                                    var key = segment + ':' + partialID + ':' + id + ':' + fuzzy;
                                    return Cache.set(key, id, 20, [segment]);
                                }))];
                        case 1:
                            _a.sent();
                            return [4 /*yield*/, Cache.delete(segment + ':' + partialID + ':*:bar')];
                        case 2:
                            deleted = _a.sent();
                            expect(deleted).toEqual(2);
                            return [2 /*return*/];
                    }
                });
            });
        });
        it('Should delete non-wildcard keys', function () {
            return __awaiter(this, void 0, void 0, function () {
                var key, deleted;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            key = 'foo:bar:baz:1251';
                            return [4 /*yield*/, Cache.set(key, 1251, 20)];
                        case 1:
                            _a.sent();
                            return [4 /*yield*/, Cache.delete(key)];
                        case 2:
                            deleted = _a.sent();
                            expect(deleted).toEqual(1);
                            return [2 /*return*/];
                    }
                });
            });
        });
        it('Should delete nothing if nothing matches', function () {
            return __awaiter(this, void 0, void 0, function () {
                var segment, deleted;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            segment = 'foo:bar:baz';
                            return [4 /*yield*/, Cache.delete('bing:bat:biz:baz:*:bar', segment)];
                        case 1:
                            deleted = _a.sent();
                            expect(deleted).toEqual(0);
                            return [2 /*return*/];
                    }
                });
            });
        });
        it('Should remove all keys in a target segment with wildcard as key', function () {
            return __awaiter(this, void 0, void 0, function () {
                var segment, altKeys, iterations, partialID, deleted;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            segment = 'foo:bar:baz';
                            altKeys = 'bing:bat:biz'.split(':');
                            iterations = 5;
                            partialID = 'baz';
                            return [4 /*yield*/, Promise.all(Array.from(new Array(iterations), function () {
                                    var id = uuid_1.v4();
                                    var fuzzy = 'bar';
                                    var altKey = altKeys[Math.floor(Math.random() * (altKeys.length - 1))];
                                    var key = altKey + ':' + partialID + ':' + id + ':' + fuzzy;
                                    return Cache.set(key, id, -1, segment);
                                }))];
                        case 1:
                            _a.sent();
                            return [4 /*yield*/, Cache.delete('*', segment)];
                        case 2:
                            deleted = _a.sent();
                            expect(deleted).toEqual(iterations); // +1 because we expect the segment to be removed too
                            return [2 /*return*/];
                    }
                });
            });
        });
    });
    describe('Performance', function () {
        var segments;
        beforeEach(function () { return __awaiter(_this, void 0, void 0, function () {
            var segment_partials;
            return __generator(this, function (_a) {
                segment_partials = Array.from(new Array(100), function (_, ind) { return ind; });
                segments = Array.from(new Array(5000), function (el, ind) {
                    var partial;
                    if (Math.random() > 0.8) {
                        var ind_1 = lodash_1.default.random(0, segment_partials.length);
                        partial = segment_partials[ind_1];
                    }
                    return ['segment', partial, ind].join(':');
                });
                return [2 /*return*/];
            });
        }); });
        it('Should be performant on cleanup', function () { return __awaiter(_this, void 0, void 0, function () {
            var n, set, defined_segments, start, i, segment, redis_results, memory_results;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        n = 1E5;
                        set = [];
                        defined_segments = [];
                        start = new Date();
                        for (i = 0; i < n; i += 1) {
                            segment = void 0;
                            if (Math.random() > 0.2) {
                                segment = segments[lodash_1.default.random(0, segments.length)];
                                defined_segments.push(segment);
                            }
                            set.push(Cache.set('test:' + i, generate_bytes(2), 100, segment)); //?.
                        }
                        +new Date() - +start; //?
                        return [4 /*yield*/, Promise.all(set)];
                    case 1:
                        _a.sent(); //?.
                        // Wait 100ms
                        return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(function () { return resolve(); }, 100); })];
                    case 2:
                        // Wait 100ms
                        _a.sent();
                        expect(MemoryCache.count).toEqual(n);
                        expect(RedisCache.count).toBeGreaterThan(n * 0.8);
                        return [4 /*yield*/, RedisCache.cleanup()];
                    case 3:
                        redis_results = _a.sent();
                        return [4 /*yield*/, MemoryCache.cleanup()];
                    case 4:
                        memory_results = _a.sent();
                        expect(memory_results).toEqual(n);
                        expect(redis_results).toBeGreaterThan(n * 0.7);
                        expect(RedisCache.failed).toEqual(0);
                        expect(RedisCache.count).toBeLessThan(n * 0.3);
                        expect(MemoryCache.count).toEqual(0);
                        return [2 /*return*/];
                }
            });
        }); }, 40000);
    });
});
//# sourceMappingURL=index.spec.js.map