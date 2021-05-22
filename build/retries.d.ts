import { YdbError } from "./errors";
declare class BackoffSettings {
    backoffCeiling: number;
    backoffSlotDuration: number;
    private uncertainRatio;
    constructor(backoffCeiling: number, backoffSlotDuration: number, uncertainRatio?: number);
    waitBackoffTimeout(retries: number): Promise<void>;
}
export declare class RetryParameters {
    retryNotFound: boolean;
    unknownErrorHandler: (_error: unknown) => void;
    maxRetries: number;
    onYdbErrorCb: (_error: YdbError) => void;
    fastBackoff: BackoffSettings;
    slowBackoff: BackoffSettings;
    constructor({ maxRetries, onYdbErrorCb, backoffCeiling, backoffSlotDuration, }?: {
        maxRetries?: number | undefined;
        onYdbErrorCb?: ((_error: YdbError) => void) | undefined;
        backoffCeiling?: number | undefined;
        backoffSlotDuration?: number | undefined;
    });
}
export declare function retryable(strategyParams?: RetryParameters): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => void;
export declare function withRetries<T>(originalFunction: () => Promise<T>, strategyParams?: RetryParameters): Promise<T>;
export {};
