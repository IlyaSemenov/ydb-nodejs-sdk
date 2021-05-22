"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.withRetries = exports.retryable = exports.RetryParameters = void 0;
const errors_1 = require("./errors");
const logging_1 = __importDefault(require("./logging"));
const errors = __importStar(require("./errors"));
const utils_1 = require("./utils");
class BackoffSettings {
    constructor(backoffCeiling, backoffSlotDuration, uncertainRatio = 0.5) {
        this.backoffCeiling = backoffCeiling;
        this.backoffSlotDuration = backoffSlotDuration;
        this.uncertainRatio = uncertainRatio;
    }
    async waitBackoffTimeout(retries) {
        const slotsCount = 1 << Math.min(retries, this.backoffCeiling);
        const maxDuration = slotsCount * this.backoffSlotDuration;
        const duration = maxDuration * (Math.random() * this.uncertainRatio + 1 - this.uncertainRatio);
        return utils_1.sleep(duration);
    }
}
class RetryParameters {
    constructor({ maxRetries = 10, onYdbErrorCb = (_error) => { }, backoffCeiling = 6, backoffSlotDuration = 1000, } = {}) {
        this.maxRetries = maxRetries;
        this.onYdbErrorCb = onYdbErrorCb;
        this.fastBackoff = new BackoffSettings(10, 5);
        this.slowBackoff = new BackoffSettings(backoffCeiling, backoffSlotDuration);
        this.retryNotFound = true;
        this.unknownErrorHandler = () => { };
    }
}
exports.RetryParameters = RetryParameters;
const RETRYABLE_ERRORS_FAST = [
    errors.Unavailable, errors.Aborted, errors.NotFound
];
const RETRYABLE_ERRORS_SLOW = [errors.Overloaded];
class RetryStrategy {
    constructor(methodName = 'UnknownClass::UnknownMethod', retryParameters) {
        this.methodName = methodName;
        this.retryParameters = retryParameters;
        this.logger = logging_1.default();
    }
    async retry(asyncMethod) {
        let retries = 0;
        let error;
        const retryParameters = this.retryParameters;
        while (retries < retryParameters.maxRetries) {
            try {
                return await asyncMethod();
            }
            catch (e) {
                error = e;
                if (e instanceof errors_1.YdbError) {
                    const errName = e.constructor.name;
                    const retriesLeft = retryParameters.maxRetries - retries;
                    if (RETRYABLE_ERRORS_FAST.some((cls) => e instanceof cls)) {
                        retryParameters.onYdbErrorCb(e);
                        if (e instanceof errors.NotFound && !retryParameters.retryNotFound) {
                            throw e;
                        }
                        this.logger.warn(`Caught an error ${errName}, retrying with small backoff,, ${retriesLeft} retries left`);
                        await this.retryParameters.fastBackoff.waitBackoffTimeout(retries);
                    }
                    else if (RETRYABLE_ERRORS_SLOW.some((cls) => e instanceof cls)) {
                        retryParameters.onYdbErrorCb(e);
                        this.logger.warn(`Caught an error ${errName}, retrying with a backoff, ${retriesLeft} retries left`);
                        await this.retryParameters.slowBackoff.waitBackoffTimeout(retries);
                    }
                    else {
                        retryParameters.onYdbErrorCb(e);
                        throw e;
                    }
                }
                else {
                    retryParameters.unknownErrorHandler(e);
                    throw e;
                }
            }
            retries++;
        }
        this.logger.debug('All retries have been used, re-throwing error');
        throw error;
    }
}
function retryable(strategyParams) {
    return (target, propertyKey, descriptor) => {
        const originalMethod = descriptor.value;
        const wrappedMethodName = `${target.constructor.name}::${propertyKey}`;
        if (!strategyParams) {
            strategyParams = new RetryParameters();
        }
        const strategy = new RetryStrategy(wrappedMethodName, strategyParams);
        descriptor.value = async function (...args) {
            return await strategy.retry(async () => await originalMethod.call(this, ...args));
        };
    };
}
exports.retryable = retryable;
async function withRetries(originalFunction, strategyParams) {
    const wrappedMethodName = originalFunction.name;
    if (!strategyParams) {
        strategyParams = new RetryParameters();
    }
    const strategy = new RetryStrategy(wrappedMethodName, strategyParams);
    return await strategy.retry(originalFunction);
}
exports.withRetries = withRetries;
