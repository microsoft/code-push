export module Command {
    
    function getCommand(args: string) {
        return "code-push " + args;
    }

    function getCommandJsonFormat(args: string) {
        return "code-push " + args + " --format json";
    }
    
    // App commands

    export function appLs(): string {
        return getCommandJsonFormat("app ls");
    }

    export function appAdd(appName: string): string {
        return getCommand("app add " + appName);
    }

    export function appRename(oldAppName: string, newAppName: string): string {
        return getCommand("app rename " + oldAppName + " " + newAppName);
    }

    export function appRm(appName: string): string {
        return getCommand("app rm " + appName);
    }

    // Deployment commands

    export function deploymentLs(appName: string): string {
        return getCommandJsonFormat("deployment ls " + appName);
    }

    export function deploymentAdd(appName: string, deploymentName: string): string {
        return getCommand("deployment add " + appName + " " + deploymentName);
    }

    export function deploymentRename(appName: string, oldDeploymentName: string, newDeploymentName: string): string {
        return getCommand("deployment rename " + appName + " " + oldDeploymentName + " " + newDeploymentName);
    }

    export function deploymentRm(appName: string, deploymentName: string): string {
        return getCommand("deployment rm " + appName + " " + deploymentName);
    }
    
    export function deploymentH(appName: string, deploymentName: string): string {
        return getCommandJsonFormat("deployment h " + appName + " " + deploymentName);
    }
    
    export function deploymentClear(appName: string, deploymentName: string): string {
        return getCommand("deployment clear " + appName + " " + deploymentName);
    }
    
    // Release
    
    export interface PackageOptions {
        description?: string;
        disabled?: boolean;
        mandatory?: boolean;
        rollout?: number;
    }
    
    export interface ReleaseOptions extends PackageOptions {
        deploymentName?: string;
    }
    
    export function release(appName: string, updateContentsPath: string, targetBinaryVersion: string, options?: ReleaseOptions): string {
        updateContentsPath = updateContentsPath.replace(/\\/g, "/");
        var args = mergeOptionsIntoList(options);
        return getCommand("release " + [appName, updateContentsPath, targetBinaryVersion, args].join(" "));
    }
    
    // Patch
    
    export interface PatchOptions extends PackageOptions {
        label?: string;
        targetBinaryVersion?: string;
    }
    
    export function patch(appName: string, deploymentName: string, options?: PatchOptions): string {
        var args = mergeOptionsIntoList(options);
        return getCommand("patch " + [appName, deploymentName, args].join(" "));
    }
    
    // Promote
    
    export interface PromoteOptions extends PackageOptions {
        targetBinaryVersion?: string;
    }
    
    export function promote(appName: string, oldDeploymentName: string, newDeploymentName: string, options?: PromoteOptions): string {
        var args = mergeOptionsIntoList(options);
        return getCommand("promote " + [appName, oldDeploymentName, newDeploymentName, args].join(" "));
    }
    
    // Rollback
    
    export interface RollbackOptions {
        targetRelease?: string;
    }
    
    export function rollback(appName: string, deploymentName: string, options?: RollbackOptions): string {
        var args = mergeOptionsIntoList(options);
        return getCommand("rollback " + [appName, deploymentName, args].join(" "));
    }
    
    // Misc
    
    export const invalidFormatName: string = "not_a_real_format";
    export function invalidFormat(command: string): string {
        return command.replace(/--format \S+/, "") + "--format " + invalidFormatName;
    }
    
    // Prompt
    
    // NOTE: this is not "Are you sure? (Y/n): " but it works the same
    export const PROMPT_ARE_YOU_SURE: RegExp = /.*/;
    
    export const RESPONSE_ACCEPT: string = "Y\n";
    
    export const RESPONSE_REJECT: string = "n\n";
    
    // Utility
    
    function mergeOptionsIntoList(options: any) {
        return !!options ? Object.keys(options).map((key: string) => { return "--" + key + " " + options[key]; }).join(" ") : "";
    }
}