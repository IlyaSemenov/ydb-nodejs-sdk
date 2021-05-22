/// <reference types="node" />
import { Metadata } from '@grpc/grpc-js';
import { GrpcService, ISslCredentials } from "./utils";
import { yandex } from "../proto/bundle";
import IamTokenService = yandex.cloud.iam.v1.IamTokenService;
export interface IIAmCredentials {
    serviceAccountId: string;
    accessKeyId: string;
    privateKey: Buffer;
    iamEndpoint: string;
}
export interface IAuthCredentials {
    sslCredentials: ISslCredentials;
    iamCredentials: IIAmCredentials;
}
export interface ITokenService {
    getToken: () => string | undefined;
    initialize?: () => Promise<void>;
}
export interface IAuthService {
    getAuthMetadata: () => Promise<Metadata>;
    sslCredentials?: ISslCredentials;
}
export declare class TokenAuthService implements IAuthService {
    private token;
    private dbName;
    sslCredentials?: ISslCredentials | undefined;
    constructor(token: string, dbName: string, sslCredentials?: ISslCredentials | undefined);
    getAuthMetadata(): Promise<Metadata>;
}
export declare class IamAuthService extends GrpcService<IamTokenService> implements IAuthService {
    private jwtExpirationTimeout;
    private tokenExpirationTimeout;
    private tokenRequestTimeout;
    private token;
    private readonly dbName;
    private tokenTimestamp;
    private readonly iamCredentials;
    readonly sslCredentials?: ISslCredentials;
    constructor(iamCredentials: IIAmCredentials, dbName: string, sslCredentials?: ISslCredentials);
    getJwtRequest(): string;
    private get expired();
    private sendTokenRequest;
    private updateToken;
    getAuthMetadata(): Promise<Metadata>;
}
export declare class MetadataAuthService implements IAuthService {
    private dbName;
    sslCredentials?: ISslCredentials | undefined;
    private tokenService;
    static MAX_TRIES: number;
    static TRIES_INTERVAL: number;
    constructor(dbName: string, sslCredentials?: ISslCredentials | undefined, tokenService?: ITokenService);
    getAuthMetadata(): Promise<Metadata>;
}
