"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVersionHeader = void 0;
const pkgInfo = require('../package.json');
function getVersion() {
    return pkgInfo.version;
}
function getLibraryName() {
    return `ydb-nodejs-sdk/${getVersion()}`;
}
function getVersionHeader() {
    return ['x-ydb-sdk-build-info', getLibraryName()];
}
exports.getVersionHeader = getVersionHeader;
