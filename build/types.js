"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypedData = exports.declareType = exports.typeMetadataKey = void 0;
const lodash_1 = __importDefault(require("lodash"));
const long_1 = __importDefault(require("long"));
const bundle_1 = require("../proto/bundle");
require("reflect-metadata");
var Type = bundle_1.Ydb.Type;
var NullValue = bundle_1.google.protobuf.NullValue;
var PrimitiveTypeId = bundle_1.Ydb.Type.PrimitiveTypeId;
exports.typeMetadataKey = Symbol('type');
function declareType(type) {
    return Reflect.metadata(exports.typeMetadataKey, type);
}
exports.declareType = declareType;
const primitiveTypeToValue = {
    [Type.PrimitiveTypeId.BOOL]: 'boolValue',
    [Type.PrimitiveTypeId.INT8]: 'int32Value',
    [Type.PrimitiveTypeId.UINT8]: 'uint32Value',
    [Type.PrimitiveTypeId.INT16]: 'int32Value',
    [Type.PrimitiveTypeId.UINT16]: 'uint32Value',
    [Type.PrimitiveTypeId.INT32]: 'int32Value',
    [Type.PrimitiveTypeId.UINT32]: 'uint32Value',
    [Type.PrimitiveTypeId.INT64]: 'int64Value',
    [Type.PrimitiveTypeId.UINT64]: 'uint64Value',
    [Type.PrimitiveTypeId.FLOAT]: 'floatValue',
    [Type.PrimitiveTypeId.DOUBLE]: 'doubleValue',
    [Type.PrimitiveTypeId.STRING]: 'bytesValue',
    [Type.PrimitiveTypeId.UTF8]: 'textValue',
    [Type.PrimitiveTypeId.YSON]: 'bytesValue',
    [Type.PrimitiveTypeId.JSON]: 'textValue',
    [Type.PrimitiveTypeId.UUID]: 'textValue',
    [Type.PrimitiveTypeId.DATE]: 'uint32Value',
    [Type.PrimitiveTypeId.DATETIME]: 'uint32Value',
    [Type.PrimitiveTypeId.TIMESTAMP]: 'uint64Value',
    [Type.PrimitiveTypeId.INTERVAL]: 'uint64Value',
    [Type.PrimitiveTypeId.TZ_DATE]: 'textValue',
    [Type.PrimitiveTypeId.TZ_DATETIME]: 'textValue',
    [Type.PrimitiveTypeId.TZ_TIMESTAMP]: 'textValue',
};
const parseLong = (input) => {
    const long = typeof input === 'string' ? long_1.default.fromString(input) : long_1.default.fromNumber(input);
    return long.high ? long : long.low;
};
const valueToNativeConverters = {
    'boolValue': (input) => Boolean(input),
    'int32Value': (input) => Number(input),
    'uint32Value': (input) => Number(input),
    'int64Value': (input) => parseLong(input),
    'uint64Value': (input) => parseLong(input),
    'floatValue': (input) => Number(input),
    'doubleValue': (input) => Number(input),
    'bytesValue': (input) => Buffer.from(input, 'base64').toString(),
    'textValue': (input) => input,
    'nullFlagValue': () => null,
};
function convertPrimitiveValueToNative(type, value) {
    let label, input;
    for ([label, input] of Object.entries(value)) {
        if (label !== 'items' && label !== 'pairs') {
            break;
        }
    }
    if (!label) {
        throw new Error(`Expected a primitive value, got ${value} instead!`);
    }
    let typeId = null;
    if (type.optionalType) {
        const innerType = type.optionalType.item;
        if (label === 'nullFlagValue') {
            return null;
        }
        else if (innerType && innerType.typeId) {
            typeId = innerType.typeId;
        }
    }
    else if (type.typeId) {
        typeId = type.typeId;
    }
    if (typeId === null) {
        throw new Error(`Got empty typeId, type is ${JSON.stringify(type)}, value is ${JSON.stringify(value)}.`);
    }
    return objectFromValue(typeId, valueToNativeConverters[label](input));
}
function objectFromValue(typeId, value) {
    switch (typeId) {
        case PrimitiveTypeId.DATE:
            return new Date(value * 3600 * 1000 * 24);
        case PrimitiveTypeId.DATETIME:
            return new Date(value * 1000);
        case PrimitiveTypeId.TIMESTAMP:
            return new Date(value / 1000);
        case PrimitiveTypeId.TZ_DATE:
        case PrimitiveTypeId.TZ_DATETIME:
        case PrimitiveTypeId.TZ_TIMESTAMP:
            return new Date(value);
        default:
            return value;
    }
}
function preparePrimitiveValue(typeId, value) {
    switch (typeId) {
        case PrimitiveTypeId.DATE:
            return Number(value) / 3600 / 1000 / 24;
        case PrimitiveTypeId.DATETIME:
            return Number(value) / 1000;
        case PrimitiveTypeId.TIMESTAMP:
            return Number(value) * 1000;
        case PrimitiveTypeId.TZ_DATE:
            return value.toDateString();
        case PrimitiveTypeId.TZ_DATETIME:
        case PrimitiveTypeId.TZ_TIMESTAMP:
            return value.toISOString();
        default:
            return value;
    }
}
function typeToValue(type, value) {
    if (!type) {
        if (value) {
            throw new Error(`Got no type while the value is ${value}`);
        }
        else {
            throw new Error('Both type and value are empty');
        }
    }
    else if (type.typeId) {
        const valueLabel = primitiveTypeToValue[type.typeId];
        if (valueLabel) {
            return { [valueLabel]: preparePrimitiveValue(type.typeId, value) };
        }
        else {
            throw new Error(`Unknown PrimitiveTypeId: ${type.typeId}`);
        }
    }
    else if (type.decimalType) {
        const numericValue = BigInt(value);
        const low = numericValue & BigInt('0xffffffffffffffff');
        const hi = numericValue >> BigInt('64');
        return {
            low_128: long_1.default.fromString(low.toString()),
            high_128: long_1.default.fromString(hi.toString())
        };
    }
    else if (type.optionalType) {
        const innerType = type.optionalType.item;
        if (value !== undefined && value !== null) {
            return typeToValue(innerType, value);
        }
        else {
            return {
                nullFlagValue: NullValue.NULL_VALUE
            };
        }
    }
    else if (type.listType) {
        const listType = type.listType;
        return {
            items: lodash_1.default.map(value, (item) => typeToValue(listType.item, item))
        };
    }
    else if (type.tupleType) {
        const elements = type.tupleType.elements;
        return {
            items: lodash_1.default.map(value, (item, index) => typeToValue(elements[index], item))
        };
    }
    else if (type.structType) {
        const members = type.structType.members;
        return {
            items: lodash_1.default.map(value, (item, index) => {
                const type = members[index].type;
                return typeToValue(type, item);
            })
        };
    }
    else if (type.dictType) {
        const keyType = type.dictType.key;
        const payloadType = type.dictType.payload;
        return {
            pairs: lodash_1.default.map(lodash_1.default.entries(value), ([key, value]) => ({
                key: typeToValue(keyType, key),
                payload: typeToValue(payloadType, value)
            }))
        };
    }
    else if (type.variantType) {
        let variantIndex = -1;
        if (type.variantType.tupleItems) {
            const elements = type.variantType.tupleItems.elements;
            return {
                items: lodash_1.default.map(value, (item, index) => {
                    if (item) {
                        variantIndex = index;
                        return typeToValue(elements[index], item);
                    }
                    return item;
                }),
                variantIndex
            };
        }
        else if (type.variantType.structItems) {
            const members = type.variantType.structItems.members;
            return {
                items: lodash_1.default.map(value, (item, index) => {
                    if (item) {
                        variantIndex = index;
                        const type = members[index].type;
                        return typeToValue(type, item);
                    }
                    return item;
                }),
                variantIndex
            };
        }
        throw new Error('Either tupleItems or structItems should be present in VariantType!');
    }
    else {
        throw new Error(`Unknown type ${type}`);
    }
}
class TypedData {
    constructor(data) {
        lodash_1.default.assign(this, data);
    }
    getType(propertyKey) {
        const typeMeta = Reflect.getMetadata(exports.typeMetadataKey, this, propertyKey);
        if (!typeMeta) {
            throw new Error(`Property ${propertyKey} should be decorated with @declareType!`);
        }
        return typeMeta;
    }
    getValue(propertyKey) {
        const type = this.getType(propertyKey);
        return typeToValue(type, this[propertyKey]);
    }
    getTypedValue(propertyKey) {
        return {
            type: this.getType(propertyKey),
            value: this.getValue(propertyKey)
        };
    }
    get typedProperties() {
        return lodash_1.default.filter(Reflect.ownKeys(this), (key) => (typeof key === 'string' && Reflect.hasMetadata(exports.typeMetadataKey, this, key)));
    }
    getRowType() {
        return {
            structType: {
                members: lodash_1.default.map(this.typedProperties, (propertyKey) => ({
                    name: lodash_1.default.snakeCase(propertyKey),
                    type: this.getType(propertyKey)
                }))
            }
        };
    }
    getRowValue() {
        return {
            items: lodash_1.default.map(this.typedProperties, (propertyKey) => {
                return this.getValue(propertyKey);
            })
        };
    }
    static createNativeObjects(resultSet) {
        const { rows, columns } = resultSet;
        if (!columns) {
            return [];
        }
        return lodash_1.default.map(rows, (row) => {
            const obj = lodash_1.default.reduce(row.items, (acc, value, index) => {
                const column = columns[index];
                if (column.name && column.type) {
                    acc[lodash_1.default.camelCase(column.name)] = convertPrimitiveValueToNative(column.type, value);
                }
                return acc;
            }, {});
            return new this(obj);
        });
    }
    static asTypedCollection(collection) {
        return {
            type: {
                listType: {
                    item: collection[0].getRowType()
                }
            },
            value: {
                items: collection.map((item) => item.getRowValue())
            }
        };
    }
}
exports.TypedData = TypedData;
