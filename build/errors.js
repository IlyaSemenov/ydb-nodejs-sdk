"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimeoutExpired = exports.MissingStatus = exports.MissingValue = exports.MissingOperation = exports.SessionBusy = exports.Unsupported = exports.Undetermined = exports.Cancelled = exports.SessionExpired = exports.AlreadyExists = exports.NotFound = exports.PreconditionFailed = exports.Timeout = exports.BadSession = exports.GenericError = exports.SchemeError = exports.Overloaded = exports.Unavailable = exports.Aborted = exports.InternalError = exports.Unauthorized = exports.BadRequest = exports.SessionPoolEmpty = exports.Unauthenticated = exports.Unimplemented = exports.DeadlineExceed = exports.ConnectionLost = exports.ConnectionFailure = exports.ConnectionError = exports.YdbError = exports.StatusCode = void 0;
const TRANSPORT_STATUSES_FIRST = 401000;
const CLIENT_STATUSES_FIRST = 402000;
var StatusCode;
(function (StatusCode) {
    StatusCode[StatusCode["STATUS_CODE_UNSPECIFIED"] = 0] = "STATUS_CODE_UNSPECIFIED";
    StatusCode[StatusCode["SUCCESS"] = 400000] = "SUCCESS";
    StatusCode[StatusCode["BAD_REQUEST"] = 400010] = "BAD_REQUEST";
    StatusCode[StatusCode["UNAUTHORIZED"] = 400020] = "UNAUTHORIZED";
    StatusCode[StatusCode["INTERNAL_ERROR"] = 400030] = "INTERNAL_ERROR";
    StatusCode[StatusCode["ABORTED"] = 400040] = "ABORTED";
    StatusCode[StatusCode["UNAVAILABLE"] = 400050] = "UNAVAILABLE";
    StatusCode[StatusCode["OVERLOADED"] = 400060] = "OVERLOADED";
    StatusCode[StatusCode["SCHEME_ERROR"] = 400070] = "SCHEME_ERROR";
    StatusCode[StatusCode["GENERIC_ERROR"] = 400080] = "GENERIC_ERROR";
    StatusCode[StatusCode["TIMEOUT"] = 400090] = "TIMEOUT";
    StatusCode[StatusCode["BAD_SESSION"] = 400100] = "BAD_SESSION";
    StatusCode[StatusCode["PRECONDITION_FAILED"] = 400120] = "PRECONDITION_FAILED";
    StatusCode[StatusCode["ALREADY_EXISTS"] = 400130] = "ALREADY_EXISTS";
    StatusCode[StatusCode["NOT_FOUND"] = 400140] = "NOT_FOUND";
    StatusCode[StatusCode["SESSION_EXPIRED"] = 400150] = "SESSION_EXPIRED";
    StatusCode[StatusCode["CANCELLED"] = 400160] = "CANCELLED";
    StatusCode[StatusCode["UNDETERMINED"] = 400170] = "UNDETERMINED";
    StatusCode[StatusCode["UNSUPPORTED"] = 400180] = "UNSUPPORTED";
    StatusCode[StatusCode["SESSION_BUSY"] = 400190] = "SESSION_BUSY";
    StatusCode[StatusCode["CONNECTION_LOST"] = TRANSPORT_STATUSES_FIRST + 10] = "CONNECTION_LOST";
    StatusCode[StatusCode["CONNECTION_FAILURE"] = TRANSPORT_STATUSES_FIRST + 20] = "CONNECTION_FAILURE";
    StatusCode[StatusCode["DEADLINE_EXCEEDED"] = TRANSPORT_STATUSES_FIRST + 30] = "DEADLINE_EXCEEDED";
    StatusCode[StatusCode["CLIENT_INTERNAL_ERROR"] = TRANSPORT_STATUSES_FIRST + 40] = "CLIENT_INTERNAL_ERROR";
    StatusCode[StatusCode["UNIMPLEMENTED"] = TRANSPORT_STATUSES_FIRST + 50] = "UNIMPLEMENTED";
    StatusCode[StatusCode["UNAUTHENTICATED"] = CLIENT_STATUSES_FIRST + 30] = "UNAUTHENTICATED";
    StatusCode[StatusCode["SESSION_POOL_EMPTY"] = CLIENT_STATUSES_FIRST + 40] = "SESSION_POOL_EMPTY";
})(StatusCode = exports.StatusCode || (exports.StatusCode = {}));
let YdbError = /** @class */ (() => {
    class YdbError extends Error {
        constructor(message, issues = []) {
            super(message);
            this.issues = issues;
        }
        static formatIssues(issues) {
            return issues ? JSON.stringify(issues, null, 2) : '';
        }
        static checkStatus(operation) {
            if (!operation.status) {
                throw new MissingStatus('Missing status!');
            }
            const status = operation.status;
            if (operation.status && !SUCCESS_CODES.has(status)) {
                const ErrCls = SERVER_SIDE_ERROR_CODES.get(status);
                if (!ErrCls) {
                    throw new Error(`Unexpected status code ${status}!`);
                }
                else {
                    throw new ErrCls(`${ErrCls.name}: ${YdbError.formatIssues(operation.issues)}`, operation.issues);
                }
            }
        }
    }
    YdbError.status = StatusCode.STATUS_CODE_UNSPECIFIED;
    return YdbError;
})();
exports.YdbError = YdbError;
class ConnectionError extends YdbError {
}
exports.ConnectionError = ConnectionError;
let ConnectionFailure = /** @class */ (() => {
    class ConnectionFailure extends ConnectionError {
    }
    ConnectionFailure.status = StatusCode.CONNECTION_FAILURE;
    return ConnectionFailure;
})();
exports.ConnectionFailure = ConnectionFailure;
let ConnectionLost = /** @class */ (() => {
    class ConnectionLost extends ConnectionError {
    }
    ConnectionLost.status = StatusCode.CONNECTION_LOST;
    return ConnectionLost;
})();
exports.ConnectionLost = ConnectionLost;
let DeadlineExceed = /** @class */ (() => {
    class DeadlineExceed extends ConnectionError {
    }
    DeadlineExceed.status = StatusCode.DEADLINE_EXCEEDED;
    return DeadlineExceed;
})();
exports.DeadlineExceed = DeadlineExceed;
let Unimplemented = /** @class */ (() => {
    class Unimplemented extends ConnectionError {
    }
    Unimplemented.status = StatusCode.UNIMPLEMENTED;
    return Unimplemented;
})();
exports.Unimplemented = Unimplemented;
let Unauthenticated = /** @class */ (() => {
    class Unauthenticated extends YdbError {
    }
    Unauthenticated.status = StatusCode.UNAUTHENTICATED;
    return Unauthenticated;
})();
exports.Unauthenticated = Unauthenticated;
let SessionPoolEmpty = /** @class */ (() => {
    class SessionPoolEmpty extends YdbError {
    }
    SessionPoolEmpty.status = StatusCode.SESSION_POOL_EMPTY;
    return SessionPoolEmpty;
})();
exports.SessionPoolEmpty = SessionPoolEmpty;
let BadRequest = /** @class */ (() => {
    class BadRequest extends YdbError {
    }
    BadRequest.status = StatusCode.BAD_REQUEST;
    return BadRequest;
})();
exports.BadRequest = BadRequest;
let Unauthorized = /** @class */ (() => {
    class Unauthorized extends YdbError {
    }
    Unauthorized.status = StatusCode.UNAUTHORIZED;
    return Unauthorized;
})();
exports.Unauthorized = Unauthorized;
let InternalError = /** @class */ (() => {
    class InternalError extends YdbError {
    }
    InternalError.status = StatusCode.INTERNAL_ERROR;
    return InternalError;
})();
exports.InternalError = InternalError;
let Aborted = /** @class */ (() => {
    class Aborted extends YdbError {
    }
    Aborted.status = StatusCode.ABORTED;
    return Aborted;
})();
exports.Aborted = Aborted;
let Unavailable = /** @class */ (() => {
    class Unavailable extends YdbError {
    }
    Unavailable.status = StatusCode.UNAVAILABLE;
    return Unavailable;
})();
exports.Unavailable = Unavailable;
let Overloaded = /** @class */ (() => {
    class Overloaded extends YdbError {
    }
    Overloaded.status = StatusCode.OVERLOADED;
    return Overloaded;
})();
exports.Overloaded = Overloaded;
let SchemeError = /** @class */ (() => {
    class SchemeError extends YdbError {
    }
    SchemeError.status = StatusCode.SCHEME_ERROR;
    return SchemeError;
})();
exports.SchemeError = SchemeError;
let GenericError = /** @class */ (() => {
    class GenericError extends YdbError {
    }
    GenericError.status = StatusCode.GENERIC_ERROR;
    return GenericError;
})();
exports.GenericError = GenericError;
let BadSession = /** @class */ (() => {
    class BadSession extends YdbError {
    }
    BadSession.status = StatusCode.BAD_SESSION;
    return BadSession;
})();
exports.BadSession = BadSession;
let Timeout = /** @class */ (() => {
    class Timeout extends YdbError {
    }
    Timeout.status = StatusCode.TIMEOUT;
    return Timeout;
})();
exports.Timeout = Timeout;
let PreconditionFailed = /** @class */ (() => {
    class PreconditionFailed extends YdbError {
    }
    PreconditionFailed.status = StatusCode.PRECONDITION_FAILED;
    return PreconditionFailed;
})();
exports.PreconditionFailed = PreconditionFailed;
let NotFound = /** @class */ (() => {
    class NotFound extends YdbError {
    }
    NotFound.status = StatusCode.NOT_FOUND;
    return NotFound;
})();
exports.NotFound = NotFound;
let AlreadyExists = /** @class */ (() => {
    class AlreadyExists extends YdbError {
    }
    AlreadyExists.status = StatusCode.ALREADY_EXISTS;
    return AlreadyExists;
})();
exports.AlreadyExists = AlreadyExists;
let SessionExpired = /** @class */ (() => {
    class SessionExpired extends YdbError {
    }
    SessionExpired.status = StatusCode.SESSION_EXPIRED;
    return SessionExpired;
})();
exports.SessionExpired = SessionExpired;
let Cancelled = /** @class */ (() => {
    class Cancelled extends YdbError {
    }
    Cancelled.status = StatusCode.CANCELLED;
    return Cancelled;
})();
exports.Cancelled = Cancelled;
let Undetermined = /** @class */ (() => {
    class Undetermined extends YdbError {
    }
    Undetermined.status = StatusCode.UNDETERMINED;
    return Undetermined;
})();
exports.Undetermined = Undetermined;
let Unsupported = /** @class */ (() => {
    class Unsupported extends YdbError {
    }
    Unsupported.status = StatusCode.UNSUPPORTED;
    return Unsupported;
})();
exports.Unsupported = Unsupported;
let SessionBusy = /** @class */ (() => {
    class SessionBusy extends YdbError {
    }
    SessionBusy.status = StatusCode.SESSION_BUSY;
    return SessionBusy;
})();
exports.SessionBusy = SessionBusy;
const SUCCESS_CODES = new Set([
    StatusCode.STATUS_CODE_UNSPECIFIED,
    StatusCode.SUCCESS
]);
const SERVER_SIDE_ERROR_CODES = new Map([
    [StatusCode.BAD_REQUEST, BadRequest],
    [StatusCode.UNAUTHORIZED, Unauthorized],
    [StatusCode.INTERNAL_ERROR, InternalError],
    [StatusCode.ABORTED, Aborted],
    [StatusCode.UNAVAILABLE, Unavailable],
    [StatusCode.OVERLOADED, Overloaded],
    [StatusCode.SCHEME_ERROR, SchemeError],
    [StatusCode.GENERIC_ERROR, GenericError],
    [StatusCode.TIMEOUT, Timeout],
    [StatusCode.BAD_SESSION, BadSession],
    [StatusCode.PRECONDITION_FAILED, PreconditionFailed],
    [StatusCode.ALREADY_EXISTS, AlreadyExists],
    [StatusCode.NOT_FOUND, NotFound],
    [StatusCode.SESSION_EXPIRED, SessionExpired],
    [StatusCode.CANCELLED, Cancelled],
    [StatusCode.UNDETERMINED, Undetermined],
    [StatusCode.UNSUPPORTED, Unsupported],
    [StatusCode.SESSION_BUSY, SessionBusy],
]);
class MissingOperation extends YdbError {
}
exports.MissingOperation = MissingOperation;
class MissingValue extends YdbError {
}
exports.MissingValue = MissingValue;
class MissingStatus extends YdbError {
}
exports.MissingStatus = MissingStatus;
class TimeoutExpired extends YdbError {
}
exports.TimeoutExpired = TimeoutExpired;
