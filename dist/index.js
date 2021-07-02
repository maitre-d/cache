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
exports.RedisDriver = exports.MemoryDriver = exports.Cache = void 0;
const lodash_1 = __importDefault(require("lodash"));
const memory_1 = require("src/drivers/memory");
Object.defineProperty(exports, "MemoryDriver", { enumerable: true, get: function () { return memory_1.MemoryCacheDriver; } });
const redis_1 = require("src/drivers/redis");
Object.defineProperty(exports, "RedisDriver", { enumerable: true, get: function () { return redis_1.RedisCacheDriver; } });
/** Cache manager responsible for controlling data flow between registered drivers */
class Cache {
    constructor(options, drivers = []) {
        this.drivers = drivers;
        this.options = Object.assign(Object.assign({ omit_replication: [] }, options), { driver_methods: Object.assign({ default: 'omit', fetch: [], set: [], delete: [], flush: [] }, (options.driver_methods || {})) });
    }
    /** Get a list of drivers which are active for the specified action */
    get_active(action) {
        return this.drivers.filter((driver) => {
            const drivers_list = this.options.driver_methods[action];
            const driver_included = drivers_list.includes(driver.name);
            if (this.options.driver_methods.default === 'omit') {
                return !driver_included;
            }
            return driver_included;
        });
    }
    /** Add a driver to be managed */
    add(driver) {
        this.drivers.push(driver);
    }
    get(key, cb, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const cache_options = Object.assign({ segments: [], force_new: false }, options);
            let value;
            const misses = [];
            const drivers = this.get_active('fetch');
            if (!cache_options.force_new) {
                for (const driver of drivers) {
                    [value] = yield Promise.all([driver.fetch(key)]);
                    if (typeof value === 'undefined')
                        misses.push(driver);
                    else
                        break;
                }
            }
            else
                misses.push(...drivers);
            if (typeof value === 'undefined') {
                value = yield cb();
            }
            // NOTE: We do not need to wait for the value to actually be set
            Promise.all(misses.map((driver) => driver.set(key, value, options.timeout, options.segments))).then();
            return value;
        });
    }
    /** Fetch a value from the active drivers */
    fetch(key) {
        return __awaiter(this, void 0, void 0, function* () {
            const drivers = this.get_active('fetch');
            let value;
            for (const driver of drivers) {
                [value] = yield Promise.all([driver.fetch(key)]);
                if (typeof value !== 'undefined')
                    break;
            }
            return value;
        });
    }
    set(key, value, expiration = -1, segments = []) {
        return __awaiter(this, void 0, void 0, function* () {
            const drivers = this.get_active('set');
            return Promise.all(drivers.map((driver) => driver.set(key, value, expiration, segments)))
                .then((results) => results.every((status) => status));
        });
    }
    delete(key, segments = []) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!lodash_1.default.isArray(segments))
                segments = [segments];
            const drivers = this.get_active('delete');
            return Promise.all(drivers.map((driver) => driver.delete(key, segments))).then((results) => Math.max(...results));
        });
    }
    flush() {
        return __awaiter(this, void 0, void 0, function* () {
            const drivers = this.get_active('flush');
            return Promise.all(drivers.map((driver) => driver.flush())).then((results) => Math.max(...results));
        });
    }
}
exports.Cache = Cache;
//# sourceMappingURL=index.js.map