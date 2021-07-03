"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var __spreadArray = (this && this.__spreadArray) || function (to, from) {
    for (var i = 0, il = from.length, j = to.length; i < il; i++, j++)
        to[j] = from[i];
    return to;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisCacheDriver = void 0;
var lodash_1 = __importDefault(require("lodash"));
var CacheDriver_1 = require("src/models/CacheDriver");
var lazy_exploration_1 = require("src/utils/lazy_exploration");
/** Redis Cache Driver */
var RedisCacheDriver = /** @class */ (function (_super) {
    __extends(RedisCacheDriver, _super);
    function RedisCacheDriver(client, options) {
        var _this = _super.call(this, options) || this;
        _this.count = 0;
        _this.failed = 0;
        _this.pipeline_index = 0;
        _this.pending = {};
        _this.cache_delimiter = '__JSON__';
        _this.client = client;
        _this.options = __assign({ segment_key_partial: 'segments', max_queue_size: 20, flush_interval: 5 }, options);
        _this.segment_cache_key = _this.generate_encoded_cache_key(_this.options.segment_key_partial);
        _this.pipeline = _this.client.pipeline();
        // Flush interval
        _this.flush_interval = setInterval(function () {
            var pipeline = _this.pipeline;
            _this.pipeline = _this.client.pipeline();
            var exec_promise = pipeline.exec();
            var pending_index = _this.pipeline_index++;
            _this.pending[pending_index] = exec_promise;
            exec_promise.then(function () {
                delete _this.pending[pending_index];
            });
        }, _this.options.flush_interval);
        client.on('end', function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.wait()];
                    case 1:
                        _a.sent();
                        clearTimeout(this.flush_interval);
                        if (this.queue_interval)
                            clearTimeout(this.queue_interval);
                        return [2 /*return*/];
                }
            });
        }); });
        return _this;
    }
    Object.defineProperty(RedisCacheDriver.prototype, "queue_size", {
        /** Returns the current queue size of request queue */
        get: function () {
            return this.pipeline.length;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(RedisCacheDriver.prototype, "is_pending", {
        /** Indicate if pipelines are pending response */
        get: function () {
            return Object.keys(this.pending).length > 0;
        },
        enumerable: false,
        configurable: true
    });
    /** Wait for pending queues to clear */
    RedisCacheDriver.prototype.wait = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Promise.all(Object.values(this.pending))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    RedisCacheDriver.prototype.$queue = function (command, params, cb) {
        var _this = this;
        var current_pipeline = this.pipeline;
        if (this.options.max_queue_size > 0) {
            if (this.queue_size >= this.options.max_queue_size) {
                this.pipeline = this.client.pipeline();
                var exec_promise = current_pipeline.exec();
                var pending_index_1 = this.pipeline_index++;
                this.pending[pending_index_1] = exec_promise;
                exec_promise.then(function () {
                    delete _this.pending[pending_index_1];
                });
            }
        }
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        var _a = this.pipeline, _b = command, func = _a[_b];
        if (cb)
            func.call.apply(func, __spreadArray(__spreadArray([this.pipeline], params), [cb]));
        else
            func.call.apply(func, __spreadArray([this.pipeline], params));
    };
    /** Get a cached value from redis */
    RedisCacheDriver.prototype.get = function (key) {
        return __awaiter(this, void 0, void 0, function () {
            var cache_key;
            var _this = this;
            return __generator(this, function (_a) {
                cache_key = this.generate_encoded_cache_key(key);
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        _this.$queue('get', [cache_key], function (err, result) {
                            if (err)
                                reject(err);
                            else
                                resolve(result);
                        });
                    }).then(function (cache_value) {
                        if (typeof cache_value === 'string') {
                            var is_json = cache_value.substring(0, _this.cache_delimiter.length) === _this.cache_delimiter;
                            if (is_json) {
                                return JSON.parse(cache_value.substring(_this.cache_delimiter.length));
                            }
                            return cache_value;
                        }
                        return undefined;
                    })];
            });
        });
    };
    /** Cache a value in redis */
    RedisCacheDriver.prototype.set = function (key, value, expiration, segments) {
        if (segments === void 0) { segments = []; }
        return __awaiter(this, void 0, void 0, function () {
            var cache_key, cache_segments, encoded_value, resolved;
            var _this = this;
            return __generator(this, function (_a) {
                if (!lodash_1.default.isNumber(expiration))
                    expiration = this.timeout;
                if (!lodash_1.default.isArray(segments))
                    segments = [segments];
                cache_key = this.generate_encoded_cache_key(key);
                cache_segments = this.parse_segments_to_cache(segments, value)
                    .map(function (segment) { return _this.generate_encoded_cache_key('segment', segment); });
                encoded_value = value;
                if (typeof value !== 'string') {
                    encoded_value = (this.cache_delimiter + JSON.stringify(value));
                }
                if (expiration > 0) {
                    resolved = new Promise(function (resolve, reject) {
                        _this.$queue('set', [cache_key, encoded_value, 'PX', expiration], function (err, result) {
                            if (err)
                                reject(err);
                            else
                                resolve(result);
                        });
                    });
                }
                else {
                    resolved = new Promise(function (resolve, reject) {
                        _this.$queue('set', [cache_key, encoded_value], function (err, result) {
                            if (err)
                                reject(err);
                            else
                                resolve(result);
                        });
                    });
                }
                // Set segments. We do not need to wait for these as they aren't necessary real-time
                cache_segments.forEach(function (segment_key) {
                    _this.$queue('sadd', [_this.segment_cache_key, segment_key]);
                    _this.$queue('sadd', [segment_key, cache_key]);
                });
                return [2 /*return*/, resolved.then(function (result) {
                        if (result === 'OK') {
                            _this.count += 1;
                            return true;
                        }
                        _this.failed += 1;
                        return false;
                    })];
            });
        });
    };
    /** Delete a value in the redis cache */
    RedisCacheDriver.prototype.delete = function (key, segments, allow_unsegmented_wildcard) {
        if (segments === void 0) { segments = []; }
        if (allow_unsegmented_wildcard === void 0) { allow_unsegmented_wildcard = false; }
        return __awaiter(this, void 0, void 0, function () {
            var is_wildcard_key, cache_key, status, targeted_segments, segment_results_promises;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (lodash_1.default.isBoolean(segments)) {
                            allow_unsegmented_wildcard = segments;
                            segments = [];
                        }
                        if (!lodash_1.default.isArray(segments))
                            segments = [segments];
                        key = this.flatten_cache_key(key);
                        is_wildcard_key = key.indexOf('*') !== -1;
                        if (!!is_wildcard_key) return [3 /*break*/, 2];
                        cache_key = this.generate_encoded_cache_key(key);
                        return [4 /*yield*/, this.client.unlink(cache_key)];
                    case 1:
                        status = _a.sent();
                        return [2 /*return*/, status ? 1 : 0];
                    case 2:
                        targeted_segments = segments;
                        if (targeted_segments.length === 0)
                            targeted_segments = this.parse_targeted_segments(key);
                        if (targeted_segments.length === 0 && allow_unsegmented_wildcard) {
                            return [2 /*return*/, this.flush()];
                        }
                        segment_results_promises = targeted_segments.map(function (targeted_segment) { return __awaiter(_this, void 0, void 0, function () {
                            var segment_key, segment_members, wildcard_segment_filter, matching_segment_members, remove_all, pipeline, results;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        segment_key = this.generate_encoded_cache_key('segment', targeted_segment);
                                        return [4 /*yield*/, this.client.smembers(segment_key)];
                                    case 1:
                                        segment_members = _a.sent();
                                        if (segment_members.length === 0)
                                            return [2 /*return*/, 0];
                                        wildcard_segment_filter = this.parse_wildcard_to_regex(key);
                                        matching_segment_members = segment_members.filter(function (segment) { return wildcard_segment_filter.test(segment); });
                                        remove_all = matching_segment_members.length === segment_members.length;
                                        pipeline = this.client.pipeline();
                                        if (remove_all) {
                                            pipeline.srem(this.segment_cache_key, segment_key);
                                            pipeline.unlink(segment_key);
                                        }
                                        else {
                                            pipeline.srem.apply(pipeline, __spreadArray([segment_key], matching_segment_members));
                                        }
                                        results = new Promise(function (resolve) {
                                            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                                            // @ts-ignore
                                            pipeline.unlink.apply(pipeline, __spreadArray(__spreadArray([], matching_segment_members), [function (err, result) {
                                                    if (err)
                                                        resolve(0);
                                                    else
                                                        resolve(result);
                                                }]));
                                        });
                                        return [4 /*yield*/, pipeline.exec()];
                                    case 2:
                                        _a.sent();
                                        return [2 /*return*/, results];
                                }
                            });
                        }); });
                        // Sum the results
                        return [2 /*return*/, Promise.all(segment_results_promises).then(function (results) {
                                var delete_count = results.reduce(function (l, r) { return l + r; }, 0);
                                _this.count -= delete_count;
                                return delete_count;
                            })];
                }
            });
        });
    };
    RedisCacheDriver.prototype.flush = function () {
        return __awaiter(this, void 0, void 0, function () {
            var cached_keys, cursor, _a, next_cursor, scan_keys, delete_count;
            var _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        cached_keys = [];
                        cursor = 0;
                        _c.label = 1;
                    case 1: return [4 /*yield*/, this.client.scan(cursor, 'MATCH', '*')];
                    case 2:
                        _a = _c.sent(), next_cursor = _a[0], scan_keys = _a[1];
                        cursor = +next_cursor;
                        cached_keys.push.apply(cached_keys, scan_keys);
                        _c.label = 3;
                    case 3:
                        if (cursor > 0) return [3 /*break*/, 1];
                        _c.label = 4;
                    case 4:
                        if (!(cached_keys.length > 0)) return [3 /*break*/, 6];
                        return [4 /*yield*/, (_b = this.client).unlink.apply(_b, cached_keys)];
                    case 5:
                        delete_count = _c.sent();
                        this.count -= delete_count;
                        return [2 /*return*/, delete_count];
                    case 6: return [2 /*return*/, 0];
                }
            });
        });
    };
    RedisCacheDriver.prototype.cleanup = function () {
        return __awaiter(this, void 0, void 0, function () {
            var pipeline, segments, removed;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        pipeline = this.client.pipeline();
                        return [4 /*yield*/, this.client.smembers(this.segment_cache_key)];
                    case 1:
                        segments = _a.sent();
                        removed = 0;
                        return [4 /*yield*/, lazy_exploration_1.lazy_exploration(lodash_1.default.shuffle(segments), function (segment_key) { return __awaiter(_this, void 0, void 0, function () {
                                var removal, cache_keys, exists_pipeline, _i, cache_keys_1, cache_key, exists_results, i, cache_key, exists;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            removal = [];
                                            return [4 /*yield*/, this.client.smembers(segment_key)];
                                        case 1:
                                            cache_keys = _a.sent();
                                            exists_pipeline = this.client.pipeline();
                                            for (_i = 0, cache_keys_1 = cache_keys; _i < cache_keys_1.length; _i++) {
                                                cache_key = cache_keys_1[_i];
                                                exists_pipeline.exists(cache_key);
                                            }
                                            return [4 /*yield*/, exists_pipeline.exec()];
                                        case 2:
                                            exists_results = _a.sent();
                                            for (i = 0; i < exists_results.length; i += 1) {
                                                cache_key = cache_keys[i];
                                                exists = exists_results[i][1];
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
                                                pipeline.srem.apply(pipeline, __spreadArray([segment_key], removal));
                                            }
                                            else {
                                                return [2 /*return*/, true];
                                            }
                                            removed += removal.length;
                                            return [2 /*return*/, false];
                                    }
                                });
                            }); }, 100, 25)];
                    case 2:
                        _a.sent();
                        this.count -= removed;
                        // Clear everything we've queued
                        return [4 /*yield*/, pipeline.exec()];
                    case 3:
                        // Clear everything we've queued
                        _a.sent();
                        return [2 /*return*/, removed];
                }
            });
        });
    };
    return RedisCacheDriver;
}(CacheDriver_1.CacheDriver));
exports.RedisCacheDriver = RedisCacheDriver;
//# sourceMappingURL=redis.js.map