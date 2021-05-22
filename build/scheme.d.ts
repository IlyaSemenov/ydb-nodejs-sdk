import { Ydb } from "../proto/bundle";
import Driver from "./driver";
import IOperationParams = Ydb.Operations.IOperationParams;
import ListDirectoryResult = Ydb.Scheme.ListDirectoryResult;
import DescribePathResult = Ydb.Scheme.DescribePathResult;
import IPermissionsAction = Ydb.Scheme.IPermissionsAction;
import { util } from "protobufjs";
import EventEmitter = util.EventEmitter;
export default class SchemeClient extends EventEmitter {
    private driver;
    private schemeServices;
    constructor(driver: Driver);
    private getSchemeService;
    makeDirectory(path: string, operationParams?: IOperationParams): Promise<void>;
    removeDirectory(path: string, operationParams?: IOperationParams): Promise<void>;
    listDirectory(path: string, operationParams?: IOperationParams): Promise<ListDirectoryResult>;
    describePath(path: string, operationParams?: IOperationParams): Promise<DescribePathResult>;
    modifyPermissions(path: string, permissionActions: IPermissionsAction[], clearPermissions?: boolean, operationParams?: IOperationParams): Promise<void>;
    destroy(): Promise<void>;
}
