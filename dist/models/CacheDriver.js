"use strict";
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
const lodash_1 = __importDefault(require("lodash"));
const string_hash_1 = __importDefault(require("string-hash"));
class CacheDriver {
    constructor(options) {
        this._id = Math.random().toString(36).substr(2, 9);
        this.name = options.name;
        this.timeout = options.timeout;
        this.namespace = options.namespace || 'cache';
        this.omit_partials = options.omit_partials || [];
    }
    flatten_cache_key(partials) {
        if (!Array.isArray(partials))
            partials = [partials];
        return partials.reduce((encoded, partial) => {
            this.omit_partials.forEach((omit) => {
                if (lodash_1.default.has(partial, omit)) {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const _a = partial, _b = omit, _delete = _a[_b], withoutOmit = __rest(_a, [typeof _b === "symbol" ? _b : _b + ""]);
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
    }
    /** Encode keys with namespace information */
    generate_encoded_cache_key(...partials_all) {
        return this.namespace + ':' + this.flatten_cache_key(lodash_1.default.flatten(partials_all));
    }
    /** Parse segments options into segment strings for segment caching */
    parse_segments_to_cache(segments, value) {
        return segments.reduce((parsed, segment) => {
            if (lodash_1.default.isFunction(segment)) {
                const resolved = segment(value);
                if (Array.isArray(resolved))
                    parsed.push(...resolved);
                else
                    parsed.push(resolved);
            }
            else if (Array.isArray(segment))
                parsed.push(...segment);
            else
                parsed.push(segment);
            return parsed;
        }, [])
            .filter((segment) => !lodash_1.default.isNil(segment));
    }
    parse_targeted_segments(key) {
        const possible_segments = key.substring(0, key.indexOf('*'))
            .split(':')
            .filter((partial) => partial.length > 0);
        return possible_segments.reduce((segments, segment) => {
            if (segments.length > 0) {
                const last_segment = segments[segments.length - 1];
                segments.push([last_segment, segment].join(':'));
            }
            else
                segments.push(segment);
            return segments;
        }, [])
            .filter((segment) => segment.length > 0);
    }
    parse_wildcard_to_regex(wildcard_string) {
        const escaped_wildcard_string = lodash_1.default.escapeRegExp(wildcard_string).replace(/\\\*/g, '(.+)') + '$';
        return new RegExp('^' + this.namespace + ':' + escaped_wildcard_string);
    }
}
exports.CacheDriver = CacheDriver;
//# sourceMappingURL=CacheDriver.js.map