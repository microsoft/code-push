import {Http} from "./acquisition-sdk";

export class CodePushError extends Error {
    constructor(message: string, options?: unknown) {
        super(
            message,
            // @ts-expect-error - need to enable es2022 (see: https://github.com/microsoft/TypeScript/blob/main/src/lib/es2022.error.d.ts)
            options
        );
        Object.setPrototypeOf(this, CodePushError.prototype);
    }
}

export class CodePushHttpError extends CodePushError {
    constructor(message: string, response: Http.Response) {
        super(message, {cause: response});
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
