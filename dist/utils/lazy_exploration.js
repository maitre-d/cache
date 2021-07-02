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
Object.defineProperty(exports, "__esModule", { value: true });
exports.lazy_exploration = void 0;
/** Explore a set until the minimum_trials is met or we exceed the retry interval */
function lazy_exploration(set, 
/** Callback, false indicates failure */
test, min_trials = 20, failure_threshold = 5) {
    let is_async_pending;
    let failures = 0;
    let samples = 0;
    let i = 0;
    let e = 0;
    while (i < min_trials && set.length > 0) {
        const random_key_index = Math.floor(Math.random() * set.length);
        const random_key = set[random_key_index];
        const status = test(random_key);
        set.splice(random_key_index, 1);
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
        return (() => __awaiter(this, void 0, void 0, function* () {
            while (i < min_trials && set.length > 0) {
                let status;
                if (is_async_pending) {
                    status = yield is_async_pending;
                    is_async_pending = undefined;
                }
                else {
                    const random_key_index = Math.floor(Math.random() * set.length);
                    const random_key = set[random_key_index];
                    status = yield test(random_key);
                    set.splice(random_key_index, 1);
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
            return { failures, samples };
        }))();
    }
    return { failures, samples };
}
exports.lazy_exploration = lazy_exploration;
//# sourceMappingURL=lazy_exploration.js.map