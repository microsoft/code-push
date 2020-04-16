class CodePushError extends Error {
    constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, CodePushError.prototype);
    }
}

export class CodePushHttpError extends CodePushError { }

export class CodePushDeployStatusError extends CodePushError { }

export class CodePushPackageError extends CodePushError { }

export class CodePushAccessKeyError extends CodePushError { }
