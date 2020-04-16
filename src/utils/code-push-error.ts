export class CodePushError extends Error {
    constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, CodePushError.prototype);
    }
}

export class CodePushHttpError extends CodePushError {
    constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, CodePushHttpError.prototype);
    }
}

export class CodePushDeployStatusError extends CodePushError {
    constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, CodePushDeployStatusError.prototype);
    }
}

export class CodePushPackageError extends CodePushError {
    constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, CodePushPackageError.prototype);
    }
}

export class CodePushUnauthorizedError extends CodePushError {
    constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, CodePushUnauthorizedError.prototype);
    }
}
