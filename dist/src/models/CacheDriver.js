"use strict";
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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheDriver = void 0;
var lodash_1 = __importDefault(require("lodash"));
var string_hash_1 = __importDefault(require("string-hash"));
var CacheDriver = /** @class */ (function () {
    function CacheDriver(options) {
        this._id = Math.random().toString(36).substr(2, 9);
        this.name = options.name;
        this.timeout = options.timeout;
        this.namespace = options.namespace || 'cache';
        this.omit_partials = options.omit_partials || [];
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    CacheDriver.prototype.get = function (key) {
        throw new Error('Not implemented');
    };
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    CacheDriver.prototype.set = function (key, value, expiration, segments) {
        throw new Error('Not implemented');
    };
    CacheDriver.prototype.fetch = function (key, cb, options) {
        if (options === void 0) { options = {}; }
        return __awaiter(this, void 0, void 0, function () {
            var value;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        options = __assign({ timeout: this.timeout, force_new: false, segments: [] }, options);
                        if (!!options.force_new) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.get(key)];
                    case 1:
                        value = _a.sent();
                        _a.label = 2;
                    case 2:
                        if (!(typeof value === 'undefined')) return [3 /*break*/, 4];
                        return [4 /*yield*/, cb()];
                    case 3:
                        value = _a.sent();
                        // We don't need to wait for the value to be set
                        this.set(key, value, options.timeout, options.segments);
                        _a.label = 4;
                    case 4: return [2 /*return*/, value];
                }
            });
        });
    };
    CacheDriver.prototype.flatten_cache_key = function (partials) {
        var _this = this;
        if (!Array.isArray(partials))
            partials = [partials];
        return partials.reduce(function (encoded, partial) {
            _this.omit_partials.forEach(function (omit) {
                if (lodash_1.default.has(partial, omit)) {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    var _a = partial, _b = omit, _delete = _a[_b], withoutOmit = __rest(_a, [typeof _b === "symbol" ? _b : _b + ""]);
                    partial = withoutOmit;
                }
            });
            if (lodash_1.default.isString(partial))
                encoded.push(partial);
            else if (['number', 'boolean'].includes(typeof partial))
                encoded.push('' + partial);
            else
                encoded.push('' + string_hash_1.default(JSON.stringify(partial)));
            return encoded;
        }, []).join(':');
    };
    /** Encode keys with namespace information */
    CacheDriver.prototype.generate_encoded_cache_key = function () {
        var partials_all = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            partials_all[_i] = arguments[_i];
        }
        return this.namespace + ':' + this.flatten_cache_key(lodash_1.default.flatten(partials_all));
    };
    /** Parse segments options into segment strings for segment caching */
    CacheDriver.prototype.parse_segments_to_cache = function (segments, value) {
        return segments.reduce(function (parsed, segment) {
            if (lodash_1.default.isFunction(segment)) {
                var resolved = segment(value);
                if (Array.isArray(resolved))
                    parsed.push.apply(parsed, resolved);
                else
                    parsed.push(resolved);
            }
            else if (Array.isArray(segment))
                parsed.push.apply(parsed, segment);
            else
                parsed.push(segment);
            return parsed;
        }, [])
            .filter(function (segment) { return !lodash_1.default.isNil(segment); });
    };
    CacheDriver.prototype.parse_targeted_segments = function (key) {
        var possible_segments = key.substring(0, key.indexOf('*'))
            .split(':')
            .filter(function (partial) { return partial.length > 0; });
        return possible_segments.reduce(function (segments, segment) {
            if (segments.length > 0) {
                var last_segment = segments[segments.length - 1];
                segments.push([last_segment, segment].join(':'));
            }
            else
                segments.push(segment);
            return segments;
        }, [])
            .filter(function (segment) { return segment.length > 0; });
    };
    CacheDriver.prototype.parse_wildcard_to_regex = function (wildcard_string) {
        var escaped_wildcard_string = lodash_1.default.escapeRegExp(wildcard_string).replace(/\\\*/g, '(.+)') + '$';
        return new RegExp('^' + this.namespace + ':' + escaped_wildcard_string);
    };
    return CacheDriver;
}());
exports.CacheDriver = CacheDriver;
//# sourceMappingURL=CacheDriver.js.map