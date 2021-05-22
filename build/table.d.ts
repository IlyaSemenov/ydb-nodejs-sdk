/// <reference types="pino" />
/// <reference types="node" />
import EventEmitter from 'events';
import { Ydb } from '../proto/bundle';
import { AuthenticatedService } from './utils';
import { Endpoint } from './discovery';
import Driver from './driver';
import { IAuthService } from './credentials';
import { Logger } from './logging';
import TableService = Ydb.Table.V1.TableService;
import ICreateSessionResult = Ydb.Table.ICreateSessionResult;
import IType = Ydb.IType;
import DescribeTableResult = Ydb.Table.DescribeTableResult;
import PrepareQueryResult = Ydb.Table.PrepareQueryResult;
import ExecuteQueryResult = Ydb.Table.ExecuteQueryResult;
import ITransactionSettings = Ydb.Table.ITransactionSettings;
import ITransactionMeta = Ydb.Table.ITransactionMeta;
import AutoPartitioningPolicy = Ydb.Table.PartitioningPolicy.AutoPartitioningPolicy;
import ITypedValue = Ydb.ITypedValue;
import FeatureFlag = Ydb.FeatureFlag.Status;
import Compression = Ydb.Table.ColumnFamilyPolicy.Compression;
import IOperationParams = Ydb.Operations.IOperationParams;
export declare class SessionService extends AuthenticatedService<TableService> {
    endpoint: Endpoint;
    private readonly logger;
    constructor(endpoint: Endpoint, authService: IAuthService);
    create(): Promise<Session>;
}
interface IExistingTransaction {
    txId: string;
}
interface INewTransaction {
    beginTx: ITransactionSettings;
    commitTx: boolean;
}
interface IQueryParams {
    [k: string]: Ydb.ITypedValue;
}
export declare class ExecDataQuerySettings {
    keepInCache: boolean;
    withKeepInCache(keepInCache: boolean): this;
}
export declare class Session extends EventEmitter implements ICreateSessionResult {
    private api;
    endpoint: Endpoint;
    sessionId: string;
    private logger;
    private beingDeleted;
    private free;
    constructor(api: TableService, endpoint: Endpoint, sessionId: string, logger: Logger);
    acquire(): this;
    release(): void;
    isFree(): boolean;
    isDeleted(): boolean;
    delete(): Promise<void>;
    keepAlive(): Promise<void>;
    createTable(tablePath: string, description: TableDescription, operationParams?: IOperationParams): Promise<void>;
    dropTable(tablePath: string, operationParams?: IOperationParams): Promise<void>;
    describeTable(tablePath: string, operationParams?: IOperationParams): Promise<DescribeTableResult>;
    beginTransaction(txSettings: ITransactionSettings, operationParams?: IOperationParams): Promise<ITransactionMeta>;
    commitTransaction(txControl: IExistingTransaction, operationParams?: IOperationParams): Promise<void>;
    rollbackTransaction(txControl: IExistingTransaction, operationParams?: IOperationParams): Promise<void>;
    prepareQuery(queryText: string, operationParams?: IOperationParams): Promise<PrepareQueryResult>;
    executeQuery(query: PrepareQueryResult | string, params?: IQueryParams, txControl?: IExistingTransaction | INewTransaction, operationParams?: IOperationParams, settings?: ExecDataQuerySettings): Promise<ExecuteQueryResult>;
}
export interface PoolSettings {
    minLimit?: number;
    maxLimit?: number;
    keepAlivePeriod?: number;
}
declare type SessionCallback<T> = (session: Session) => Promise<T>;
export declare class SessionPool extends EventEmitter {
    private driver;
    private readonly minLimit;
    private readonly maxLimit;
    private readonly sessions;
    private newSessionsRequested;
    private sessionsBeingDeleted;
    private readonly sessionKeepAliveId;
    private readonly logger;
    private readonly waiters;
    private static SESSION_MIN_LIMIT;
    private static SESSION_MAX_LIMIT;
    constructor(driver: Driver);
    destroy(): Promise<void>;
    private initListeners;
    private prepopulateSessions;
    private createSession;
    private deleteSession;
    private acquire;
    private _withSession;
    withSession<T>(callback: SessionCallback<T>, timeout?: number): Promise<T>;
    withSessionRetry<T>(callback: SessionCallback<T>, timeout?: number, maxRetries?: number): Promise<T>;
}
export declare class TableClient extends EventEmitter {
    private pool;
    constructor(driver: Driver);
    withSession<T>(callback: (session: Session) => Promise<T>, timeout?: number): Promise<T>;
    withSessionRetry<T>(callback: (session: Session) => Promise<T>, timeout?: number, maxRetries?: number): Promise<T>;
    destroy(): Promise<void>;
}
export declare class Column implements Ydb.Table.IColumnMeta {
    name: string;
    type: IType;
    constructor(name: string, type: IType);
}
export declare class StorageSettings implements Ydb.Table.IStorageSettings {
    storageKind: string;
    constructor(storageKind: string);
}
export declare class ColumnFamilyPolicy implements Ydb.Table.IColumnFamilyPolicy {
    name?: string;
    data?: StorageSettings;
    external?: StorageSettings;
    keepInMemory?: FeatureFlag;
    compression?: Compression;
    withName(name: string): this;
    withData(data: StorageSettings): this;
    withExternal(external: StorageSettings): this;
    withKeepInMemory(keepInMemory: FeatureFlag): this;
    withCompression(compression: Compression): this;
}
export declare class StoragePolicy implements Ydb.Table.IStoragePolicy {
    presetName?: string;
    syslog?: StorageSettings;
    log?: StorageSettings;
    data?: StorageSettings;
    external?: StorageSettings;
    keepInMemory?: FeatureFlag;
    columnFamilies: ColumnFamilyPolicy[];
    withPresetName(presetName: string): this;
    withSyslog(syslog: StorageSettings): this;
    withLog(log: StorageSettings): this;
    withData(data: StorageSettings): this;
    withExternal(external: StorageSettings): this;
    withKeepInMemory(keepInMemory: FeatureFlag): this;
    withColumnFamilies(...columnFamilies: ColumnFamilyPolicy[]): this;
}
export declare class ExplicitPartitions implements Ydb.Table.IExplicitPartitions {
    splitPoints: ITypedValue[];
    constructor(splitPoints: ITypedValue[]);
}
export declare class PartitioningPolicy implements Ydb.Table.IPartitioningPolicy {
    presetName?: string;
    autoPartitioning?: AutoPartitioningPolicy;
    uniformPartitions?: number;
    explicitPartitions?: ExplicitPartitions;
    withPresetName(presetName: string): this;
    withUniformPartitions(uniformPartitions: number): this;
    withAutoPartitioning(autoPartitioning: AutoPartitioningPolicy): this;
    withExplicitPartitions(explicitPartitions: ExplicitPartitions): this;
}
export declare class ReplicationPolicy implements Ydb.Table.IReplicationPolicy {
    presetName?: string;
    replicasCount?: number;
    createPerAvailabilityZone?: FeatureFlag;
    allowPromotion?: FeatureFlag;
    withPresetName(presetName: string): this;
    withReplicasCount(replicasCount: number): this;
    withCreatePerAvailabilityZone(createPerAvailabilityZone: FeatureFlag): this;
    withAllowPromotion(allowPromotion: FeatureFlag): this;
}
export declare class CompactionPolicy implements Ydb.Table.ICompactionPolicy {
    presetName: string;
    constructor(presetName: string);
}
export declare class ExecutionPolicy implements Ydb.Table.IExecutionPolicy {
    presetName: string;
    constructor(presetName: string);
}
export declare class CachingPolicy implements Ydb.Table.ICachingPolicy {
    presetName: string;
    constructor(presetName: string);
}
export declare class TableProfile implements Ydb.Table.ITableProfile {
    presetName?: string;
    storagePolicy?: StoragePolicy;
    compactionPolicy?: CompactionPolicy;
    partitioningPolicy?: PartitioningPolicy;
    executionPolicy?: ExecutionPolicy;
    replicationPolicy?: ReplicationPolicy;
    cachingPolicy?: CachingPolicy;
    withPresetName(presetName: string): this;
    withStoragePolicy(storagePolicy: StoragePolicy): this;
    withCompactionPolicy(compactionPolicy: CompactionPolicy): this;
    withPartitioningPolicy(partitioningPolicy: PartitioningPolicy): this;
    withExecutionPolicy(executionPolicy: ExecutionPolicy): this;
    withReplicationPolicy(replicationPolicy: ReplicationPolicy): this;
    withCachingPolicy(cachingPolicy: CachingPolicy): this;
}
export declare class TableIndex implements Ydb.Table.ITableIndex {
    name: string;
    indexColumns: string[];
    constructor(name: string);
    withIndexColumns(...indexColumns: string[]): this;
}
export declare class TtlSettings implements Ydb.Table.ITtlSettings {
    dateTypeColumn?: Ydb.Table.IDateTypeColumnModeSettings | null;
    constructor(columnName: string, expireAfterSeconds?: number);
}
export declare class TableDescription {
    columns: Column[];
    primaryKey: string[];
    profile?: TableProfile;
    indexes: TableIndex[];
    ttlSettings?: TtlSettings;
    constructor(columns?: Column[], primaryKey?: string[]);
    withColumn(column: Column): this;
    withColumns(...columns: Column[]): this;
    withPrimaryKey(key: string): this;
    withPrimaryKeys(...keys: string[]): this;
    withProfile(profile: TableProfile): this;
    withIndex(index: TableIndex): this;
    withIndexes(...indexes: TableIndex[]): this;
    withTtl(columnName: string, expireAfterSeconds?: number): this;
}
export {};
