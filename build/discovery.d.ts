import { Ydb } from "../proto/bundle";
import { AuthenticatedService } from "./utils";
import { IAuthService } from "./credentials";
import DiscoveryServiceAPI = Ydb.Discovery.V1.DiscoveryService;
import IEndpointInfo = Ydb.Discovery.IEndpointInfo;
export declare class Endpoint extends Ydb.Discovery.EndpointInfo {
    readonly database: string;
    static HOST_RE: RegExp;
    static PESSIMIZATION_WEAR_OFF_PERIOD: number;
    private pessimizedAt;
    static fromString(host: string): Ydb.Discovery.EndpointInfo;
    constructor(properties: IEndpointInfo, database: string);
    update(_endpoint: Endpoint): this;
    get pessimized(): boolean;
    pessimize(): void;
    toString(): string;
}
export default class DiscoveryService extends AuthenticatedService<DiscoveryServiceAPI> {
    private database;
    private discoveryPeriod;
    private readonly endpointsPromise;
    private resolveEndpoints;
    private rejectEndpoints;
    private readonly periodicDiscoveryId;
    private endpoints;
    private currentEndpointIndex;
    private events;
    private logger;
    constructor(entryPoint: string, database: string, discoveryPeriod: number, authService: IAuthService);
    destroy(): void;
    private init;
    private updateEndpoints;
    private discoverEndpoints;
    emit(eventName: string, ...args: any[]): void;
    on(eventName: string, callback: (...args: any[]) => void): void;
    ready(timeout: number): Promise<void>;
    private getEndpointRR;
    getEndpoint(): Promise<Endpoint>;
}
