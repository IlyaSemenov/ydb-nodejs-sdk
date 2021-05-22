"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
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
const bundle_1 = require("../proto/bundle");
const utils_1 = require("./utils");
const logging_1 = __importDefault(require("./logging"));
const retries_1 = require("./retries");
var SchemeServiceAPI = bundle_1.Ydb.Scheme.V1.SchemeService;
var ListDirectoryResult = bundle_1.Ydb.Scheme.ListDirectoryResult;
var DescribePathResult = bundle_1.Ydb.Scheme.DescribePathResult;
const protobufjs_1 = require("protobufjs");
var EventEmitter = protobufjs_1.util.EventEmitter;
function preparePermissions(action) {
    if (action && action.permissionNames) {
        return Object.assign(Object.assign({}, action), { permissionNames: action.permissionNames.map((name) => name.startsWith('ydb.generic.') ? name : `ydb.generic.${name}`) });
    }
    return action;
}
function preparePermissionAction(action) {
    const { grant, revoke, set } = action, rest = __rest(action, ["grant", "revoke", "set"]);
    return Object.assign(Object.assign({}, rest), { grant: preparePermissions(grant), revoke: preparePermissions(revoke), set: preparePermissions(set) });
}
class SchemeClient extends EventEmitter {
    constructor(driver) {
        super();
        this.driver = driver;
        this.schemeServices = new Map();
    }
    async getSchemeService() {
        const endpoint = await this.driver.getEndpoint();
        if (!this.schemeServices.has(endpoint)) {
            const service = new SchemeService(endpoint, this.driver.database, this.driver.authService);
            this.schemeServices.set(endpoint, service);
        }
        return this.schemeServices.get(endpoint);
    }
    async makeDirectory(path, operationParams) {
        const service = await this.getSchemeService();
        return await service.makeDirectory(path, operationParams);
    }
    async removeDirectory(path, operationParams) {
        const service = await this.getSchemeService();
        return await service.removeDirectory(path, operationParams);
    }
    async listDirectory(path, operationParams) {
        const service = await this.getSchemeService();
        return await service.listDirectory(path, operationParams);
    }
    async describePath(path, operationParams) {
        const service = await this.getSchemeService();
        return await service.describePath(path, operationParams);
    }
    async modifyPermissions(path, permissionActions, clearPermissions, operationParams) {
        const service = await this.getSchemeService();
        return await service.modifyPermissions(path, permissionActions, clearPermissions, operationParams);
    }
    async destroy() {
        return;
    }
}
exports.default = SchemeClient;
let SchemeService = /** @class */ (() => {
    class SchemeService extends utils_1.AuthenticatedService {
        constructor(endpoint, database, authService) {
            const host = endpoint.toString();
            super(host, 'Ydb.Scheme.V1.SchemeService', SchemeServiceAPI, authService);
            this.endpoint = endpoint;
            this.database = database;
            this.logger = logging_1.default();
        }
        prepareRequest(path, operationParams) {
            return {
                path: `${this.database}/${path}`,
                operationParams
            };
        }
        async makeDirectory(path, operationParams) {
            const request = this.prepareRequest(path, operationParams);
            this.logger.debug(`Making directory ${request.path}`);
            utils_1.ensureOperationSucceeded(await this.api.makeDirectory(request));
        }
        async removeDirectory(path, operationParams) {
            const request = this.prepareRequest(path, operationParams);
            this.logger.debug(`Removing directory ${request.path}`);
            utils_1.ensureOperationSucceeded(await this.api.removeDirectory(request));
        }
        async listDirectory(path, operationParams) {
            const request = this.prepareRequest(path, operationParams);
            this.logger.debug(`Listing directory ${request.path} contents`);
            const response = await this.api.listDirectory(request);
            const payload = utils_1.getOperationPayload(response);
            return ListDirectoryResult.decode(payload);
        }
        async describePath(path, operationParams) {
            const request = this.prepareRequest(path, operationParams);
            this.logger.debug(`Describing path ${request.path}`);
            const response = await this.api.describePath(request);
            const payload = utils_1.getOperationPayload(response);
            return DescribePathResult.decode(payload);
        }
        async modifyPermissions(path, permissionActions, clearPermissions, operationParams) {
            const request = Object.assign(Object.assign({}, this.prepareRequest(path, operationParams)), { actions: permissionActions.map(preparePermissionAction), clearPermissions });
            this.logger.debug(`Modifying permissions on path ${request.path} to ${JSON.stringify(permissionActions, null, 2)}`);
            utils_1.ensureOperationSucceeded(await this.api.modifyPermissions(request));
        }
    }
    __decorate([
        retries_1.retryable(),
        utils_1.pessimizable
    ], SchemeService.prototype, "makeDirectory", null);
    __decorate([
        retries_1.retryable(),
        utils_1.pessimizable
    ], SchemeService.prototype, "removeDirectory", null);
    __decorate([
        retries_1.retryable(),
        utils_1.pessimizable
    ], SchemeService.prototype, "listDirectory", null);
    __decorate([
        retries_1.retryable(),
        utils_1.pessimizable
    ], SchemeService.prototype, "describePath", null);
    __decorate([
        retries_1.retryable(),
        utils_1.pessimizable
    ], SchemeService.prototype, "modifyPermissions", null);
    return SchemeService;
})();
