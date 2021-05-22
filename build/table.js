"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TableDescription = exports.TtlSettings = exports.TableIndex = exports.TableProfile = exports.CachingPolicy = exports.ExecutionPolicy = exports.CompactionPolicy = exports.ReplicationPolicy = exports.PartitioningPolicy = exports.ExplicitPartitions = exports.StoragePolicy = exports.ColumnFamilyPolicy = exports.StorageSettings = exports.Column = exports.TableClient = exports.SessionPool = exports.Session = exports.ExecDataQuerySettings = exports.SessionService = void 0;
const lodash_1 = __importDefault(require("lodash"));
const events_1 = __importDefault(require("events"));
const bundle_1 = require("../proto/bundle");
const utils_1 = require("./utils");
const constants_1 = require("./constants");
const logging_1 = __importDefault(require("./logging"));
const retries_1 = require("./retries");
const errors_1 = require("./errors");
var TableService = bundle_1.Ydb.Table.V1.TableService;
var CreateSessionRequest = bundle_1.Ydb.Table.CreateSessionRequest;
var CreateSessionResult = bundle_1.Ydb.Table.CreateSessionResult;
var DescribeTableResult = bundle_1.Ydb.Table.DescribeTableResult;
var PrepareQueryResult = bundle_1.Ydb.Table.PrepareQueryResult;
var ExecuteQueryResult = bundle_1.Ydb.Table.ExecuteQueryResult;
var BeginTransactionResult = bundle_1.Ydb.Table.BeginTransactionResult;
let SessionService = /** @class */ (() => {
    class SessionService extends utils_1.AuthenticatedService {
        constructor(endpoint, authService) {
            const host = endpoint.toString();
            super(host, 'Ydb.Table.V1.TableService', TableService, authService);
            this.endpoint = endpoint;
            this.logger = logging_1.default();
        }
        async create() {
            const response = await this.api.createSession(CreateSessionRequest.create());
            const payload = utils_1.getOperationPayload(response);
            const { sessionId } = CreateSessionResult.decode(payload);
            return new Session(this.api, this.endpoint, sessionId, this.logger);
        }
    }
    __decorate([
        retries_1.retryable(),
        utils_1.pessimizable
    ], SessionService.prototype, "create", null);
    return SessionService;
})();
exports.SessionService = SessionService;
var SessionEvent;
(function (SessionEvent) {
    SessionEvent["SESSION_RELEASE"] = "SESSION_RELEASE";
    SessionEvent["SESSION_BROKEN"] = "SESSION_BROKEN";
})(SessionEvent || (SessionEvent = {}));
const AUTO_TX = {
    beginTx: {
        serializableReadWrite: {}
    },
    commitTx: true
};
class ExecDataQuerySettings {
    constructor() {
        this.keepInCache = false;
    }
    withKeepInCache(keepInCache) {
        this.keepInCache = keepInCache;
        return this;
    }
}
exports.ExecDataQuerySettings = ExecDataQuerySettings;
let Session = /** @class */ (() => {
    class Session extends events_1.default {
        constructor(api, endpoint, sessionId, logger) {
            super();
            this.api = api;
            this.endpoint = endpoint;
            this.sessionId = sessionId;
            this.logger = logger;
            this.beingDeleted = false;
            this.free = true;
        }
        acquire() {
            this.free = false;
            this.logger.debug(`Acquired session ${this.sessionId} on endpoint ${this.endpoint.toString()}.`);
            return this;
        }
        release() {
            this.free = true;
            this.logger.debug(`Released session ${this.sessionId} on endpoint ${this.endpoint.toString()}.`);
            this.emit(SessionEvent.SESSION_RELEASE, this);
        }
        isFree() {
            return this.free && !this.isDeleted();
        }
        isDeleted() {
            return this.beingDeleted;
        }
        async delete() {
            if (this.isDeleted()) {
                return Promise.resolve();
            }
            this.beingDeleted = true;
            utils_1.ensureOperationSucceeded(await this.api.deleteSession({ sessionId: this.sessionId }));
        }
        async keepAlive() {
            utils_1.ensureOperationSucceeded(await this.api.keepAlive({ sessionId: this.sessionId }));
        }
        async createTable(tablePath, description, operationParams) {
            const { columns, primaryKey, indexes, profile, ttlSettings } = description;
            const request = {
                sessionId: this.sessionId,
                path: `${this.endpoint.database}/${tablePath}`,
                columns,
                primaryKey,
                indexes,
                profile,
                ttlSettings,
                operationParams,
            };
            utils_1.ensureOperationSucceeded(await this.api.createTable(request));
        }
        async dropTable(tablePath, operationParams) {
            const request = {
                sessionId: this.sessionId,
                path: `${this.endpoint.database}/${tablePath}`,
                operationParams,
            };
            // suppress error when dropping non-existent table
            utils_1.ensureOperationSucceeded(await this.api.dropTable(request), [errors_1.SchemeError.status]);
        }
        async describeTable(tablePath, operationParams) {
            const request = {
                sessionId: this.sessionId,
                path: `${this.endpoint.database}/${tablePath}`,
                operationParams,
            };
            const response = await this.api.describeTable(request);
            const payload = utils_1.getOperationPayload(response);
            return DescribeTableResult.decode(payload);
        }
        async beginTransaction(txSettings, operationParams) {
            const response = await this.api.beginTransaction({
                sessionId: this.sessionId,
                txSettings,
                operationParams,
            });
            const payload = utils_1.getOperationPayload(response);
            const { txMeta } = BeginTransactionResult.decode(payload);
            if (txMeta) {
                return txMeta;
            }
            throw new Error('Could not begin new transaction, txMeta is empty!');
        }
        async commitTransaction(txControl, operationParams) {
            const request = {
                sessionId: this.sessionId,
                txId: txControl.txId,
                operationParams,
            };
            utils_1.ensureOperationSucceeded(await this.api.commitTransaction(request));
        }
        async rollbackTransaction(txControl, operationParams) {
            const request = {
                sessionId: this.sessionId,
                txId: txControl.txId,
                operationParams,
            };
            utils_1.ensureOperationSucceeded(await this.api.rollbackTransaction(request));
        }
        async prepareQuery(queryText, operationParams) {
            const request = {
                sessionId: this.sessionId,
                yqlText: queryText,
                operationParams,
            };
            const response = await this.api.prepareDataQuery(request);
            const payload = utils_1.getOperationPayload(response);
            return PrepareQueryResult.decode(payload);
        }
        async executeQuery(query, params = {}, txControl = AUTO_TX, operationParams, settings) {
            this.logger.trace('preparedQuery %o', query);
            this.logger.trace('parameters %o', params);
            let queryToExecute;
            let keepInCache = false;
            if (typeof query === 'string') {
                queryToExecute = {
                    yqlText: query
                };
                if ((settings === null || settings === void 0 ? void 0 : settings.keepInCache) !== undefined) {
                    keepInCache = settings.keepInCache;
                }
            }
            else {
                queryToExecute = {
                    id: query.queryId
                };
            }
            const request = {
                sessionId: this.sessionId,
                txControl,
                parameters: params,
                query: queryToExecute,
                operationParams,
            };
            if (keepInCache) {
                request.queryCachePolicy = { keepInCache };
            }
            const response = await this.api.executeDataQuery(request);
            const payload = utils_1.getOperationPayload(response);
            return ExecuteQueryResult.decode(payload);
        }
    }
    __decorate([
        retries_1.retryable(),
        utils_1.pessimizable
    ], Session.prototype, "delete", null);
    __decorate([
        retries_1.retryable(),
        utils_1.pessimizable
    ], Session.prototype, "keepAlive", null);
    __decorate([
        retries_1.retryable(),
        utils_1.pessimizable
    ], Session.prototype, "createTable", null);
    __decorate([
        retries_1.retryable(),
        utils_1.pessimizable
    ], Session.prototype, "dropTable", null);
    __decorate([
        retries_1.retryable(),
        utils_1.pessimizable
    ], Session.prototype, "describeTable", null);
    __decorate([
        retries_1.retryable(),
        utils_1.pessimizable
    ], Session.prototype, "beginTransaction", null);
    __decorate([
        retries_1.retryable(),
        utils_1.pessimizable
    ], Session.prototype, "commitTransaction", null);
    __decorate([
        retries_1.retryable(),
        utils_1.pessimizable
    ], Session.prototype, "rollbackTransaction", null);
    __decorate([
        retries_1.retryable(),
        utils_1.pessimizable
    ], Session.prototype, "prepareQuery", null);
    __decorate([
        utils_1.pessimizable
    ], Session.prototype, "executeQuery", null);
    return Session;
})();
exports.Session = Session;
let SessionPool = /** @class */ (() => {
    class SessionPool extends events_1.default {
        constructor(driver) {
            var _a;
            super();
            this.driver = driver;
            this.waiters = [];
            const poolSettings = (_a = driver.settings) === null || _a === void 0 ? void 0 : _a.poolSettings;
            this.minLimit = (poolSettings === null || poolSettings === void 0 ? void 0 : poolSettings.minLimit) || SessionPool.SESSION_MIN_LIMIT;
            this.maxLimit = (poolSettings === null || poolSettings === void 0 ? void 0 : poolSettings.maxLimit) || SessionPool.SESSION_MAX_LIMIT;
            this.sessions = new Set();
            this.newSessionsRequested = 0;
            this.sessionsBeingDeleted = 0;
            this.prepopulateSessions();
            this.sessionKeepAliveId = this.initListeners((poolSettings === null || poolSettings === void 0 ? void 0 : poolSettings.keepAlivePeriod) || constants_1.SESSION_KEEPALIVE_PERIOD);
            this.logger = logging_1.default();
        }
        async destroy() {
            this.logger.debug('Destroying pool...');
            clearInterval(this.sessionKeepAliveId);
            await Promise.all(lodash_1.default.map([...this.sessions], (session) => this.deleteSession(session)));
            this.logger.debug('Pool has been destroyed.');
        }
        initListeners(keepAlivePeriod) {
            return setInterval(async () => Promise.all(lodash_1.default.map([...this.sessions], (session) => {
                return session.keepAlive()
                    // delete session if error
                    .catch(() => this.deleteSession(session))
                    // ignore errors to avoid UnhandledPromiseRejectionWarning
                    .catch(() => Promise.resolve());
            })), keepAlivePeriod);
        }
        prepopulateSessions() {
            lodash_1.default.forEach(lodash_1.default.range(this.minLimit), () => this.createSession());
        }
        async createSession() {
            const sessionCreator = await this.driver.getSessionCreator();
            const session = await sessionCreator.create();
            session.on(SessionEvent.SESSION_RELEASE, () => {
                if (this.waiters.length > 0) {
                    const waiter = this.waiters.shift();
                    if (typeof waiter === "function") {
                        waiter(session);
                    }
                }
            });
            session.on(SessionEvent.SESSION_BROKEN, async () => {
                await this.deleteSession(session);
            });
            this.sessions.add(session);
            return session;
        }
        deleteSession(session) {
            if (session.isDeleted()) {
                return Promise.resolve();
            }
            this.sessionsBeingDeleted++;
            return session.delete()
                // delete session in any case
                .finally(() => {
                this.sessions.delete(session);
                this.sessionsBeingDeleted--;
            });
        }
        acquire(timeout = 0) {
            for (const session of this.sessions) {
                if (session.isFree()) {
                    return Promise.resolve(session.acquire());
                }
            }
            if (this.sessions.size + this.newSessionsRequested - this.sessionsBeingDeleted <= this.maxLimit) {
                this.newSessionsRequested++;
                return this.createSession()
                    .then((session) => {
                    return session.acquire();
                })
                    .finally(() => {
                    this.newSessionsRequested--;
                });
            }
            else {
                return new Promise((resolve, reject) => {
                    let timeoutId;
                    function waiter(session) {
                        clearTimeout(timeoutId);
                        resolve(session.acquire());
                    }
                    if (timeout) {
                        timeoutId = setTimeout(() => {
                            this.waiters.splice(this.waiters.indexOf(waiter), 1);
                            reject(new errors_1.SessionPoolEmpty(`No session became available within timeout of ${timeout} ms`));
                        }, timeout);
                    }
                    this.waiters.push(waiter);
                });
            }
        }
        async _withSession(session, callback, maxRetries = 0) {
            try {
                const result = await callback(session);
                session.release();
                return result;
            }
            catch (error) {
                if (error instanceof errors_1.BadSession || error instanceof errors_1.SessionBusy) {
                    this.logger.debug('Encountered bad or busy session, re-creating the session');
                    session.emit(SessionEvent.SESSION_BROKEN);
                    session = await this.createSession();
                    if (maxRetries > 0) {
                        this.logger.debug(`Re-running operation in new session, ${maxRetries} left.`);
                        session.acquire();
                        return this._withSession(session, callback, maxRetries - 1);
                    }
                }
                else {
                    session.release();
                }
                throw error;
            }
        }
        async withSession(callback, timeout = 0) {
            const session = await this.acquire(timeout);
            return this._withSession(session, callback);
        }
        async withSessionRetry(callback, timeout = 0, maxRetries = 10) {
            const session = await this.acquire(timeout);
            return this._withSession(session, callback, maxRetries);
        }
    }
    SessionPool.SESSION_MIN_LIMIT = 5;
    SessionPool.SESSION_MAX_LIMIT = 20;
    return SessionPool;
})();
exports.SessionPool = SessionPool;
class TableClient extends events_1.default {
    constructor(driver) {
        super();
        this.pool = new SessionPool(driver);
    }
    async withSession(callback, timeout = 0) {
        return this.pool.withSession(callback, timeout);
    }
    async withSessionRetry(callback, timeout = 0, maxRetries = 10) {
        return this.pool.withSessionRetry(callback, timeout, maxRetries);
    }
    async destroy() {
        await this.pool.destroy();
    }
}
exports.TableClient = TableClient;
class Column {
    constructor(name, type) {
        this.name = name;
        this.type = type;
    }
}
exports.Column = Column;
class StorageSettings {
    constructor(storageKind) {
        this.storageKind = storageKind;
    }
}
exports.StorageSettings = StorageSettings;
class ColumnFamilyPolicy {
    withName(name) {
        this.name = name;
        return this;
    }
    withData(data) {
        this.data = data;
        return this;
    }
    withExternal(external) {
        this.external = external;
        return this;
    }
    withKeepInMemory(keepInMemory) {
        this.keepInMemory = keepInMemory;
        return this;
    }
    withCompression(compression) {
        this.compression = compression;
        return this;
    }
}
exports.ColumnFamilyPolicy = ColumnFamilyPolicy;
class StoragePolicy {
    constructor() {
        this.columnFamilies = [];
    }
    withPresetName(presetName) {
        this.presetName = presetName;
        return this;
    }
    withSyslog(syslog) {
        this.syslog = syslog;
        return this;
    }
    withLog(log) {
        this.log = log;
        return this;
    }
    withData(data) {
        this.data = data;
        return this;
    }
    withExternal(external) {
        this.external = external;
        return this;
    }
    withKeepInMemory(keepInMemory) {
        this.keepInMemory = keepInMemory;
        return this;
    }
    withColumnFamilies(...columnFamilies) {
        for (const policy of columnFamilies) {
            this.columnFamilies.push(policy);
        }
        return this;
    }
}
exports.StoragePolicy = StoragePolicy;
class ExplicitPartitions {
    constructor(splitPoints) {
        this.splitPoints = splitPoints;
    }
}
exports.ExplicitPartitions = ExplicitPartitions;
class PartitioningPolicy {
    withPresetName(presetName) {
        this.presetName = presetName;
        return this;
    }
    withUniformPartitions(uniformPartitions) {
        this.uniformPartitions = uniformPartitions;
        return this;
    }
    withAutoPartitioning(autoPartitioning) {
        this.autoPartitioning = autoPartitioning;
        return this;
    }
    withExplicitPartitions(explicitPartitions) {
        this.explicitPartitions = explicitPartitions;
        return this;
    }
}
exports.PartitioningPolicy = PartitioningPolicy;
class ReplicationPolicy {
    withPresetName(presetName) {
        this.presetName = presetName;
        return this;
    }
    withReplicasCount(replicasCount) {
        this.replicasCount = replicasCount;
        return this;
    }
    withCreatePerAvailabilityZone(createPerAvailabilityZone) {
        this.createPerAvailabilityZone = createPerAvailabilityZone;
        return this;
    }
    withAllowPromotion(allowPromotion) {
        this.allowPromotion = allowPromotion;
        return this;
    }
}
exports.ReplicationPolicy = ReplicationPolicy;
class CompactionPolicy {
    constructor(presetName) {
        this.presetName = presetName;
    }
}
exports.CompactionPolicy = CompactionPolicy;
class ExecutionPolicy {
    constructor(presetName) {
        this.presetName = presetName;
    }
}
exports.ExecutionPolicy = ExecutionPolicy;
class CachingPolicy {
    constructor(presetName) {
        this.presetName = presetName;
    }
}
exports.CachingPolicy = CachingPolicy;
class TableProfile {
    withPresetName(presetName) {
        this.presetName = presetName;
        return this;
    }
    withStoragePolicy(storagePolicy) {
        this.storagePolicy = storagePolicy;
        return this;
    }
    withCompactionPolicy(compactionPolicy) {
        this.compactionPolicy = compactionPolicy;
        return this;
    }
    withPartitioningPolicy(partitioningPolicy) {
        this.partitioningPolicy = partitioningPolicy;
        return this;
    }
    withExecutionPolicy(executionPolicy) {
        this.executionPolicy = executionPolicy;
        return this;
    }
    withReplicationPolicy(replicationPolicy) {
        this.replicationPolicy = replicationPolicy;
        return this;
    }
    withCachingPolicy(cachingPolicy) {
        this.cachingPolicy = cachingPolicy;
        return this;
    }
}
exports.TableProfile = TableProfile;
class TableIndex {
    constructor(name) {
        this.name = name;
        this.indexColumns = [];
    }
    withIndexColumns(...indexColumns) {
        for (const index of indexColumns) {
            this.indexColumns.push(index);
        }
        return this;
    }
}
exports.TableIndex = TableIndex;
class TtlSettings {
    constructor(columnName, expireAfterSeconds = 0) {
        this.dateTypeColumn = { columnName, expireAfterSeconds };
    }
}
exports.TtlSettings = TtlSettings;
class TableDescription {
    constructor(columns = [], primaryKey = []) {
        this.columns = columns;
        this.primaryKey = primaryKey;
        this.indexes = [];
    }
    withColumn(column) {
        this.columns.push(column);
        return this;
    }
    withColumns(...columns) {
        for (const column of columns) {
            this.columns.push(column);
        }
        return this;
    }
    withPrimaryKey(key) {
        this.primaryKey.push(key);
        return this;
    }
    withPrimaryKeys(...keys) {
        for (const key of keys) {
            this.primaryKey.push(key);
        }
        return this;
    }
    withProfile(profile) {
        this.profile = profile;
        return this;
    }
    withIndex(index) {
        this.indexes.push(index);
        return this;
    }
    withIndexes(...indexes) {
        for (const index of indexes) {
            this.indexes.push(index);
        }
        return this;
    }
    withTtl(columnName, expireAfterSeconds = 0) {
        this.ttlSettings = new TtlSettings(columnName, expireAfterSeconds);
        return this;
    }
}
exports.TableDescription = TableDescription;
