/// <reference types="pino" />
import { IAuthService } from "./credentials";
import { Logger } from './logging';
export declare function getCredentialsFromEnv(entryPoint: string, dbName: string, logger: Logger): IAuthService;
