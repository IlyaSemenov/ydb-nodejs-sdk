"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetadataAuthService = exports.IamAuthService = exports.TokenAuthService = void 0;
const grpc_js_1 = require("@grpc/grpc-js");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const luxon_1 = require("luxon");
const utils_1 = require("./utils");
const yandex_cloud_1 = require("yandex-cloud");
const bundle_1 = require("../proto/bundle");
var IamTokenService = bundle_1.yandex.cloud.iam.v1.IamTokenService;
function makeCredentialsMetadata(token, dbName) {
    const metadata = new grpc_js_1.Metadata();
    metadata.add('x-ydb-auth-ticket', token);
    metadata.add('x-ydb-database', dbName);
    return metadata;
}
class TokenAuthService {
    constructor(token, dbName, sslCredentials) {
        this.token = token;
        this.dbName = dbName;
        this.sslCredentials = sslCredentials;
    }
    async getAuthMetadata() {
        return makeCredentialsMetadata(this.token, this.dbName);
    }
}
exports.TokenAuthService = TokenAuthService;
class IamAuthService extends utils_1.GrpcService {
    constructor(iamCredentials, dbName, sslCredentials) {
        super(iamCredentials.iamEndpoint, 'yandex.cloud.iam.v1.IamTokenService', IamTokenService, sslCredentials);
        this.jwtExpirationTimeout = 3600 * 1000;
        this.tokenExpirationTimeout = 120 * 1000;
        this.tokenRequestTimeout = 10 * 1000;
        this.token = '';
        this.dbName = '';
        this.iamCredentials = iamCredentials;
        this.dbName = dbName;
        this.tokenTimestamp = null;
        this.sslCredentials = sslCredentials;
    }
    getJwtRequest() {
        const now = luxon_1.DateTime.utc();
        const expires = now.plus({ milliseconds: this.jwtExpirationTimeout });
        const payload = {
            "iss": this.iamCredentials.serviceAccountId,
            "aud": "https://iam.api.cloud.yandex.net/iam/v1/tokens",
            "iat": Math.round(now.toSeconds()),
            "exp": Math.round(expires.toSeconds())
        };
        const options = {
            algorithm: "PS256",
            keyid: this.iamCredentials.accessKeyId
        };
        return jsonwebtoken_1.default.sign(payload, this.iamCredentials.privateKey, options);
    }
    get expired() {
        return !this.tokenTimestamp || (luxon_1.DateTime.utc().diff(this.tokenTimestamp).valueOf() > this.tokenExpirationTimeout);
    }
    sendTokenRequest() {
        const tokenPromise = this.api.create({ jwt: this.getJwtRequest() });
        return utils_1.withTimeout(tokenPromise, this.tokenRequestTimeout);
    }
    async updateToken() {
        const { iamToken } = await this.sendTokenRequest();
        if (iamToken) {
            this.token = iamToken;
            this.tokenTimestamp = luxon_1.DateTime.utc();
        }
        else {
            throw new Error('Received empty token from IAM!');
        }
    }
    async getAuthMetadata() {
        if (this.expired) {
            await this.updateToken();
        }
        return makeCredentialsMetadata(this.token, this.dbName);
    }
}
exports.IamAuthService = IamAuthService;
let MetadataAuthService = /** @class */ (() => {
    class MetadataAuthService {
        constructor(dbName, sslCredentials, tokenService) {
            this.dbName = dbName;
            this.sslCredentials = sslCredentials;
            this.tokenService = tokenService || new yandex_cloud_1.TokenService();
        }
        async getAuthMetadata() {
            let token = this.tokenService.getToken();
            if (!token && typeof this.tokenService.initialize === 'function') {
                await this.tokenService.initialize();
                token = this.tokenService.getToken();
            }
            let tries = 0;
            while (!token && tries < MetadataAuthService.MAX_TRIES) {
                await utils_1.sleep(MetadataAuthService.TRIES_INTERVAL);
                tries++;
                token = this.tokenService.getToken();
            }
            if (token) {
                return makeCredentialsMetadata(token, this.dbName);
            }
            throw new Error(`Failed to fetch access token via metadata service in ${MetadataAuthService.MAX_TRIES} tries!`);
        }
    }
    MetadataAuthService.MAX_TRIES = 5;
    MetadataAuthService.TRIES_INTERVAL = 2000;
    return MetadataAuthService;
})();
exports.MetadataAuthService = MetadataAuthService;
