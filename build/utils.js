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
exports.sleep = exports.pessimizable = exports.ensureOperationSucceeded = exports.getOperationPayload = exports.AuthenticatedService = exports.GrpcService = exports.withTimeout = void 0;
const grpc = __importStar(require("@grpc/grpc-js"));
const lodash_1 = __importDefault(require("lodash"));
const errors_1 = require("./errors");
const version_1 = require("./version");
function removeProtocol(entryPoint) {
    const re = /^(grpc:\/\/|grpcs:\/\/)?(.+)/;
    const match = re.exec(entryPoint);
    return match[2];
}
function withTimeout(promise, timeoutMs) {
    let timeoutId;
    const timedRejection = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
            reject(new errors_1.TimeoutExpired(`Timeout of ${timeoutMs}ms has expired`));
        }, timeoutMs);
    });
    return Promise.race([promise.then((result) => {
            clearTimeout(timeoutId);
            return result;
        }), timedRejection]);
}
exports.withTimeout = withTimeout;
class GrpcService {
    constructor(host, name, apiCtor, sslCredentials) {
        this.name = name;
        this.apiCtor = apiCtor;
        this.api = this.getClient(removeProtocol(host), sslCredentials);
    }
    getClient(host, sslCredentials) {
        const client = sslCredentials ?
            new grpc.Client(host, grpc.credentials.createSsl()) :
            new grpc.Client(host, grpc.credentials.createInsecure());
        const rpcImpl = (method, requestData, callback) => {
            const path = `/${this.name}/${method.name}`;
            client.makeUnaryRequest(path, lodash_1.default.identity, lodash_1.default.identity, requestData, callback);
        };
        return this.apiCtor.create(rpcImpl);
    }
}
exports.GrpcService = GrpcService;
class AuthenticatedService {
    constructor(host, name, apiCtor, authService) {
        this.name = name;
        this.apiCtor = apiCtor;
        this.authService = authService;
        this.metadata = null;
        this.headers = new Map([version_1.getVersionHeader()]);
        this.api = new Proxy(this.getClient(removeProtocol(host), this.authService.sslCredentials), {
            get: (target, prop, receiver) => {
                const property = Reflect.get(target, prop, receiver);
                return AuthenticatedService.isServiceAsyncMethod(target, prop, receiver) ?
                    async (...args) => {
                        this.metadata = await this.authService.getAuthMetadata();
                        for (const [name, value] of this.headers) {
                            if (value) {
                                this.metadata.add(name, value);
                            }
                        }
                        return property.call(receiver, ...args);
                    } :
                    property;
            }
        });
    }
    static isServiceAsyncMethod(target, prop, receiver) {
        return (Reflect.has(target, prop) &&
            typeof Reflect.get(target, prop, receiver) === 'function' &&
            prop !== 'create');
    }
    getClient(host, sslCredentials) {
        const client = sslCredentials ?
            new grpc.Client(host, grpc.credentials.createSsl(sslCredentials.rootCertificates)) :
            new grpc.Client(host, grpc.credentials.createInsecure());
        const rpcImpl = (method, requestData, callback) => {
            const path = `/${this.name}/${method.name}`;
            if (this.metadata) {
                client.makeUnaryRequest(path, lodash_1.default.identity, lodash_1.default.identity, requestData, this.metadata, callback);
            }
            else {
                client.makeUnaryRequest(path, lodash_1.default.identity, lodash_1.default.identity, requestData, callback);
            }
        };
        return this.apiCtor.create(rpcImpl);
    }
}
exports.AuthenticatedService = AuthenticatedService;
function getOperationPayload(response) {
    var _a;
    const { operation } = response;
    if (operation) {
        errors_1.YdbError.checkStatus(operation);
        const value = (_a = operation === null || operation === void 0 ? void 0 : operation.result) === null || _a === void 0 ? void 0 : _a.value;
        if (!value) {
            throw new errors_1.MissingValue('Missing operation result value!');
        }
        return value;
    }
    else {
        throw new errors_1.MissingOperation('No operation in response!');
    }
}
exports.getOperationPayload = getOperationPayload;
function ensureOperationSucceeded(response, suppressedErrors = []) {
    try {
        getOperationPayload(response);
    }
    catch (e) {
        if (suppressedErrors.indexOf(e.constructor.status) > -1) {
            return;
        }
        if (!(e instanceof errors_1.MissingValue)) {
            throw e;
        }
    }
}
exports.ensureOperationSucceeded = ensureOperationSucceeded;
function pessimizable(_target, _propertyKey, descriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = async function (...args) {
        try {
            return await originalMethod.call(this, ...args);
        }
        catch (error) {
            if (!(error instanceof errors_1.NotFound)) {
                this.endpoint.pessimize();
            }
            throw error;
        }
    };
    return descriptor;
}
exports.pessimizable = pessimizable;
async function sleep(milliseconds) {
    await new Promise((resolve) => setTimeout(resolve, milliseconds));
}
exports.sleep = sleep;
