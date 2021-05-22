"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pino_1 = __importDefault(require("pino"));
const LOGLEVEL = process.env.YDB_SDK_LOGLEVEL || 'info';
const PRETTY_LOGS = Boolean(process.env.YDB_SDK_PRETTY_LOGS);
let logger = null;
const defaultLoggerOptions = {
    level: LOGLEVEL,
    prettyPrint: PRETTY_LOGS,
};
function getLogger(options = defaultLoggerOptions) {
    if (!logger) {
        logger = pino_1.default(options);
    }
    return logger;
}
exports.default = getLogger;
