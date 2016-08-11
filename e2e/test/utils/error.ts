import { Command } from "./command";

export module Error {
    const PREFIX: string = "[Error]  ";
    const PREFIX_REGEX: string = "\\[Error\\]  ";
    
    // App

    export function appNotFound(appName: string): string {
        return PREFIX + "App \"" + appName + "\" does not exist.";
    }

    export function appConflict(appName: string): string {
        return PREFIX + "An app named '" + appName + "' already exists.";
    }
    
    // Deployment

    export function deploymentNotFound(deploymentName: string): string {
        return PREFIX + "Deployment \"" + deploymentName + "\" does not exist.";
    }

    export function deploymentConflict(deploymentName: string): string {
        return PREFIX + "A deployment named '" + deploymentName + "' already exists.";
    }
    
    // Release
    
    export function releaseUsage(): RegExp {
        return new RegExp("Usage: code-push release.*");
    }
    
    export function releaseBinaryZip(): string {
        return PREFIX + "It is unnecessary to package releases in a .zip or binary file. Please specify the direct path to the update content's directory (e.g. /platforms/ios/www) or file (e.g. main.jsbundle).";
    }
    
    export function releaseIdentical(): string {
        return PREFIX + "The uploaded package is identical to the contents of the specified deployment's current release.";
    }
    
    export function releaseRollbackInProgress(): string {
        return PREFIX + "Please update the previous release to 100% rollout before releasing a new package.";
    }
    
    // Patch
    
    export function patchUsage(): RegExp {
        return new RegExp("Usage: code-push patch.*");
    }
    
    export function patchNoneSpecified(): string {
        return PREFIX + "At least one property must be specified to patch a release.";
    }
    
    export function patchLabelNotFound(): string {
        return PREFIX + "Release not found for given label.";
    }
    
    // Promote
    
    export function promoteUsage(): RegExp {
        return new RegExp("Usage: code-push promote.*");
    }
    
    export function promoteNoReleases(): string {
        return PREFIX + "Cannot promote from a deployment with no enabled releases.";
    }
    
    // Rollback
    
    export function rollbackCancelled(): string {
        return PREFIX + "Rollback cancelled";
    }
    
    export function rollbackNoReleases(): string {
        return PREFIX + "Cannot perform rollback because there are no releases on this deployment.";
    }
    
    export function rollbackLabelNotFound(label: string): string {
        return PREFIX + "Cannot perform rollback because the target release (" + label + ") could not be found in the deployment history.";
    }
    
    export function rollbackNoPriorReleases(): string {
        return PREFIX + "Cannot perform rollback because there are no prior releases to rollback to.";
    }
    
    export function rollbackAlreadyLatest(label: string): string {
        return PREFIX + "Cannot perform rollback because the target release (" + label + ") is already the latest release.";
    }
    
    // Misc
    
    export function enoent(): string {
        return PREFIX + "ENOENT: no such file or directory";
    }
    
    export function invalidEmail(email: string): string {
        return PREFIX + "\"" + email + "\" is an invalid e-mail address.";
    }
    
    export function invalidFormat(): string {
        return PREFIX + "Invalid format:  " + Command.invalidFormatName + ".";
    }
    
    export function invalidSemver(): string {
        return PREFIX + "Please use a semver-compliant target binary version range, for example \"1.0.0\", \"*\" or \"^1.2.3\".";
    }
    
    export function deploymentNoReleases(): string {
        return PREFIX + "Deployment has no releases.";
    }
    
    export function rolloutAgainstFull(): string {
        return PREFIX + "Cannot update rollout value for a completed rollout release.";
    }
    
    export function rolloutDecreasing(current: number): string {
        return PREFIX + "Rollout value must be greater than \"" + current + "\", the existing value.";
    }
    
}