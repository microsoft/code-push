class CodePushError extends Error {
    constructor(message: string) {
        super(message);
        (<any>Object).setPrototypeOf(this, CodePushError.prototype);
    }
}

class CodePushHttpError extends CodePushError {
    constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, CodePushHttpError.prototype);
    }
}

class CodePushDeployStatusError extends CodePushError {
    constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, CodePushDeployStatusError.prototype);
    }
}

class CodePushDeployPackageError extends CodePushError {
    constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, CodePushDeployPackageError.prototype);
    }
}

class CodePushAccessKeyError extends CodePushError {
    constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, CodePushAccessKeyError.prototype);
    }
}

export function getCodePushDeployStatusError(message: string): CodePushDeployStatusError {
    return new CodePushDeployStatusError(message);
}

export function getCodePushHttpError(message: string): CodePushHttpError {
    return new CodePushHttpError(message);
}

export function getCodePushPackageError(message: string): CodePushDeployPackageError {
    return new CodePushDeployPackageError(message);
}

export function getCodePushAccessKeyError(message: string): CodePushAccessKeyError {
    return new CodePushAccessKeyError(message);
}
