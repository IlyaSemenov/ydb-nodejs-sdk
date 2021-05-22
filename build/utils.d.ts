/// <reference types="node" />
import * as $protobuf from 'protobufjs';
import { Ydb } from '../proto/bundle';
import { StatusCode } from "./errors";
import { Endpoint } from './discovery';
import { IAuthService } from './credentials';
export interface Pessimizable {
    endpoint: Endpoint;
}
declare type ServiceFactory<T> = {
    create(rpcImpl: $protobuf.RPCImpl, requestDelimited?: boolean, responseDelimited?: boolean): T;
};
export interface ISslCredentials {
    rootCertificates?: Buffer;
    clientPrivateKey?: Buffer;
    clientCertChain?: Buffer;
}
export declare function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T>;
export declare abstract class GrpcService<Api extends $protobuf.rpc.Service> {
    private name;
    private apiCtor;
    protected api: Api;
    protected constructor(host: string, name: string, apiCtor: ServiceFactory<Api>, sslCredentials?: ISslCredentials);
    protected getClient(host: string, sslCredentials?: ISslCredentials): Api;
}
export declare type MetadataHeaders = Map<string, string>;
export declare abstract class AuthenticatedService<Api extends $protobuf.rpc.Service> {
    private name;
    private apiCtor;
    private authService;
    protected api: Api;
    private metadata;
    headers: MetadataHeaders;
    static isServiceAsyncMethod(target: object, prop: string | number | symbol, receiver: any): boolean;
    protected constructor(host: string, name: string, apiCtor: ServiceFactory<Api>, authService: IAuthService);
    protected getClient(host: string, sslCredentials?: ISslCredentials): Api;
}
interface AsyncResponse {
    operation?: Ydb.Operations.IOperation | null;
}
export declare function getOperationPayload(response: AsyncResponse): Uint8Array;
export declare function ensureOperationSucceeded(response: AsyncResponse, suppressedErrors?: StatusCode[]): void;
export declare function pessimizable(_target: Pessimizable, _propertyKey: string, descriptor: PropertyDescriptor): PropertyDescriptor;
export declare function sleep(milliseconds: number): Promise<void>;
export {};
