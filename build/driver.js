"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discovery_1 = __importDefault(require("./discovery"));
const table_1 = require("./table");
const constants_1 = require("./constants");
const errors_1 = require("./errors");
const logging_1 = __importDefault(require("./logging"));
const scheme_1 = __importDefault(require("./scheme"));
const constants_2 = require("./constants");
class Driver {
    constructor(entryPoint, database, authService, settings = {}) {
        this.entryPoint = entryPoint;
        this.database = database;
        this.authService = authService;
        this.settings = settings;
        this.discoveryService = new discovery_1.default(this.entryPoint, this.database, constants_1.ENDPOINT_DISCOVERY_PERIOD, authService);
        this.discoveryService.on(constants_2.Events.ENDPOINT_REMOVED, (endpoint) => {
            this.sessionCreators.delete(endpoint);
        });
        this.sessionCreators = new Map();
        this.tableClient = new table_1.TableClient(this);
        this.schemeClient = new scheme_1.default(this);
        this.logger = logging_1.default();
    }
    async ready(timeout) {
        try {
            await this.discoveryService.ready(timeout);
            this.logger.debug('Driver is ready!');
            return true;
        }
        catch (e) {
            if (e instanceof errors_1.TimeoutExpired) {
                return false;
            }
            else {
                throw e;
            }
        }
    }
    async getEndpoint() {
        return await this.discoveryService.getEndpoint();
    }
    async destroy() {
        this.logger.debug('Destroying driver...');
        this.discoveryService.destroy();
        await this.tableClient.destroy();
        await this.schemeClient.destroy();
        this.logger.debug('Driver has been destroyed.');
    }
    async getSessionCreator() {
        const endpoint = await this.getEndpoint();
        if (!this.sessionCreators.has(endpoint)) {
            this.sessionCreators.set(endpoint, new table_1.SessionService(endpoint, this.authService));
        }
        return this.sessionCreators.get(endpoint);
    }
}
exports.default = Driver;
