import { Endpoint } from "./discovery";
import { SessionService, TableClient, PoolSettings } from "./table";
import SchemeService from "./scheme";
import { IAuthService } from "./credentials";
export interface DriverSettings {
    poolSettings?: PoolSettings;
}
export default class Driver {
    private entryPoint;
    database: string;
    authService: IAuthService;
    settings: DriverSettings;
    private discoveryService;
    private sessionCreators;
    private logger;
    tableClient: TableClient;
    schemeClient: SchemeService;
    constructor(entryPoint: string, database: string, authService: IAuthService, settings?: DriverSettings);
    ready(timeout: number): Promise<boolean>;
    getEndpoint(): Promise<Endpoint>;
    destroy(): Promise<void>;
    getSessionCreator(): Promise<SessionService>;
}
