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
Object.defineProperty(exports, "__esModule", { value: true });
exports.lazy_exploration = void 0;
function shuffle(array) {
    var _a;
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        _a = [array[j], array[i]], array[i] = _a[0], array[j] = _a[1];
    }
}
/** Explore a set until the minimum_trials is met or we exceed the retry interval */
function lazy_exploration(set, 
/** Callback, false indicates failure */
test, min_trials, failure_threshold) {
    var _this = this;
    if (min_trials === void 0) { min_trials = 20; }
    if (failure_threshold === void 0) { failure_threshold = 5; }
    var trials = set.slice();
    shuffle(trials); //?.
    var is_async_pending;
    var failures = 0;
    var samples = 0;
    var i = 0;
    var e = 0;
    while (i < min_trials && trials.length > 0) {
        var random_key = trials.pop();
        var status = test(random_key);
        if (status instanceof Promise) {
            is_async_pending = status;
            break;
        }
        if (!status) {
            e += 1;
            failures += 1;
        }
        if (e > failure_threshold) {
            i = 0;
            e = 0;
        }
        samples += 1;
    }
    if (is_async_pending) {
        return (function () { return __awaiter(_this, void 0, void 0, function () {
            var status, random_key;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(i < min_trials && trials.length > 0)) return [3 /*break*/, 5];
                        status = void 0;
                        if (!is_async_pending) return [3 /*break*/, 2];
                        return [4 /*yield*/, is_async_pending];
                    case 1:
                        status = _a.sent();
                        is_async_pending = undefined;
                        return [3 /*break*/, 4];
                    case 2:
                        random_key = trials.pop();
                        return [4 /*yield*/, test(random_key)];
                    case 3:
                        status = _a.sent();
                        _a.label = 4;
                    case 4:
                        if (!status) {
                            e += 1;
                            failures += 1;
                        }
                        if (e > failure_threshold) {
                            i = 0;
                            e = 0;
                        }
                        samples += 1;
                        return [3 /*break*/, 0];
                    case 5: return [2 /*return*/, { failures: failures, samples: samples }];
                }
            });
        }); })();
    }
    return { failures: failures, samples: samples };
}
exports.lazy_exploration = lazy_exploration;
//# sourceMappingURL=lazy_exploration.js.map