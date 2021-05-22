import { Ydb } from '../proto/bundle';
import 'reflect-metadata';
import IType = Ydb.IType;
import IValue = Ydb.IValue;
import ITypedValue = Ydb.ITypedValue;
import IResultSet = Ydb.IResultSet;
export declare const typeMetadataKey: unique symbol;
export declare function declareType(type: IType): {
    (target: Function): void;
    (target: Object, propertyKey: string | symbol): void;
};
export declare class TypedData {
    [property: string]: any;
    constructor(data: Record<string, any>);
    getType(propertyKey: string): IType;
    getValue(propertyKey: string): IValue;
    getTypedValue(propertyKey: string): ITypedValue;
    get typedProperties(): string[];
    getRowType(): {
        structType: {
            members: {
                name: string;
                type: Ydb.IType;
            }[];
        };
    };
    getRowValue(): {
        items: Ydb.IValue[];
    };
    static createNativeObjects(resultSet: IResultSet): TypedData[];
    static asTypedCollection(collection: TypedData[]): {
        type: {
            listType: {
                item: {
                    structType: {
                        members: {
                            name: string;
                            type: Ydb.IType;
                        }[];
                    };
                };
            };
        };
        value: {
            items: {
                items: Ydb.IValue[];
            }[];
        };
    };
}
