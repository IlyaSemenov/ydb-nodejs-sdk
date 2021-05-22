"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCredentialsFromEnv = void 0;
const fs_1 = __importDefault(require("fs"));
const credentials_1 = require("./credentials");
function getSslCert() {
    const rootCertsFile = process.env.YDB_SSL_ROOT_CERTIFICATES_FILE || '';
    const sslCredentials = {};
    if (rootCertsFile) {
        sslCredentials.rootCertificates = fs_1.default.readFileSync(rootCertsFile);
    }
    return sslCredentials;
}
function getSACredentialsFromEnv(serviceAccountId) {
    return {
        iamEndpoint: process.env.IAM_ENDPOINT || 'iam.api.cloud.yandex.net:443',
        serviceAccountId,
        accessKeyId: process.env.SA_ACCESS_KEY_ID || '',
        privateKey: fs_1.default.readFileSync(process.env.SA_PRIVATE_KEY_FILE || '')
    };
}
function getSACredentialsFromJson(filename) {
    const buffer = fs_1.default.readFileSync(filename);
    const payload = JSON.parse(buffer.toString());
    return {
        iamEndpoint: process.env.IAM_ENDPOINT || 'iam.api.cloud.yandex.net:443',
        serviceAccountId: payload.service_account_id,
        accessKeyId: payload.id,
        privateKey: payload.private_key
    };
}
function getCredentialsFromEnv(entryPoint, dbName, logger) {
    let sslCredentials = undefined;
    if (entryPoint.startsWith('grpcs://')) {
        logger.debug('Protocol grpcs specified in entry-point, using SSL connection.');
        sslCredentials = getSslCert();
    }
    else if (entryPoint.startsWith('grpc://')) {
        logger.debug('Protocol grpc specified in entry-point, using insecure connection.');
    }
    else {
        logger.debug('No protocol specified in entry-point, using SSL connection.');
        sslCredentials = getSslCert();
    }
    if (process.env.YDB_TOKEN) {
        logger.debug('YDB_TOKEN env var found, using TokenAuthService.');
        return new credentials_1.TokenAuthService(process.env.YDB_TOKEN, dbName, sslCredentials);
    }
    if (process.env.SA_ID) {
        logger.debug('SA_ID env var found, using IamAuthService.');
        return new credentials_1.IamAuthService(getSACredentialsFromEnv(process.env.SA_ID), dbName, sslCredentials);
    }
    else if (process.env.SA_JSON_FILE) {
        logger.debug('SA_JSON_FILE env var found, using IamAuthService with params from that json.');
        return new credentials_1.IamAuthService(getSACredentialsFromJson(process.env.SA_JSON_FILE), dbName, sslCredentials);
    }
    else {
        logger.debug('Neither YDB_TOKEN nor SA_ID env variable is set, getting token from Metadata Service');
        return new credentials_1.MetadataAuthService(dbName, sslCredentials);
    }
}
exports.getCredentialsFromEnv = getCredentialsFromEnv;
