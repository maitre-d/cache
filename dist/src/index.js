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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisDriver = exports.MemoryDriver = exports.Cache = void 0;
var lodash_1 = __importDefault(require("lodash"));
var memory_1 = require("src/drivers/memory");
Object.defineProperty(exports, "MemoryDriver", { enumerable: true, get: function () { return memory_1.MemoryCacheDriver; } });
var redis_1 = require("src/drivers/redis");
Object.defineProperty(exports, "RedisDriver", { enumerable: true, get: function () { return redis_1.RedisCacheDriver; } });
/** Cache manager responsible for controlling data flow between registered drivers */
var Cache = /** @class */ (function () {
    function Cache(options, drivers) {
        if (drivers === void 0) { drivers = []; }
        this.drivers = drivers;
        this.options = __assign(__assign({ omit_replication: [] }, options), { driver_methods: __assign({ default: 'omit', fetch: [], set: [], delete: [], flush: [], cleanup: [] }, (options.driver_methods || {})) });
    }
    /** Get a list of drivers which are active for the specified action */
    Cache.prototype.get_active = function (action) {
        var _this = this;
        return this.drivers.filter(function (driver) {
            var drivers_list = _this.options.driver_methods[action];
            var driver_included = drivers_list.includes(driver.name);
            if (_this.options.driver_methods.default === 'omit') {
                return !driver_included;
            }
            return driver_included;
        });
    };
    /** Add a driver to be managed */
    Cache.prototype.add = function (driver) {
        this.drivers.push(driver);
    };
    Cache.prototype.fetch = function (key, cb, options) {
        return __awaiter(this, void 0, void 0, function () {
            var value, misses, drivers, _i, drivers_1, driver;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        options = __assign({ segments: [], force_new: false }, options);
                        misses = [];
                        drivers = this.get_active('fetch');
                        if (!!options.force_new) return [3 /*break*/, 5];
                        _i = 0, drivers_1 = drivers;
                        _a.label = 1;
                    case 1:
                        if (!(_i < drivers_1.length)) return [3 /*break*/, 4];
                        driver = drivers_1[_i];
                        return [4 /*yield*/, Promise.all([driver.get(key)])];
                    case 2:
                        value = (_a.sent())[0];
                        if (typeof value === 'undefined')
                            misses.push(driver);
                        else
                            return [3 /*break*/, 4];
                        _a.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4: return [3 /*break*/, 6];
                    case 5:
                        misses.push.apply(misses, drivers);
                        _a.label = 6;
                    case 6:
                        if (!(typeof value === 'undefined')) return [3 /*break*/, 8];
                        return [4 /*yield*/, cb()];
                    case 7:
                        value = _a.sent();
                        _a.label = 8;
                    case 8:
                        // NOTE: We do not need to wait for the value to actually be set
                        Promise.all(misses.map(function (driver) { return driver.set(key, value, options.timeout, options.segments); })).then();
                        return [2 /*return*/, value];
                }
            });
        });
    };
    /** Fetch a value from the active drivers */
    Cache.prototype.get = function (key) {
        return __awaiter(this, void 0, void 0, function () {
            var drivers, value, _i, drivers_2, driver;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        drivers = this.get_active('fetch');
                        _i = 0, drivers_2 = drivers;
                        _a.label = 1;
                    case 1:
                        if (!(_i < drivers_2.length)) return [3 /*break*/, 4];
                        driver = drivers_2[_i];
                        return [4 /*yield*/, Promise.all([driver.get(key)])];
                    case 2:
                        value = (_a.sent())[0];
                        if (typeof value !== 'undefined')
                            return [3 /*break*/, 4];
                        _a.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4: return [2 /*return*/, value];
                }
            });
        });
    };
    Cache.prototype.set = function (key, value, expiration, segments) {
        if (expiration === void 0) { expiration = -1; }
        if (segments === void 0) { segments = []; }
        return __awaiter(this, void 0, void 0, function () {
            var drivers;
            return __generator(this, function (_a) {
                drivers = this.get_active('set');
                return [2 /*return*/, Promise.all(drivers.map(function (driver) {
                        return driver.set(key, value, expiration, segments);
                    }))
                        .then(function (results) {
                        return results.every(function (status) { return status; });
                    })];
            });
        });
    };
    Cache.prototype.delete = function (key, segments) {
        if (segments === void 0) { segments = []; }
        return __awaiter(this, void 0, void 0, function () {
            var drivers;
            return __generator(this, function (_a) {
                if (!lodash_1.default.isArray(segments))
                    segments = [segments];
                drivers = this.get_active('delete');
                return [2 /*return*/, Promise.all(drivers.map(function (driver) {
                        return driver.delete(key, segments);
                    })).then(function (results) { return Math.max.apply(Math, results); })];
            });
        });
    };
    Cache.prototype.cleanup = function () {
        return __awaiter(this, void 0, void 0, function () {
            var drivers;
            return __generator(this, function (_a) {
                drivers = this.get_active('cleanup');
                return [2 /*return*/, Promise.all(drivers.map(function (driver) { return driver.cleanup(); })).then(function (results) { return Math.max.apply(Math, results); })];
            });
        });
    };
    Cache.prototype.flush = function () {
        return __awaiter(this, void 0, void 0, function () {
            var drivers;
            return __generator(this, function (_a) {
                drivers = this.get_active('flush');
                return [2 /*return*/, Promise.all(drivers.map(function (driver) { return driver.flush(); })).then(function (results) { return Math.max.apply(Math, results); })];
            });
        });
    };
    return Cache;
}());
exports.Cache = Cache;
//# sourceMappingURL=index.js.map