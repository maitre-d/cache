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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryCacheDriver = exports.MemoryCacheCleanupStrategies = void 0;
var lodash_1 = __importDefault(require("lodash"));
var object_sizeof_1 = __importDefault(require("object-sizeof"));
var CacheDriver_1 = require("src/models/CacheDriver");
var lazy_exploration_1 = require("src/utils/lazy_exploration");
var parse_to_bytes_1 = require("src/utils/parse_to_bytes");
var MemoryCacheCleanupStrategies;
(function (MemoryCacheCleanupStrategies) {
    MemoryCacheCleanupStrategies["Least_Accessed"] = "la";
    MemoryCacheCleanupStrategies["Random"] = "random";
    MemoryCacheCleanupStrategies["Flush"] = "flush";
})(MemoryCacheCleanupStrategies = exports.MemoryCacheCleanupStrategies || (exports.MemoryCacheCleanupStrategies = {}));
var MemoryCache = /** @class */ (function () {
    function MemoryCache() {
        this.size = 0;
        this.access_counter = {};
        this.segments = {};
        this.values = {};
    }
    return MemoryCache;
}());
var MemoryCacheDriver = /** @class */ (function (_super) {
    __extends(MemoryCacheDriver, _super);
    function MemoryCacheDriver(options) {
        var _this = _super.call(this, options) || this;
        options.max_cache_size = parse_to_bytes_1.parse_to_bytes(options.max_cache_size);
        options.max_record_size = parse_to_bytes_1.parse_to_bytes(options.max_record_size);
        options.minimum_prune_size = parse_to_bytes_1.parse_to_bytes(options.minimum_prune_size);
        _this.options = options;
        _this._cache = new MemoryCache();
        return _this;
    }
    Object.defineProperty(MemoryCacheDriver.prototype, "free", {
        get: function () { return this.options.max_cache_size - this.size; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(MemoryCacheDriver.prototype, "size", {
        get: function () { return this._cache.size; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(MemoryCacheDriver.prototype, "count", {
        get: function () { return Object.keys(this._cache.values).length; },
        enumerable: false,
        configurable: true
    });
    /** Remove a value from the cache via the cache_key */
    MemoryCacheDriver.prototype._remove = function (cache_key) {
        var _this = this;
        var status = false;
        var cached_value = this._cache.values[cache_key];
        if (cached_value) {
            status = lodash_1.default.unset(this._cache.values, cache_key);
            lodash_1.default.unset(this._cache.access_counter, cache_key);
            this._cache.size -= cached_value.size;
            // Prune the key from the segments it references
            cached_value.segments.forEach(function (segment) {
                var index = _this._cache.segments[segment].indexOf(cache_key);
                if (index >= 0)
                    _this._cache.segments[segment].splice(index, 1);
            });
        }
        return status;
    };
    MemoryCacheDriver.prototype.prune = function (required_space, strategy) {
        if (strategy === void 0) { strategy = this.options.strategy; }
        var _a = this._cache, cache = _a.values, access_counter = _a.access_counter;
        var freed = 0;
        var ordered_access_keys;
        var cache_keys;
        switch (strategy) {
            case MemoryCacheCleanupStrategies.Least_Accessed:
                ordered_access_keys = Object.keys(access_counter).sort(function (a, b) {
                    return access_counter[a] - access_counter[b];
                });
                while (freed < required_space && ordered_access_keys.length > 0) {
                    var cache_key_to_prune = ordered_access_keys.pop();
                    var cached_value = cache[cache_key_to_prune];
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
                    var random_index = Math.floor(Math.random() * cache_keys.length);
                    var cache_key_to_prune = cache_keys.splice(random_index, 1)[0];
                    var cached_value = cache[cache_key_to_prune];
                    if (this._remove(cache_key_to_prune)) {
                        freed += cached_value.size;
                    }
                }
        }
        return freed;
    };
    MemoryCacheDriver.prototype.get = function (key) {
        var cache_key = this.generate_encoded_cache_key(key);
        var cached_value = this._cache.values[cache_key];
        if (cached_value) {
            var current_time = +new Date();
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
    };
    MemoryCacheDriver.prototype.set = function (key, value, expiration, segments) {
        var _this = this;
        if (segments === void 0) { segments = []; }
        if (!lodash_1.default.isNumber(expiration))
            expiration = this.timeout;
        if (!lodash_1.default.isArray(segments))
            segments = [segments];
        var cache_key = this.generate_encoded_cache_key(key);
        var cache_segments = this.parse_segments_to_cache(segments, value)
            .map(function (segment) { return _this.generate_encoded_cache_key('segment', segment); });
        var cached_value_size = object_sizeof_1.default(value);
        if (cached_value_size > this.options.max_record_size)
            return false;
        var pruned = false;
        var cleaned = false;
        var cache_size = this._cache.size;
        while (cache_size + cached_value_size > this.options.max_cache_size) {
            // Cleanup the cache first
            if (!cleaned) {
                this.cleanup();
                cleaned = true;
            }
            // Next prune if needed
            else if (!pruned) {
                var required_space = Math.max((cache_size + cached_value_size) - this.options.max_cache_size + 1, this.options.minimum_prune_size);
                this.prune(required_space);
                pruned = true;
            }
            // We have done what we can. This value can't be set at this time
            else {
                var required_space = Math.max((cache_size + cached_value_size) - this.options.max_cache_size + 1, this.options.minimum_prune_size);
                this.prune(required_space, MemoryCacheCleanupStrategies.Random);
                return false;
            }
            cache_size = this._cache.size;
        }
        var cache_value = {
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
        cache_segments.forEach(function (segment_key) {
            if (!lodash_1.default.isArray(_this._cache.segments[segment_key])) {
                _this._cache.segments[segment_key] = [];
            }
            _this._cache.segments[segment_key].push(cache_key);
        });
        return true;
    };
    MemoryCacheDriver.prototype.delete = function (key, segments) {
        var _this = this;
        if (segments === void 0) { segments = []; }
        if (!lodash_1.default.isArray(segments))
            segments = [segments];
        key = this.flatten_cache_key(key);
        var is_wildcard_key = key.indexOf('*') !== -1;
        if (!is_wildcard_key) {
            var cache_key = this.generate_encoded_cache_key(key);
            var status = this._remove(cache_key);
            return status ? 1 : 0;
        }
        var targeted_segments = segments;
        if (targeted_segments.length === 0)
            targeted_segments = this.parse_targeted_segments(key);
        // No targeted segments, so wildcard matches the entire cache
        // EG. '*'
        if (targeted_segments.length === 0) {
            return this.flush();
        }
        // We have segments to crawl through
        return targeted_segments.reduce(function (removed, targeted_segment) {
            var segment_key = _this.generate_encoded_cache_key('segment', targeted_segment);
            if (!lodash_1.default.has(_this._cache.segments, segment_key))
                return removed;
            var segment_members = _this._cache.segments[segment_key];
            var wildcard_segment_filter = _this.parse_wildcard_to_regex(key);
            var matching_segment_members = segment_members.filter(function (segment) { return wildcard_segment_filter.test(segment); });
            var remove_all = matching_segment_members.length === segment_members.length;
            // We remove everything that matches within the set
            matching_segment_members.forEach(function (cache_key) {
                var status = _this._remove(cache_key);
                if (status)
                    removed += 1;
                if (!remove_all)
                    lodash_1.default.remove(_this._cache.segments[segment_key], cache_key);
            });
            if (remove_all)
                lodash_1.default.unset(_this._cache.segments, segment_key);
            return removed;
        }, 0);
    };
    MemoryCacheDriver.prototype.cleanup = function () {
        var _this = this;
        var current_timestamp = +new Date();
        var failures = lazy_exploration_1.lazy_exploration(Object.keys(this._cache.values), function (cache_key) {
            var cached_value = _this._cache.values[cache_key];
            if (cached_value.expiration !== -1 && current_timestamp > cached_value.expiration) {
                _this._remove(cache_key);
                return false;
            }
            return true;
        }, 20, 5).failures;
        return failures;
    };
    MemoryCacheDriver.prototype.flush = function () {
        var key_count = Object.keys(this._cache.values).length;
        this._cache = new MemoryCache();
        return key_count;
    };
    MemoryCacheDriver.CleanupStrategies = MemoryCacheCleanupStrategies;
    return MemoryCacheDriver;
}(CacheDriver_1.CacheDriver));
exports.MemoryCacheDriver = MemoryCacheDriver;
//# sourceMappingURL=memory.js.map