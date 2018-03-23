/// <reference path="../../definitions/generated/code-push.d.ts" />

import AccountManager = require("code-push");
import * as chalk from "chalk";
var childProcess = require("child_process");
import debugCommand from "./commands/debug";
import * as fs from "fs";
var mkdirp = require("mkdirp");
var g2js = require("gradle-to-js/lib/parser");
import * as moment from "moment";
var opener = require("opener");
import * as os from "os";
import * as path from "path";
var plist = require("plist");
var progress = require("progress");
var prompt = require("prompt");
import * as Q from "q";
import * as recursiveFs from "recursive-fs";
var rimraf = require("rimraf");
import * as semver from "semver";
var simctl = require("simctl");
import slash = require("slash");
var Table = require("cli-table");
import * as yazl from "yazl";
var which = require("which");
import wordwrap = require("wordwrap");
import { CommonUtils } from "./common-utils";
import * as cli from "../definitions/cli";
import hooks from "./release-hooks/index";
import { AccessKey, Account, App, CodePushError, CollaboratorMap, CollaboratorProperties, Deployment, DeploymentMetrics, Headers, Package, PackageInfo, Session, UpdateMetrics } from "code-push/script/types";

var configFilePath: string = path.join(process.env.LOCALAPPDATA || process.env.HOME, ".code-push.config");
var emailValidator = require("email-validator");
var packageJson = require("../package.json");
var parseXml = Q.denodeify(require("xml2js").parseString);
var progress = require("progress");
import Promise = Q.Promise;
var properties = require("properties");

const ACTIVE_METRICS_KEY: string = "Active";
const CLI_HEADERS: Headers = {
    "X-CodePush-CLI-Version": packageJson.version
};
const DOWNLOADED_METRICS_KEY: string = "Downloaded";

interface NameToCountMap {
    [name: string]: number;
}

/** Deprecated */
interface ILegacyLoginConnectionInfo {
    accessKeyName: string;
}

interface ILoginConnectionInfo {
    accessKey: string;
    customServerUrl?: string;   // A custom serverUrl for internal debugging purposes
    preserveAccessKeyOnLogout?: boolean;
    proxy?: string; // To specify the proxy url explicitly, other than the environment var (HTTP_PROXY)
    noProxy?: boolean; // To suppress the environment proxy setting, like HTTP_PROXY
}

export interface UpdateMetricsWithTotalActive extends UpdateMetrics {
    totalActive: number;
}

export interface PackageWithMetrics {
    metrics?: UpdateMetricsWithTotalActive;
}

export var log = (message: string | Chalk.ChalkChain): void => console.log(message);
export var sdk: AccountManager;
export var spawn = childProcess.spawn;
export var execSync = childProcess.execSync;

var connectionInfo: ILoginConnectionInfo;

export var confirm = (message: string = "Are you sure?"): Promise<boolean> => {
    message += " (y/N):";
    return Promise<boolean>((resolve, reject, notify): void => {
        prompt.message = "";
        prompt.delimiter = "";

        prompt.start();

        prompt.get({
            properties: {
                response: {
                    description: chalk.cyan(message)
                }
            }
        }, (err: any, result: any): void => {
            var accepted = result.response && result.response.toLowerCase() === "y";
            var rejected = !result.response || result.response.toLowerCase() === "n";

            if (accepted) {
                resolve(true);
            } else {
                if (!rejected) {
                    console.log("Invalid response: \"" + result.response + "\"");
                }
                resolve(false);
            }
        });
    });
}

function accessKeyAdd(command: cli.IAccessKeyAddCommand): Promise<void> {
    return sdk.addAccessKey(command.name, command.ttl)
        .then((accessKey: AccessKey) => {
            log(`Successfully created the "${command.name}" access key: ${accessKey.key}`);
            log("Make sure to save this key value somewhere safe, since you won't be able to view it from the CLI again!");
        });
}

function accessKeyPatch(command: cli.IAccessKeyPatchCommand): Promise<void> {
    const willUpdateName: boolean = isCommandOptionSpecified(command.newName) && command.oldName !== command.newName;
    const willUpdateTtl: boolean = isCommandOptionSpecified(command.ttl);

    if (!willUpdateName && !willUpdateTtl) {
        throw new Error("A new name and/or TTL must be provided.");
    }

    return sdk.patchAccessKey(command.oldName, command.newName, command.ttl)
        .then((accessKey: AccessKey) => {
            let logMessage: string = "Successfully ";
            if (willUpdateName) {
                logMessage += `renamed the access key "${command.oldName}" to "${command.newName}"`;
            }

            if (willUpdateTtl) {
                const expirationDate = moment(accessKey.expires).format("LLLL");
                if (willUpdateName) {
                    logMessage += ` and changed its expiration date to ${expirationDate}`;
                } else {
                    logMessage += `changed the expiration date of the "${command.oldName}" access key to ${expirationDate}`;
                }
            }

            log(`${logMessage}.`);
        });
}

function accessKeyList(command: cli.IAccessKeyListCommand): Promise<void> {
    throwForInvalidOutputFormat(command.format);

    return sdk.getAccessKeys()
        .then((accessKeys: AccessKey[]): void => {
            printAccessKeys(command.format, accessKeys);
        });
}

function accessKeyRemove(command: cli.IAccessKeyRemoveCommand): Promise<void> {
    return confirm()
        .then((wasConfirmed: boolean): Promise<void> => {
            if (wasConfirmed) {
                return sdk.removeAccessKey(command.accessKey)
                    .then((): void => {
                        log(`Successfully removed the "${command.accessKey}" access key.`);
                    });
            }

            log("Access key removal cancelled.");
        });
}

function appAdd(command: cli.IAppAddCommand): Promise<void> {
    // Validate the OS and platform, doing a case insensitve comparison. Note that for CLI examples we
    // present these values in all lower case, per CLI conventions, but when passed to the REST API the
    // are in mixed case, per Mobile Center API naming conventions

    var os: string;
    const normalizedOs = command.os.toLowerCase();
    if (normalizedOs === "ios") {
        os = "iOS";
    }
    else if (normalizedOs === "android") {
        os = "Android";
    }
    else if (normalizedOs === "windows") {
        os = "Windows";
    }
    else {
        return Q.reject<void>(new Error(`"${command.os}" is an unsupported OS. Available options are "ios", "android", and "windows".`));
    }

    var platform: string;
    const normalizedPlatform = command.platform.toLowerCase();
    if (normalizedPlatform === "react-native") {
        platform = "React-Native";
    }
    else if (normalizedPlatform === "cordova") {
        platform = "Cordova";
    }
    else {
        return Q.reject<void>(new Error(`"${command.platform}" is an unsupported platform. Available options are "react-native" and "cordova".`));
    }

    return sdk.addApp(command.appName, os, platform, false)
        .then((app: App): Promise<void> => {
            log("Successfully added the \"" + command.appName + "\" app, along with the following default deployments:");
            var deploymentListCommand: cli.IDeploymentListCommand = {
                type: cli.CommandType.deploymentList,
                appName: app.name,
                format: "table",
                displayKeys: true
            };
            return deploymentList(deploymentListCommand, /*showPackage=*/ false);
        });
}

function appList(command: cli.IAppListCommand): Promise<void> {
    throwForInvalidOutputFormat(command.format);
    var apps: App[];
    return sdk.getApps()
        .then((retrievedApps: App[]): void => {
            printAppList(command.format, retrievedApps);
        });
}

function appRemove(command: cli.IAppRemoveCommand): Promise<void> {
    return confirm("Are you sure you want to remove this app? Note that its deployment keys will be PERMANENTLY unrecoverable.")
        .then((wasConfirmed: boolean): Promise<void> => {
            if (wasConfirmed) {
                return sdk.removeApp(command.appName)
                    .then((): void => {
                        log("Successfully removed the \"" + command.appName + "\" app.");
                    });
            }

            log("App removal cancelled.");
        });
}

function appRename(command: cli.IAppRenameCommand): Promise<void> {
    return sdk.renameApp(command.currentAppName, command.newAppName)
        .then((): void => {
            log("Successfully renamed the \"" + command.currentAppName + "\" app to \"" + command.newAppName + "\".");
        });
}

export var createEmptyTempReleaseFolder = (folderPath: string) => {
    return deleteFolder(folderPath)
        .then(() => {
            fs.mkdirSync(folderPath);
        });
};

function appTransfer(command: cli.IAppTransferCommand): Promise<void> {
    throwForInvalidEmail(command.email);

    return confirm()
        .then((wasConfirmed: boolean): Promise<void> => {
            if (wasConfirmed) {
                return sdk.transferApp(command.appName, command.email)
                    .then((): void => {
                        log("Successfully transferred the ownership of app \"" + command.appName + "\" to the account with email \"" + command.email + "\".");
                    });
            }

            log("App transfer cancelled.");
        });
}

function addCollaborator(command: cli.ICollaboratorAddCommand): Promise<void> {
    throwForInvalidEmail(command.email);

    return sdk.addCollaborator(command.appName, command.email)
        .then((): void => {
            log("Collaborator invitation email for \"" + command.appName + "\" sent to \"" + command.email + "\".");
        });
}

function listCollaborators(command: cli.ICollaboratorListCommand): Promise<void> {
    throwForInvalidOutputFormat(command.format);

    return sdk.getCollaborators(command.appName)
        .then((retrievedCollaborators: CollaboratorMap): void => {
            printCollaboratorsList(command.format, retrievedCollaborators);
        });
}

function removeCollaborator(command: cli.ICollaboratorRemoveCommand): Promise<void> {
    throwForInvalidEmail(command.email);

    return confirm()
        .then((wasConfirmed: boolean): Promise<void> => {
            if (wasConfirmed) {
                return sdk.removeCollaborator(command.appName, command.email)
                    .then((): void => {
                        log("Successfully removed \"" + command.email + "\" as a collaborator from the app \"" + command.appName + "\".");
                    });
            }

            log("App collaborator removal cancelled.");
        });
}

function deleteConnectionInfoCache(printMessage: boolean = true): void {
    try {
        fs.unlinkSync(configFilePath);

        if (printMessage) {
            log(`Successfully logged-out. The session file located at ${chalk.cyan(configFilePath)} has been deleted.\r\n`);
        }
    } catch (ex) {
    }
}

function deleteFolder(folderPath: string): Promise<void> {
    return Promise<void>((resolve, reject, notify) => {
        rimraf(folderPath, (err: any) => {
            if (err) {
                reject(err);
            } else {
                resolve(<void>null);
            }
        });
    });
}

function deploymentAdd(command: cli.IDeploymentAddCommand): Promise<void> {
    if (command.default) {
        return sdk.addDeployment(command.appName, "Staging")
            .then((deployment: Deployment): Promise<Deployment> => {
                return sdk.addDeployment(command.appName, "Production");
            })
            .then((deployment: Deployment): Promise<void> => {
                log("Successfully added the \"Staging\" and \"Production\" default deployments:");
                var deploymentListCommand: cli.IDeploymentListCommand = {
                    type: cli.CommandType.deploymentList,
                    appName: command.appName,
                    format: "table",
                    displayKeys: true
                };
                return deploymentList(deploymentListCommand, /*showPackage=*/ false);
            });
    }
    else {
        return sdk.addDeployment(command.appName, command.deploymentName)
            .then((deployment: Deployment): void => {
                log("Successfully added the \"" + command.deploymentName + "\" deployment with key \"" + deployment.key + "\" to the \"" + command.appName + "\" app.");
            });
    }
}

function deploymentHistoryClear(command: cli.IDeploymentHistoryClearCommand): Promise<void> {
    return confirm()
        .then((wasConfirmed: boolean): Promise<void> => {
            if (wasConfirmed) {
                return sdk.clearDeploymentHistory(command.appName, command.deploymentName)
                    .then((): void => {
                        log("Successfully cleared the release history associated with the \"" + command.deploymentName + "\" deployment from the \"" + command.appName + "\" app.");
                    })
            }

            log("Clear deployment cancelled.");
        });
}

export var deploymentList = (command: cli.IDeploymentListCommand, showPackage: boolean = true): Promise<void> => {
    throwForInvalidOutputFormat(command.format);
    var deployments: Deployment[];

    return sdk.getDeployments(command.appName)
        .then((retrievedDeployments: Deployment[]) => {
            deployments = retrievedDeployments;
            if (showPackage) {
                var metricsPromises: Promise<void>[] = deployments.map((deployment: Deployment) => {
                    if (deployment.package) {
                        return sdk.getDeploymentMetrics(command.appName, deployment.name)
                            .then((metrics: DeploymentMetrics): void => {
                                if (metrics[deployment.package.label]) {
                                    var totalActive: number = getTotalActiveFromDeploymentMetrics(metrics);
                                    (<PackageWithMetrics>(deployment.package)).metrics = {
                                        active: metrics[deployment.package.label].active,
                                        downloaded: metrics[deployment.package.label].downloaded,
                                        failed: metrics[deployment.package.label].failed,
                                        installed: metrics[deployment.package.label].installed,
                                        totalActive: totalActive
                                    };
                                }
                            });
                    } else {
                        return Q(<void>null);
                    }
                });

                return Q.all(metricsPromises);
            }
        })
        .then(() => {
            printDeploymentList(command, deployments, showPackage);
        });
}

function deploymentRemove(command: cli.IDeploymentRemoveCommand): Promise<void> {
    return confirm("Are you sure you want to remove this deployment? Note that its deployment key will be PERMANENTLY unrecoverable.")
        .then((wasConfirmed: boolean): Promise<void> => {
            if (wasConfirmed) {
                return sdk.removeDeployment(command.appName, command.deploymentName)
                    .then((): void => {
                        log("Successfully removed the \"" + command.deploymentName + "\" deployment from the \"" + command.appName + "\" app.");
                    })
            }

            log("Deployment removal cancelled.");
        });
}

function deploymentRename(command: cli.IDeploymentRenameCommand): Promise<void> {
    return sdk.renameDeployment(command.appName, command.currentDeploymentName, command.newDeploymentName)
        .then((): void => {
            log("Successfully renamed the \"" + command.currentDeploymentName + "\" deployment to \"" + command.newDeploymentName + "\" for the \"" + command.appName + "\" app.");
        });
}

function deploymentHistory(command: cli.IDeploymentHistoryCommand): Promise<void> {
    throwForInvalidOutputFormat(command.format);

    return Q.all<any>([
        sdk.getAccountInfo(),
        sdk.getDeploymentHistory(command.appName, command.deploymentName),
        sdk.getDeploymentMetrics(command.appName, command.deploymentName)
    ])
        .spread<void>((account: Account, deploymentHistory: Package[], metrics: DeploymentMetrics): void => {
            var totalActive: number = getTotalActiveFromDeploymentMetrics(metrics);
            deploymentHistory.forEach((packageObject: Package) => {
                if (metrics[packageObject.label]) {
                    (<PackageWithMetrics>packageObject).metrics = {
                        active: metrics[packageObject.label].active,
                        downloaded: metrics[packageObject.label].downloaded,
                        failed: metrics[packageObject.label].failed,
                        installed: metrics[packageObject.label].installed,
                        totalActive: totalActive
                    };
                }
            });
            printDeploymentHistory(command, <PackageWithMetrics[]>deploymentHistory, account.email);
        });
}

function deserializeConnectionInfo(): ILoginConnectionInfo {
    try {
        var savedConnection: string = fs.readFileSync(configFilePath, { encoding: "utf8" });
        var connectionInfo: ILegacyLoginConnectionInfo | ILoginConnectionInfo = JSON.parse(savedConnection);

        // If the connection info is in the legacy format, convert it to the modern format
        if ((<ILegacyLoginConnectionInfo>connectionInfo).accessKeyName) {
            connectionInfo = <ILoginConnectionInfo>{
                accessKey: (<ILegacyLoginConnectionInfo>connectionInfo).accessKeyName
            };
        }

        var connInfo = <ILoginConnectionInfo>connectionInfo;

        connInfo.proxy = getProxy(connInfo.proxy, connInfo.noProxy);

        return connInfo;
    } catch (ex) {
        return;
    }
}

export function execute(command: cli.ICommand): Promise<void> {
    connectionInfo = deserializeConnectionInfo();

    return Q(<void>null)
        .then(() => {
            switch (command.type) {
                // Must not be logged in
                case cli.CommandType.login:
                case cli.CommandType.register:
                    if (connectionInfo) {
                        throw new Error("You are already logged in from this machine.");
                    }
                    break;

                // It does not matter whether you are logged in or not
                case cli.CommandType.link:
                    break;

                // Must be logged in
                default:
                    if (!!sdk) break; // Used by unit tests to skip authentication

                    if (!connectionInfo) {
                        throw new Error("You are not currently logged in. Run the 'code-push login' command to authenticate with the CodePush server.");
                    }

                    sdk = getSdk(connectionInfo.accessKey, CLI_HEADERS, connectionInfo.customServerUrl, connectionInfo.proxy);
                    break;
            }

            switch (command.type) {
                case cli.CommandType.accessKeyAdd:
                    return accessKeyAdd(<cli.IAccessKeyAddCommand>command);

                case cli.CommandType.accessKeyPatch:
                    return accessKeyPatch(<cli.IAccessKeyPatchCommand>command);

                case cli.CommandType.accessKeyList:
                    return accessKeyList(<cli.IAccessKeyListCommand>command);

                case cli.CommandType.accessKeyRemove:
                    return accessKeyRemove(<cli.IAccessKeyRemoveCommand>command);

                case cli.CommandType.appAdd:
                    return appAdd(<cli.IAppAddCommand>command);

                case cli.CommandType.appList:
                    return appList(<cli.IAppListCommand>command);

                case cli.CommandType.appRemove:
                    return appRemove(<cli.IAppRemoveCommand>command);

                case cli.CommandType.appRename:
                    return appRename(<cli.IAppRenameCommand>command);

                case cli.CommandType.appTransfer:
                    return appTransfer(<cli.IAppTransferCommand>command);

                case cli.CommandType.collaboratorAdd:
                    return addCollaborator(<cli.ICollaboratorAddCommand>command);

                case cli.CommandType.collaboratorList:
                    return listCollaborators(<cli.ICollaboratorListCommand>command);

                case cli.CommandType.collaboratorRemove:
                    return removeCollaborator(<cli.ICollaboratorRemoveCommand>command);

                case cli.CommandType.debug:
                    return debugCommand(<cli.IDebugCommand>command);

                case cli.CommandType.deploymentAdd:
                    return deploymentAdd(<cli.IDeploymentAddCommand>command);

                case cli.CommandType.deploymentHistoryClear:
                    return deploymentHistoryClear(<cli.IDeploymentHistoryClearCommand>command);

                case cli.CommandType.deploymentHistory:
                    return deploymentHistory(<cli.IDeploymentHistoryCommand>command);

                case cli.CommandType.deploymentList:
                    return deploymentList(<cli.IDeploymentListCommand>command);

                case cli.CommandType.deploymentRemove:
                    return deploymentRemove(<cli.IDeploymentRemoveCommand>command);

                case cli.CommandType.deploymentRename:
                    return deploymentRename(<cli.IDeploymentRenameCommand>command);

                case cli.CommandType.link:
                    return link(<cli.ILinkCommand>command);

                case cli.CommandType.login:
                    return login(<cli.ILoginCommand>command);

                case cli.CommandType.logout:
                    return logout(command);

                case cli.CommandType.patch:
                    return patch(<cli.IPatchCommand>command);

                case cli.CommandType.promote:
                    return promote(<cli.IPromoteCommand>command);

                case cli.CommandType.register:
                    return register(<cli.IRegisterCommand>command);

                case cli.CommandType.release:
                    return release(<cli.IReleaseCommand>command);

                case cli.CommandType.releaseCordova:
                    return releaseCordova(<cli.IReleaseCordovaCommand>command);

                case cli.CommandType.releaseReact:
                    return releaseReact(<cli.IReleaseReactCommand>command);

                case cli.CommandType.rollback:
                    return rollback(<cli.IRollbackCommand>command);

                case cli.CommandType.sessionList:
                    return sessionList(<cli.ISessionListCommand>command);

                case cli.CommandType.sessionRemove:
                    return sessionRemove(<cli.ISessionRemoveCommand>command);

                case cli.CommandType.whoami:
                    return whoami(command);

                default:
                    // We should never see this message as invalid commands should be caught by the argument parser.
                    throw new Error("Invalid command:  " + JSON.stringify(command));
            }
        });
}

function fileDoesNotExistOrIsDirectory(filePath: string): boolean {
    try {
        return fs.lstatSync(filePath).isDirectory();
    } catch (error) {
        return true;
    }
}

function getTotalActiveFromDeploymentMetrics(metrics: DeploymentMetrics): number {
    var totalActive = 0;
    Object.keys(metrics).forEach((label: string) => {
        totalActive += metrics[label].active;
    });

    return totalActive;
}

function initiateExternalAuthenticationAsync(action: string, serverUrl?: string): void {
    var message: string;

    if (action === "link") {
        message = `Please login to Mobile Center in the browser window we've just opened.\nIf you login with an additional authentication provider (e.g. GitHub) that shares the same email address, it will be linked to your current Mobile Center account.`;

        // For "link" there shouldn't be a token prompt, so we go straight to the Mobile Center URL to avoid that
        log(message);
        var url: string = serverUrl || AccountManager.MOBILE_CENTER_SERVER_URL;
        opener(url);
    }
    else {
        // We use this now for both login & register
        message = `Please login to Mobile Center in the browser window we've just opened.`;

        log(message);
        var hostname: string = os.hostname();
        var url: string = `${serverUrl || AccountManager.SERVER_URL}/auth/${action}?hostname=${hostname}`;
        opener(url);
    }
}

function link(command: cli.ILinkCommand): Promise<void> {
    initiateExternalAuthenticationAsync("link", command.serverUrl);
    return Q(<void>null);
}

function login(command: cli.ILoginCommand): Promise<void> {
    // Check if one of the flags were provided.
    if (command.accessKey) {
        var proxy = getProxy(command.proxy, command.noProxy);
        sdk = getSdk(command.accessKey, CLI_HEADERS, command.serverUrl, proxy);
        return sdk.isAuthenticated()
            .then((isAuthenticated: boolean): void => {
                if (isAuthenticated) {
                    serializeConnectionInfo(command.accessKey, /*preserveAccessKeyOnLogout*/ true, command.serverUrl, command.proxy, command.noProxy);
                } else {
                    throw new Error("Invalid access key.");
                }
            });
    } else {
        return loginWithExternalAuthentication("login", command.serverUrl, command.proxy, command.noProxy);
    }
}

function loginWithExternalAuthentication(action: string, serverUrl?: string, proxy?: string, noProxy?: boolean): Promise<void> {
    initiateExternalAuthenticationAsync(action, serverUrl);
    log("");    // Insert newline

    return requestAccessKey()
        .then((accessKey: string): Promise<void> => {
            if (accessKey === null) {
                // The user has aborted the synchronous prompt (e.g.:  via [CTRL]+[C]).
                return;
            }

            sdk = getSdk(accessKey, CLI_HEADERS, serverUrl, getProxy(proxy, noProxy));

            return sdk.isAuthenticated()
                .then((isAuthenticated: boolean): void => {
                    if (isAuthenticated) {
                        serializeConnectionInfo(accessKey, /*preserveAccessKeyOnLogout*/ false, serverUrl, proxy, noProxy);
                    } else {
                        throw new Error("Invalid token.");
                    }
                });
        });
}

function logout(command: cli.ICommand): Promise<void> {
    return Q(<void>null)
        .then((): Promise<void> => {
            if (!connectionInfo.preserveAccessKeyOnLogout) {
                var machineName: string = os.hostname();
                return sdk.removeSession(machineName)
                    .catch((error: CodePushError) => {
                        // If we are not authenticated or the session doesn't exist anymore, just swallow the error instead of displaying it
                        if (error.statusCode !== AccountManager.ERROR_UNAUTHORIZED && error.statusCode !== AccountManager.ERROR_NOT_FOUND) {
                            throw error;
                        }
                    });
            }
        })
        .then((): void => {
            sdk = null;
            deleteConnectionInfoCache();
        });
}

function formatDate(unixOffset: number): string {
    var date: moment.Moment = moment(unixOffset);
    var now: moment.Moment = moment();
    if (Math.abs(now.diff(date, "days")) < 30) {
        return date.fromNow();                  // "2 hours ago"
    } else if (now.year() === date.year()) {
        return date.format("MMM D");            // "Nov 6"
    } else {
        return date.format("MMM D, YYYY");      // "Nov 6, 2014"
    }
}

function printAppList(format: string, apps: App[]): void {
    if (format === "json") {
        printJson(apps);
    } else if (format === "table") {
        var headers = ["Name", "Deployments"];
        printTable(headers, (dataSource: any[]): void => {
            apps.forEach((app: App, index: number): void => {
                var row = [app.name, wordwrap(50)(app.deployments.join(", "))];
                dataSource.push(row);
            });
        });
    }
}

function getCollaboratorDisplayName(email: string, collaboratorProperties: CollaboratorProperties): string {
    return (collaboratorProperties.permission === AccountManager.AppPermission.OWNER) ? email + chalk.magenta(" (Owner)") : email;
}

function printCollaboratorsList(format: string, collaborators: CollaboratorMap): void {
    if (format === "json") {
        var dataSource = { "collaborators": collaborators };
        printJson(dataSource);
    } else if (format === "table") {
        var headers = ["E-mail Address"];
        printTable(headers, (dataSource: any[]): void => {
            Object.keys(collaborators).forEach((email: string): void => {
                var row = [getCollaboratorDisplayName(email, collaborators[email])];
                dataSource.push(row);
            });
        });
    }
}

function printDeploymentList(command: cli.IDeploymentListCommand, deployments: Deployment[], showPackage: boolean = true): void {
    if (command.format === "json") {
        printJson(deployments);
    } else if (command.format === "table") {
        var headers = ["Name"];
        if (command.displayKeys) {
            headers.push("Deployment Key");
        }

        if (showPackage) {
            headers.push("Update Metadata");
            headers.push("Install Metrics");
        }

        printTable(headers, (dataSource: any[]): void => {
            deployments.forEach((deployment: Deployment): void => {
                var row = [deployment.name];
                if (command.displayKeys) {
                    row.push(deployment.key);
                }

                if (showPackage) {
                    row.push(getPackageString(deployment.package));
                    row.push(getPackageMetricsString(deployment.package));
                }

                dataSource.push(row);
            });
        });
    }
}

function printDeploymentHistory(command: cli.IDeploymentHistoryCommand, deploymentHistory: PackageWithMetrics[], currentUserEmail: string): void {
    if (command.format === "json") {
        printJson(deploymentHistory);
    } else if (command.format === "table") {
        var headers = ["Label", "Release Time", "App Version", "Mandatory"];
        if (command.displayAuthor) {
            headers.push("Released By");
        }

        headers.push("Description", "Install Metrics");

        printTable(headers, (dataSource: any[]) => {
            deploymentHistory.forEach((packageObject: Package) => {
                var releaseTime: string = formatDate(packageObject.uploadTime);
                var releaseSource: string;
                if (packageObject.releaseMethod === "Promote") {
                    releaseSource = `Promoted ${packageObject.originalLabel} from "${packageObject.originalDeployment}"`;
                } else if (packageObject.releaseMethod === "Rollback") {
                    var labelNumber: number = parseInt(packageObject.label.substring(1));
                    var lastLabel: string = "v" + (labelNumber - 1);
                    releaseSource = `Rolled back ${lastLabel} to ${packageObject.originalLabel}`;
                }

                if (releaseSource) {
                    releaseTime += "\n" + chalk.magenta(`(${releaseSource})`).toString();
                }

                var row: string[] = [packageObject.label, releaseTime, packageObject.appVersion, packageObject.isMandatory ? "Yes" : "No"];
                if (command.displayAuthor) {
                    var releasedBy: string = packageObject.releasedBy ? packageObject.releasedBy : "";
                    if (currentUserEmail && releasedBy === currentUserEmail) {
                        releasedBy = "You";
                    }

                    row.push(releasedBy);
                }

                row.push(packageObject.description ? wordwrap(30)(packageObject.description) : "");
                row.push(getPackageMetricsString(packageObject) + (packageObject.isDisabled ? `\n${chalk.green("Disabled:")} Yes` : ""));
                if (packageObject.isDisabled) {
                    row = row.map((cellContents: string) => applyChalkSkippingLineBreaks(cellContents, (<any>chalk).dim));
                }

                dataSource.push(row);
            });
        });
    }
}

function applyChalkSkippingLineBreaks(applyString: string, chalkMethod: (string: string) => Chalk.ChalkChain): string {
    // Used to prevent "chalk" from applying styles to linebreaks which
    // causes table border chars to have the style applied as well.
    return applyString
        .split("\n")
        .map((token: string) => chalkMethod(token))
        .join("\n");
}

function getPackageString(packageObject: Package): string {
    if (!packageObject) {
        return chalk.magenta("No updates released").toString();
    }

    var packageString: string = chalk.green("Label: ") + packageObject.label + "\n" +
        chalk.green("App Version: ") + packageObject.appVersion + "\n" +
        chalk.green("Mandatory: ") + (packageObject.isMandatory ? "Yes" : "No") + "\n" +
        chalk.green("Release Time: ") + formatDate(packageObject.uploadTime) + "\n" +
        chalk.green("Released By: ") + (packageObject.releasedBy ? packageObject.releasedBy : "") +
        (packageObject.description ? wordwrap(70)("\n" + chalk.green("Description: ") + packageObject.description) : "");

    if (packageObject.isDisabled) {
        packageString += `\n${chalk.green("Disabled:")} Yes`;
    }

    return packageString;
}

function getPackageMetricsString(obj: Package): string {
    var packageObject = <PackageWithMetrics>obj;
    var rolloutString: string = (obj && obj.rollout && obj.rollout !== 100) ? `\n${chalk.green("Rollout:")} ${obj.rollout.toLocaleString()}%` : "";

    if (!packageObject || !packageObject.metrics) {
        return chalk.magenta("No installs recorded").toString() + (rolloutString || "");
    }

    var activePercent: number = packageObject.metrics.totalActive
        ? packageObject.metrics.active / packageObject.metrics.totalActive * 100
        : 0.0;
    var percentString: string;
    if (activePercent === 100.0) {
        percentString = "100%";
    } else if (activePercent === 0.0) {
        percentString = "0%";
    } else {
        percentString = activePercent.toPrecision(2) + "%";
    }

    var numPending: number = packageObject.metrics.downloaded - packageObject.metrics.installed - packageObject.metrics.failed;
    var returnString: string = chalk.green("Active: ") + percentString + " (" + packageObject.metrics.active.toLocaleString() + " of " + packageObject.metrics.totalActive.toLocaleString() + ")\n" +
        chalk.green("Total: ") + packageObject.metrics.installed.toLocaleString();

    if (numPending > 0) {
        returnString += " (" + numPending.toLocaleString() + " pending)";
    }

    if (packageObject.metrics.failed) {
        returnString += "\n" + chalk.green("Rollbacks: ") + chalk.red(packageObject.metrics.failed.toLocaleString() + "");
    }

    if (rolloutString) {
        returnString += rolloutString;
    }

    return returnString;
}

function getReactNativeProjectAppVersion(command: cli.IReleaseReactCommand, projectName: string): Promise<string> {
    const fileExists = (file: string): boolean => {
        try { return fs.statSync(file).isFile() }
        catch (e) { return false }
    };

    // Allow plain integer versions (as well as '1.0' values) for now, e.g. '1' is valid here and we assume that it is equal to '1.0.0'.
    // (missing minor/patch values will be added on server side to pass semver.satisfies check)
    const isValidVersion = (version: string): boolean => !!semver.valid(version) || /^\d+\.\d+$/.test(version) || /^\d+$/.test(version);

    log(chalk.cyan(`Detecting ${command.platform} app version:\n`));

    if (command.platform === "ios") {
        let resolvedPlistFile: string = command.plistFile;
        if (resolvedPlistFile) {
            // If a plist file path is explicitly provided, then we don't
            // need to attempt to "resolve" it within the well-known locations.
            if (!fileExists(resolvedPlistFile)) {
                throw new Error("The specified plist file doesn't exist. Please check that the provided path is correct.");
            }
        } else {
            // Allow the plist prefix to be specified with or without a trailing
            // separator character, but prescribe the use of a hyphen when omitted,
            // since this is the most commonly used convetion for plist files.
            if (command.plistFilePrefix && /.+[^-.]$/.test(command.plistFilePrefix)) {
                command.plistFilePrefix += "-";
            }

            const iOSDirectory: string = "ios";
            const plistFileName = `${command.plistFilePrefix || ""}Info.plist`;

            const knownLocations = [
                path.join(iOSDirectory, projectName, plistFileName),
                path.join(iOSDirectory, plistFileName)
            ];

            resolvedPlistFile = (<any>knownLocations).find(fileExists);

            if (!resolvedPlistFile) {
                throw new Error(`Unable to find either of the following plist files in order to infer your app's binary version: "${knownLocations.join("\", \"")}". If your plist has a different name, or is located in a different directory, consider using either the "--plistFile" or "--plistFilePrefix" parameters to help inform the CLI how to find it.`);
            }
        }

        const plistContents = fs.readFileSync(resolvedPlistFile).toString();

        try {
            var parsedPlist = plist.parse(plistContents);
        } catch (e) {
            throw new Error(`Unable to parse "${resolvedPlistFile}". Please ensure it is a well-formed plist file.`);
        }

        if (parsedPlist && parsedPlist.CFBundleShortVersionString) {
            if (isValidVersion(parsedPlist.CFBundleShortVersionString)) {
                log(`Using the target binary version value "${parsedPlist.CFBundleShortVersionString}" from "${resolvedPlistFile}".\n`);
                return Q(parsedPlist.CFBundleShortVersionString);
            } else {
                throw new Error(`The "CFBundleShortVersionString" key in the "${resolvedPlistFile}" file needs to specify a valid semver string, containing both a major and minor version (e.g. 1.3.2, 1.1).`);
            }
        } else {
            throw new Error(`The "CFBundleShortVersionString" key doesn't exist within the "${resolvedPlistFile}" file.`);
        }
    } else if (command.platform === "android") {
        let buildGradlePath: string = path.join("android", "app");
        if (command.gradleFile) {
            buildGradlePath = command.gradleFile;
        }
        if (fs.lstatSync(buildGradlePath).isDirectory()) {
            buildGradlePath = path.join(buildGradlePath, "build.gradle");
        }

        if (fileDoesNotExistOrIsDirectory(buildGradlePath)) {
            throw new Error(`Unable to find gradle file "${buildGradlePath}".`);
        }

        return g2js.parseFile(buildGradlePath)
            .catch(() => {
                throw new Error(`Unable to parse the "${buildGradlePath}" file. Please ensure it is a well-formed Gradle file.`);
            })
            .then((buildGradle: any) => {
                let versionName: string = null;

                if (buildGradle.android && buildGradle.android.defaultConfig && buildGradle.android.defaultConfig.versionName) {
                    versionName = buildGradle.android.defaultConfig.versionName;
                } else {
                    throw new Error(`The "${buildGradlePath}" file doesn't specify a value for the "android.defaultConfig.versionName" property.`);
                }

                if (typeof versionName !== "string") {
                    throw new Error(`The "android.defaultConfig.versionName" property value in "${buildGradlePath}" is not a valid string. If this is expected, consider using the --targetBinaryVersion option to specify the value manually.`);
                }

                let appVersion: string = versionName.replace(/"/g, "").trim();

                if (isValidVersion(appVersion)) {
                    // The versionName property is a valid semver string,
                    // so we can safely use that and move on.
                    log(`Using the target binary version value "${appVersion}" from "${buildGradlePath}".\n`);
                    return appVersion;
                } else if (/^\d.*/.test(appVersion)) {
                    // The versionName property isn't a valid semver string,
                    // but it starts with a number, and therefore, it can't
                    // be a valid Gradle property reference.
                    throw new Error(`The "android.defaultConfig.versionName" property in the "${buildGradlePath}" file needs to specify a valid semver string, containing both a major and minor version (e.g. 1.3.2, 1.1).`);
                }

                // The version property isn't a valid semver string
                // so we assume it is a reference to a property variable.
                const propertyName = appVersion.replace("project.", "");
                const propertiesFileName = "gradle.properties";

                const knownLocations = [
                    path.join("android", "app", propertiesFileName),
                    path.join("android", propertiesFileName)
                ];

                // Search for gradle properties across all `gradle.properties` files
                var propertiesFile: string = null;
                for (var i = 0; i < knownLocations.length; i++) {
                    propertiesFile = knownLocations[i];
                    if (fileExists(propertiesFile)) {
                        const propertiesContent: string = fs.readFileSync(propertiesFile).toString();
                        try {
                            const parsedProperties: any = properties.parse(propertiesContent);
                            appVersion = parsedProperties[propertyName];
                            if (appVersion) {
                                break;
                            }
                        } catch (e) {
                            throw new Error(`Unable to parse "${propertiesFile}". Please ensure it is a well-formed properties file.`);
                        }
                    }
                }

                if (!appVersion) {
                    throw new Error(`No property named "${propertyName}" exists in the "${propertiesFile}" file.`);
                }

                if (!isValidVersion(appVersion)) {
                    throw new Error(`The "${propertyName}" property in the "${propertiesFile}" file needs to specify a valid semver string, containing both a major and minor version (e.g. 1.3.2, 1.1).`);
                }

                log(`Using the target binary version value "${appVersion}" from the "${propertyName}" key in the "${propertiesFile}" file.\n`);
                return appVersion.toString();
            });
    } else {
        var appxManifestFileName: string = "Package.appxmanifest";
        try {
            var appxManifestContainingFolder: string = path.join("windows", projectName);
            var appxManifestContents: string = fs.readFileSync(path.join(appxManifestContainingFolder, "Package.appxmanifest")).toString();
        } catch (err) {
            throw new Error(`Unable to find or read "${appxManifestFileName}" in the "${path.join("windows", projectName)}" folder.`);
        }

        return parseXml(appxManifestContents)
            .catch((err: any) => {
                throw new Error(`Unable to parse the "${path.join(appxManifestContainingFolder, appxManifestFileName)}" file, it could be malformed.`);
            })
            .then((parsedAppxManifest: any) => {
                try {
                    return parsedAppxManifest.Package.Identity[0]["$"].Version.match(/^\d+\.\d+\.\d+/)[0];
                } catch (e) {
                    throw new Error(`Unable to parse the package version from the "${path.join(appxManifestContainingFolder, appxManifestFileName)}" file.`);
                }
            });
    }
}

function printJson(object: any): void {
    log(JSON.stringify(object, /*replacer=*/ null, /*spacing=*/ 2));
}

function printAccessKeys(format: string, keys: AccessKey[]): void {
    if (format === "json") {
        printJson(keys);
    } else if (format === "table") {
        printTable(["Name", "Created" /*, "Expires" */], (dataSource: any[]): void => {
            var now = new Date().getTime();

            function isExpired(key: AccessKey): boolean {
                return now >= key.expires;
            }

            // Access keys never expire in Mobile Center (at least for now--maybe that feature will get added later), so don't show the Expires column anymore
            function keyToTableRow(key: AccessKey, dim: boolean): string[] {
                var row: string[] = [
                    key.name,
                    key.createdTime ? formatDate(key.createdTime) : ""
                    /* formatDate(key.expires) */
                ];

                if (dim) {
                    row.forEach((col: string, index: number) => {
                        row[index] = (<any>chalk).dim(col);
                    });
                }

                return row;
            }

            keys.forEach((key: AccessKey) =>
                !isExpired(key) && dataSource.push(keyToTableRow(key, /*dim*/ false)));
            keys.forEach((key: AccessKey) =>
                isExpired(key) && dataSource.push(keyToTableRow(key, /*dim*/ true)));
        });
    }
}

function printSessions(format: string, sessions: Session[]): void {
    if (format === "json") {
        printJson(sessions);
    } else if (format === "table") {
        printTable(["Machine", "Logged in"], (dataSource: any[]): void => {
            sessions.forEach((session: Session) =>
                dataSource.push([session.machineName, formatDate(session.loggedInTime)]));
        });
    }
}

function printTable(columnNames: string[], readData: (dataSource: any[]) => void): void {
    var table = new Table({
        head: columnNames,
        style: { head: ["cyan"] }
    });

    readData(table);

    log(table.toString());
}

function register(command: cli.IRegisterCommand): Promise<void> {
    return loginWithExternalAuthentication("register", command.serverUrl, command.proxy, command.noProxy);
}

function promote(command: cli.IPromoteCommand): Promise<void> {
    var packageInfo: PackageInfo = {
        appVersion: command.appStoreVersion,
        description: command.description,
        label: command.label,
        isDisabled: command.disabled,
        isMandatory: command.mandatory,
        rollout: command.rollout
    };

    return sdk.promote(command.appName, command.sourceDeploymentName, command.destDeploymentName, packageInfo)
        .then((): void => {
            log("Successfully promoted " + (command.label ? "\"" + command.label + "\" of " : "") + "the \"" + command.sourceDeploymentName + "\" deployment of the \"" + command.appName + "\" app to the \"" + command.destDeploymentName + "\" deployment.");
        })
        .catch((err: CodePushError) => releaseErrorHandler(err, command));
}

function patch(command: cli.IPatchCommand): Promise<void> {
    var packageInfo: PackageInfo = {
        appVersion: command.appStoreVersion,
        description: command.description,
        isMandatory: command.mandatory,
        isDisabled: command.disabled,
        rollout: command.rollout
    };

    for (var updateProperty in packageInfo) {
        if ((<any>packageInfo)[updateProperty] !== null) {
            return sdk.patchRelease(command.appName, command.deploymentName, command.label, packageInfo)
                .then((): void => {
                    log(`Successfully updated the "${command.label ? command.label : `latest`}" release of "${command.appName}" app's "${command.deploymentName}" deployment.`);
                });
        }
    }

    throw new Error("At least one property must be specified to patch a release.");
}

export var release = (command: cli.IReleaseCommand): Promise<void> => {

    if (isBinaryOrZip(command.package)) {
        throw new Error("It is unnecessary to package releases in a .zip or binary file. Please specify the direct path to the update content's directory (e.g. /platforms/ios/www) or file (e.g. main.jsbundle).");
    }

    throwForInvalidSemverRange(command.appStoreVersion);

    return Q(<void>null).then(() => {
        // Copy the command so that the original is not modified
        var currentCommand: cli.IReleaseCommand = {
            appName: command.appName,
            appStoreVersion: command.appStoreVersion,
            deploymentName: command.deploymentName,
            description: command.description,
            disabled: command.disabled,
            mandatory: command.mandatory,
            package: command.package,
            rollout: command.rollout,
            privateKeyPath: command.privateKeyPath,
            type: command.type
        };

        var releaseHooksPromise = hooks.reduce((accumulatedPromise: Q.Promise<cli.IReleaseCommand>, hook: cli.ReleaseHook) => {
            return accumulatedPromise
                .then((modifiedCommand: cli.IReleaseCommand) => {
                    currentCommand = modifiedCommand || currentCommand;
                    return hook(currentCommand, command, sdk);
                });
        }, Q(currentCommand));

        return releaseHooksPromise
            .then(() => { })
            .catch((err: CodePushError) => releaseErrorHandler(err, command));
    });
}

export var releaseCordova = (command: cli.IReleaseCordovaCommand): Promise<void> => {
    var releaseCommand: cli.IReleaseCommand = <any>command;
    // Check for app and deployment exist before releasing an update.
    // This validation helps to save about 1 minute or more in case user has typed wrong app or deployment name.
    return validateDeployment(command.appName, command.deploymentName)
        .then((): any => {
            var platform: string = command.platform.toLowerCase();
            var projectRoot: string = process.cwd();
            var platformFolder: string = path.join(projectRoot, "platforms", platform);
            var platformCordova: string = path.join(platformFolder, "cordova");
            var outputFolder: string;

            if (platform === "ios") {
                outputFolder = path.join(platformFolder, "www");
            } else if (platform === "android") {
                
                // Since cordova-android 7 assets directory moved to android/app/src/main/assets instead of android/assets                
                const outputFolderVer7 = path.join(platformFolder, "app", "src", "main", "assets", "www");
                if (fs.existsSync(outputFolderVer7)) {
                    outputFolder = outputFolderVer7;
                } else {
                    outputFolder = path.join(platformFolder, "assets", "www");
                }
            } else {
                throw new Error("Platform must be either \"ios\" or \"android\".");
            }

            var cordovaCommand: string = command.build ?
                (command.isReleaseBuildType ? "build --release" : "build") :
                "prepare";
            var cordovaCLI: string = "cordova";

            // Check whether the Cordova or PhoneGap CLIs are
            // installed, and if not, fail early
            try {
                which.sync(cordovaCLI);
            } catch (e) {
                try {
                    cordovaCLI = "phonegap";
                    which.sync(cordovaCLI);
                } catch (e) {
                    throw new Error(`Unable to ${cordovaCommand} project. Please ensure that either the Cordova or PhoneGap CLI is installed.`);
                }
            }

            log(chalk.cyan(`Running "${cordovaCLI} ${cordovaCommand}" command:\n`));
            try {
                execSync([cordovaCLI, cordovaCommand, platform, "--verbose"].join(" "), { stdio: "inherit" });
            } catch (error) {
                throw new Error(`Unable to ${cordovaCommand} project. Please ensure that the CWD represents a Cordova project and that the "${platform}" platform was added by running "${cordovaCLI} platform add ${platform}".`);
            }

            try {
                var configString: string = fs.readFileSync(path.join(projectRoot, "config.xml"), { encoding: "utf8" });
            } catch (error) {
                throw new Error(`Unable to find or read "config.xml" in the CWD. The "release-cordova" command must be executed in a Cordova project folder.`);
            }

            var configPromise: Promise<any> = parseXml(configString);

            releaseCommand.package = outputFolder;
            releaseCommand.type = cli.CommandType.release;

            return configPromise
                .catch((err: any) => {
                    throw new Error(`Unable to parse "config.xml" in the CWD. Ensure that the contents of "config.xml" is valid XML.`);
                });
        })
        .then((parsedConfig: any) => {
            var config: any = parsedConfig.widget;

            var releaseTargetVersion: string;
            if (command.appStoreVersion) {
                releaseTargetVersion = command.appStoreVersion;
            } else {
                releaseTargetVersion = config["$"].version;
            }

            throwForInvalidSemverRange(releaseTargetVersion);
            releaseCommand.appStoreVersion = releaseTargetVersion;

            log(chalk.cyan("\nReleasing update contents to CodePush:\n"));
            return release(releaseCommand);
        });
}

export var releaseReact = (command: cli.IReleaseReactCommand): Promise<void> => {
    var bundleName: string = command.bundleName;
    var entryFile: string = command.entryFile;
    var outputFolder: string = command.outputDir || path.join(os.tmpdir(), "CodePush");
    var platform: string = command.platform = command.platform.toLowerCase();
    var releaseCommand: cli.IReleaseCommand = <any>command;

    // we have to add "CodePush" root forlder to make update contents file structure 
    // to be compatible with React Native client SDK
    outputFolder = path.join(outputFolder, "CodePush");
    mkdirp.sync(outputFolder);

    // Check for app and deployment exist before releasing an update.
    // This validation helps to save about 1 minute or more in case user has typed wrong app or deployment name.
    return validateDeployment(command.appName, command.deploymentName)
        .then((): any => {
            releaseCommand.package = outputFolder;

            switch (platform) {
                case "android":
                case "ios":
                case "windows":
                    if (!bundleName) {
                        bundleName = platform === "ios"
                            ? "main.jsbundle"
                            : `index.${platform}.bundle`;
                    }

                    break;
                default:
                    throw new Error("Platform must be \"android\", \"ios\", or \"windows\".");
            }

            try {
                var projectPackageJson: any = require(path.join(process.cwd(), "package.json"));
                var projectName: string = projectPackageJson.name;
                if (!projectName) {
                    throw new Error("The \"package.json\" file in the CWD does not have the \"name\" field set.");
                }

                const isReactNativeProject: boolean = projectPackageJson.dependencies["react-native"] ||
                    (projectPackageJson.devDependencies && projectPackageJson.devDependencies["react-native"]);
                if (!isReactNativeProject) {
                    throw new Error("The project in the CWD is not a React Native project.");
                }
            } catch (error) {
                throw new Error("Unable to find or read \"package.json\" in the CWD. The \"release-react\" command must be executed in a React Native project folder.");
            }

            if (!entryFile) {
                entryFile = `index.${platform}.js`;
                if (fileDoesNotExistOrIsDirectory(entryFile)) {
                    entryFile = "index.js";
                }

                if (fileDoesNotExistOrIsDirectory(entryFile)) {
                    throw new Error(`Entry file "index.${platform}.js" or "index.js" does not exist.`);
                }
            } else {
                if (fileDoesNotExistOrIsDirectory(entryFile)) {
                    throw new Error(`Entry file "${entryFile}" does not exist.`);
                }
            }

            if (command.appStoreVersion) {
                throwForInvalidSemverRange(command.appStoreVersion);
            }

            var appVersionPromise: Promise<string> = command.appStoreVersion
                ? Q(command.appStoreVersion)
                : getReactNativeProjectAppVersion(command, projectName);

            if (command.outputDir) {
                command.sourcemapOutput = path.join(releaseCommand.package, bundleName + ".map");
            }

            return appVersionPromise;
        })
        .then((appVersion: string) => {
            releaseCommand.appStoreVersion = appVersion;
            return createEmptyTempReleaseFolder(outputFolder);
        })
        // This is needed to clear the react native bundler cache:
        // https://github.com/facebook/react-native/issues/4289
        .then(() => deleteFolder(`${os.tmpdir()}/react-*`))
        .then(() => runReactNativeBundleCommand(bundleName, command.development || false, entryFile, outputFolder, platform, command.sourcemapOutput, command.config))
        .then(() => {
            log(chalk.cyan("\nReleasing update contents to CodePush:\n"));
            return release(releaseCommand);
        })
        .then(() => {
            if (!command.outputDir) {
                deleteFolder(outputFolder);
            }
        })
        .catch((err: Error) => {
            deleteFolder(outputFolder);
            throw err;
        });
}

function validateDeployment(appName: string, deploymentName: string): Promise<void> {
    return sdk.getDeployment(appName, deploymentName)
        .catch((err: any) => {
            // If we get an error that the deployment doesn't exist (but not the app doesn't exist), then tack on a more descriptive error message telling the user what to do
            if (err.statusCode === AccountManager.ERROR_NOT_FOUND && err.message.indexOf("Deployment") !== -1) {
                err.message = err.message + "\nUse \"code-push deployment list\" to view any existing deployments and \"code-push deployment add\" to add deployment(s) to the app.";
            }
            throw err;
        });
}

function rollback(command: cli.IRollbackCommand): Promise<void> {
    return confirm()
        .then((wasConfirmed: boolean) => {
            if (!wasConfirmed) {
                log("Rollback cancelled.")
                return;
            }

            return sdk.rollback(command.appName, command.deploymentName, command.targetRelease || undefined)
                .then((): void => {
                    log("Successfully performed a rollback on the \"" + command.deploymentName + "\" deployment of the \"" + command.appName + "\" app.");
                });
        });
}

function requestAccessKey(): Promise<string> {
    return Promise<string>((resolve, reject, notify): void => {
        prompt.message = "";
        prompt.delimiter = "";

        prompt.start();

        prompt.get({
            properties: {
                response: {
                    description: chalk.cyan("Enter your token from the browser: ")
                }
            }
        }, (err: any, result: any): void => {
            if (err) {
                resolve(null);
            } else {
                resolve(result.response.trim());
            }
        });
    });
}

export var runReactNativeBundleCommand = (bundleName: string, development: boolean, entryFile: string, outputFolder: string, platform: string, sourcemapOutput: string, config: string): Promise<void> => {
    let reactNativeBundleArgs: string[] = [];
    let envNodeArgs: string = process.env.CODE_PUSH_NODE_ARGS;

    if (typeof envNodeArgs !== "undefined") {
        Array.prototype.push.apply(reactNativeBundleArgs, envNodeArgs.trim().split(/\s+/));
    }

    Array.prototype.push.apply(reactNativeBundleArgs, [
        path.join("node_modules", "react-native", "local-cli", "cli.js"), "bundle",
        "--assets-dest", outputFolder,
        "--bundle-output", path.join(outputFolder, bundleName),
        "--dev", development,
        "--entry-file", entryFile,
        "--platform", platform,
    ]);

    if (sourcemapOutput) {
        reactNativeBundleArgs.push("--sourcemap-output", sourcemapOutput);
    }

    if (config) {
        reactNativeBundleArgs.push("--config", config);
    }

    log(chalk.cyan("Running \"react-native bundle\" command:\n"));
    var reactNativeBundleProcess = spawn("node", reactNativeBundleArgs);
    log(`node ${reactNativeBundleArgs.join(" ")}`);

    return Promise<void>((resolve, reject, notify) => {
        reactNativeBundleProcess.stdout.on("data", (data: Buffer) => {
            log(data.toString().trim());
        });

        reactNativeBundleProcess.stderr.on("data", (data: Buffer) => {
            console.error(data.toString().trim());
        });

        reactNativeBundleProcess.on("close", (exitCode: number) => {
            if (exitCode) {
                reject(new Error(`"react-native bundle" command exited with code ${exitCode}.`));
            }

            resolve(<void>null);
        });
    });
}

function serializeConnectionInfo(accessKey: string, preserveAccessKeyOnLogout: boolean, customServerUrl?: string, proxy?: string, noProxy?: boolean): void {
    var connectionInfo: ILoginConnectionInfo = { accessKey: accessKey, preserveAccessKeyOnLogout: preserveAccessKeyOnLogout, proxy: proxy, noProxy: noProxy };
    if (customServerUrl) {
        connectionInfo.customServerUrl = customServerUrl;
    }

    var json: string = JSON.stringify(connectionInfo);
    fs.writeFileSync(configFilePath, json, { encoding: "utf8" });

    log(`\r\nSuccessfully logged-in. Your session file was written to ${chalk.cyan(configFilePath)}. You can run the ${chalk.cyan("code-push logout")} command at any time to delete this file and terminate your session.\r\n`);
}

function sessionList(command: cli.ISessionListCommand): Promise<void> {
    throwForInvalidOutputFormat(command.format);

    return sdk.getSessions()
        .then((sessions: Session[]): void => {
            printSessions(command.format, sessions);
        });
}

function sessionRemove(command: cli.ISessionRemoveCommand): Promise<void> {
    if (os.hostname() === command.machineName) {
        throw new Error("Cannot remove the current login session via this command. Please run 'code-push logout' instead.");
    } else {
        return confirm()
            .then((wasConfirmed: boolean): Promise<void> => {
                if (wasConfirmed) {
                    return sdk.removeSession(command.machineName)
                        .then((): void => {
                            log(`Successfully removed the login session for "${command.machineName}".`);
                        });
                }

                log("Session removal cancelled.");
            });
    }
}

function releaseErrorHandler(error: CodePushError, command: cli.ICommand): void {
    if ((<any>command).noDuplicateReleaseError && error.statusCode === AccountManager.ERROR_CONFLICT) {
        console.warn(chalk.yellow("[Warning] " + error.message));
    } else {
        throw error;
    }
}

function isBinaryOrZip(path: string): boolean {
    return path.search(/\.zip$/i) !== -1
        || path.search(/\.apk$/i) !== -1
        || path.search(/\.ipa$/i) !== -1;
}

function throwForInvalidEmail(email: string): void {
    if (!emailValidator.validate(email)) {
        throw new Error("\"" + email + "\" is an invalid e-mail address.");
    }
}

function throwForInvalidSemverRange(semverRange: string): void {
    if (semver.validRange(semverRange) === null) {
        throw new Error("Please use a semver-compliant target binary version range, for example \"1.0.0\", \"*\" or \"^1.2.3\".");
    }
}

function throwForInvalidOutputFormat(format: string): void {
    switch (format) {
        case "json":
        case "table":
            break;

        default:
            throw new Error("Invalid format:  " + format + ".");
    }
}

function whoami(command: cli.ICommand): Promise<void> {
    return sdk.getAccountInfo()
        .then((account): void => {
            var accountInfo = `${account.email}`;

            var connectionInfo = deserializeConnectionInfo();
            if (connectionInfo.noProxy || connectionInfo.proxy) {
                log(chalk.green('Account: ') + accountInfo);

                var proxyInfo = chalk.green('Proxy: ') + (connectionInfo.noProxy ? 'Ignored' : connectionInfo.proxy);
                log(proxyInfo);
            } else {
                log(accountInfo);
            }
        });
}

function getProxy(proxy?: string, noProxy?: boolean): string {
    if (noProxy) return null;
    if (!proxy) return process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy;
    else return proxy;
}

function isCommandOptionSpecified(option: any): boolean {
    return option !== undefined && option !== null;
}

function getSdk(accessKey: string, headers: Headers, customServerUrl: string, proxy: string): AccountManager {
    var sdk: any = new AccountManager(accessKey, CLI_HEADERS, customServerUrl, proxy);
    /*
     * If the server returns `Unauthorized`, it must be due to an invalid
     * (or expired) access key. For convenience, we patch every SDK call
     * to delete the cached connection so the user can simply
     * login again instead of having to log out first.
     */
    Object.getOwnPropertyNames(AccountManager.prototype).forEach((functionName: any) => {
        if (typeof sdk[functionName] === "function") {
            var originalFunction = sdk[functionName];
            sdk[functionName] = function () {
                var maybePromise: Promise<any> = originalFunction.apply(sdk, arguments);
                if (maybePromise && maybePromise.then !== undefined) {
                    maybePromise = maybePromise
                        .catch((error: any) => {
                            if (error.statusCode && error.statusCode === AccountManager.ERROR_UNAUTHORIZED) {
                                deleteConnectionInfoCache(/* printMessage */ false);
                            }

                            throw error;
                        });
                }

                return maybePromise;
            };
        }
    });

    return sdk;
}
