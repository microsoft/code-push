import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import Q = require("q");
import slash = require("slash");
import superagent = require("superagent");
import * as recursiveFs from "recursive-fs";
import * as yazl from "yazl";

import Promise = Q.Promise;

import { AccessKey, AccessKeyRequest, Account, App, AppCreationRequest, CodePushError, CollaboratorMap, CollaboratorProperties, Deployment, DeploymentMetrics, Headers, Package, PackageInfo, ServerAccessKey, Session, UpdateMetrics } from "./types";

var superproxy = require("superagent-proxy");
superproxy(superagent);

var packageJson = require("../package.json");

interface JsonResponse {
    headers: Headers;
    body?: any;
}

interface PackageFile {
    isTemporary: boolean;
    path: string;
}

// A template string tag function that URL encodes the substituted values
function urlEncode(strings: string[], ...values: string[]): string {
    var result = "";
    for (var i = 0; i < strings.length; i++) {
        result += strings[i];
        if (i < values.length) {
            result += encodeURIComponent(values[i]);
        }
    }

    return result;
}

class AccountManager {
    public static AppPermission = {
        OWNER: "Owner",
        COLLABORATOR: "Collaborator"
    };
    public static SERVER_URL = "https://codepush-management.azurewebsites.net";
    public static MOBILE_CENTER_SERVER_URL = "https://mobile.azure.com";

    private static API_VERSION: number = 2;

    public static ERROR_GATEWAY_TIMEOUT = 504;  // Used if there is a network error
    public static ERROR_INTERNAL_SERVER = 500;
    public static ERROR_NOT_FOUND = 404;
    public static ERROR_CONFLICT = 409;         // Used if the resource already exists
    public static ERROR_UNAUTHORIZED = 401;

    private _accessKey: string;
    private _serverUrl: string;
    private _customHeaders: Headers;
    private _proxy: string;

    constructor(accessKey: string, customHeaders?: Headers, serverUrl?: string, proxy?: string) {
        if (!accessKey) throw new Error("A token must be specified.");

        this._accessKey = accessKey;
        this._customHeaders = customHeaders;
        this._serverUrl = serverUrl || AccountManager.SERVER_URL;
        this._proxy = proxy;
    }

    public get accessKey(): string {
        return this._accessKey;
    }

    public isAuthenticated(throwIfUnauthorized?: boolean): Promise<boolean> {
        return Promise<any>((resolve, reject, notify) => {
            var request: superagent.Request<any> = superagent.get(this._serverUrl + urlEncode `/authenticated`);
            if (this._proxy) (<any>request).proxy(this._proxy);
            this.attachCredentials(request);

            request.end((err: any, res: superagent.Response) => {
                var status: number = this.getErrorStatus(err, res);
                if (err && status !== AccountManager.ERROR_UNAUTHORIZED) {
                    reject(this.getCodePushError(err, res));
                    return;
                }

                var authenticated: boolean = status === 200;

                if (!authenticated && throwIfUnauthorized){
                    reject(this.getCodePushError(err, res));
                    return;
                }

                resolve(authenticated);
            });
        });
    }

    public addAccessKey(friendlyName: string, ttl?: number): Promise<AccessKey> {
        if (!friendlyName) {
            throw new Error("A name must be specified when adding an access key.");
        }

        var accessKeyRequest: AccessKeyRequest = {
            createdBy: os.hostname(),
            friendlyName,
            ttl
        };

        return this.post(urlEncode `/accessKeys/`, JSON.stringify(accessKeyRequest), /*expectResponseBody=*/ true)
            .then((response: JsonResponse) => {
                return {
                    createdTime: response.body.accessKey.createdTime,
                    expires: response.body.accessKey.expires,
                    key: response.body.accessKey.name,
                    name: response.body.accessKey.friendlyName
                };
            });
    }

    public getAccessKey(accessKeyName: string): Promise<AccessKey> {
        return this.get(urlEncode `/accessKeys/${accessKeyName}`)
            .then((res: JsonResponse) => {
                return {
                    createdTime: res.body.accessKey.createdTime,
                    expires: res.body.accessKey.expires,
                    name: res.body.accessKey.friendlyName,
                };
            });
    }

    public getAccessKeys(): Promise<AccessKey[]> {
        return this.get(urlEncode `/accessKeys`)
            .then((res: JsonResponse) => {
                var accessKeys: AccessKey[] = [];

                res.body.accessKeys.forEach((serverAccessKey: ServerAccessKey) => {
                    !serverAccessKey.isSession && accessKeys.push({
                        createdTime: serverAccessKey.createdTime,
                        expires: serverAccessKey.expires,
                        name: serverAccessKey.friendlyName
                    });
                });

                return accessKeys;
            });
    }

    public getSessions(): Promise<Session[]> {
        return this.get(urlEncode `/accessKeys`)
            .then((res: JsonResponse) => {
                // A machine name might be associated with multiple session keys,
                // but we should only return one per machine name.
                var sessionMap: { [machineName: string]: Session } = {};
                var now: number = new Date().getTime();
                res.body.accessKeys.forEach((serverAccessKey: ServerAccessKey) => {
                    if (serverAccessKey.isSession && serverAccessKey.expires > now) {
                        sessionMap[serverAccessKey.createdBy] = {
                            loggedInTime: serverAccessKey.createdTime,
                            machineName: serverAccessKey.createdBy
                        };
                    }
                });

                var sessions: Session[] = Object.keys(sessionMap)
                    .map((machineName: string) => sessionMap[machineName]);

                return sessions;
            });
    }


    public patchAccessKey(oldName: string, newName?: string, ttl?: number): Promise<AccessKey> {
        var accessKeyRequest: AccessKeyRequest = {
            friendlyName: newName,
            ttl
        };

        return this.patch(urlEncode `/accessKeys/${oldName}`, JSON.stringify(accessKeyRequest))
            .then((res: JsonResponse) => {
                return {
                    createdTime: res.body.accessKey.createdTime,
                    expires: res.body.accessKey.expires,
                    name: res.body.accessKey.friendlyName,
                };
            });
    }

    public removeAccessKey(name: string): Promise<void> {
        return this.del(urlEncode `/accessKeys/${name}`)
            .then(() => null);
    }

    public removeSession(machineName: string): Promise<void> {
        return this.del(urlEncode `/sessions/${machineName}`)
            .then(() => null);
    }

    // Account
    public getAccountInfo(): Promise<Account> {
        return this.get(urlEncode `/account`)
            .then((res: JsonResponse) => res.body.account);
    }

    // Apps
    public getApps(): Promise<App[]> {
        return this.get(urlEncode `/apps`)
            .then((res: JsonResponse) => res.body.apps);
    }

    public getApp(appName: string): Promise<App> {
        return this.get(urlEncode `/apps/${this.appNameParam(appName)}`)
            .then((res: JsonResponse) => res.body.app);
    }

    public addApp(appName: string, appOs: string, appPlatform: string, manuallyProvisionDeployments: boolean = false): Promise<App> {
        var app: AppCreationRequest = {
            name: appName,
            os: appOs,
            platform: appPlatform,
            manuallyProvisionDeployments: manuallyProvisionDeployments
        };
        return this.post(urlEncode `/apps/`, JSON.stringify(app), /*expectResponseBody=*/ false)
            .then(() => app);
    }

    public removeApp(appName: string): Promise<void> {
        return this.del(urlEncode `/apps/${this.appNameParam(appName)}`)
            .then(() => null);
    }

    public renameApp(oldAppName: string, newAppName: string): Promise<void> {
        return this.patch(urlEncode `/apps/${this.appNameParam(oldAppName)}`, JSON.stringify({ name: newAppName }))
            .then(() => null);
    }

    public transferApp(appName: string, email: string): Promise<void> {
        return this.post(urlEncode `/apps/${this.appNameParam(appName)}/transfer/${email}`, /*requestBody=*/ null, /*expectResponseBody=*/ false)
            .then(() => null);
    }

    // Collaborators
    public getCollaborators(appName: string): Promise<CollaboratorMap> {
        return this.get(urlEncode `/apps/${this.appNameParam(appName)}/collaborators`)
            .then((res: JsonResponse) => res.body.collaborators);
    }

    public addCollaborator(appName: string, email: string): Promise<void> {
        return this.post(urlEncode `/apps/${this.appNameParam(appName)}/collaborators/${email}`, /*requestBody=*/ null, /*expectResponseBody=*/ false)
            .then(() => null);
    }

    public removeCollaborator(appName: string, email: string): Promise<void> {
        return this.del(urlEncode `/apps/${this.appNameParam(appName)}/collaborators/${email}`)
            .then(() => null);
    }

    // Deployments
    public addDeployment(appName: string, deploymentName: string): Promise<Deployment> {
        var deployment = <Deployment>{ name: deploymentName };
        return this.post(urlEncode `/apps/${this.appNameParam(appName)}/deployments/`, JSON.stringify(deployment), /*expectResponseBody=*/ true)
            .then((res: JsonResponse) => res.body.deployment);
    }

    public clearDeploymentHistory(appName: string, deploymentName: string): Promise<void> {
        return this.del(urlEncode `/apps/${this.appNameParam(appName)}/deployments/${deploymentName}/history`)
            .then(() => null);
    }

    public getDeployments(appName: string): Promise<Deployment[]> {
        return this.get(urlEncode `/apps/${this.appNameParam(appName)}/deployments/`)
            .then((res: JsonResponse) => res.body.deployments);
    }

    public getDeployment(appName: string, deploymentName: string): Promise<Deployment> {
        return this.get(urlEncode `/apps/${this.appNameParam(appName)}/deployments/${deploymentName}`)
            .then((res: JsonResponse) => res.body.deployment);
    }

    public renameDeployment(appName: string, oldDeploymentName: string, newDeploymentName: string): Promise<void> {
        return this.patch(urlEncode `/apps/${this.appNameParam(appName)}/deployments/${oldDeploymentName}`, JSON.stringify({ name: newDeploymentName }))
            .then(() => null);
    }

    public removeDeployment(appName: string, deploymentName: string): Promise<void> {
        return this.del(urlEncode `/apps/${this.appNameParam(appName)}/deployments/${deploymentName}`)
            .then(() => null);
    }

    public getDeploymentMetrics(appName: string, deploymentName: string): Promise<DeploymentMetrics> {
        return this.get(urlEncode `/apps/${this.appNameParam(appName)}/deployments/${deploymentName}/metrics`)
            .then((res: JsonResponse) => res.body.metrics);
    }

    public getDeploymentHistory(appName: string, deploymentName: string): Promise<Package[]> {
        return this.get(urlEncode `/apps/${this.appNameParam(appName)}/deployments/${deploymentName}/history`)
            .then((res: JsonResponse) => res.body.history);
    }

    public release(appName: string, deploymentName: string, filePath: string, targetBinaryVersion: string, updateMetadata: PackageInfo, uploadProgressCallback?: (progress: number) => void): Promise<Package> {

        return Promise<Package>((resolve, reject, notify) => {

            updateMetadata.appVersion = targetBinaryVersion;
            var request: superagent.Request<any> = superagent.post(this._serverUrl + urlEncode `/apps/${this.appNameParam(appName)}/deployments/${deploymentName}/release`);
            if (this._proxy) (<any>request).proxy(this._proxy);
            this.attachCredentials(request);

            var getPackageFilePromise: Promise<PackageFile> = this.packageFileFromPath(filePath);

            getPackageFilePromise.then((packageFile: PackageFile) => {
                var file: any = fs.createReadStream(packageFile.path);
                request.attach("package", file)
                    .field("packageInfo", JSON.stringify(updateMetadata))
                    .on("progress", (event: any) => {
                        if (uploadProgressCallback && event && event.total > 0) {
                            var currentProgress: number = event.loaded / event.total * 100;
                            uploadProgressCallback(currentProgress);
                        }
                    })
                    .end((err: any, res: superagent.Response) => {

                        if (packageFile.isTemporary) {
                            fs.unlinkSync(packageFile.path);
                        }

                        if (err) {
                            reject(this.getCodePushError(err, res));
                            return;
                        }

                        try {
                            var body = JSON.parse(res.text);
                        } catch (err) {
                            reject(<CodePushError>{ message: `Could not parse response: ${res.text}`, statusCode: AccountManager.ERROR_INTERNAL_SERVER });
                            return;
                        }

                        if (res.ok) {
                            resolve(<Package>body.package);
                        } else {
                            reject(<CodePushError>{ message: body.message, statusCode: res && res.status });
                        }
                    });
            });
        });
    }

    public patchRelease(appName: string, deploymentName: string, label: string, updateMetadata: PackageInfo): Promise<void> {
        updateMetadata.label = label;
        var requestBody: string = JSON.stringify({ packageInfo: updateMetadata });
        return this.patch(urlEncode `/apps/${this.appNameParam(appName)}/deployments/${deploymentName}/release`, requestBody, /*expectResponseBody=*/ false)
            .then(() => null);
    }

    public promote(appName: string, sourceDeploymentName: string, destinationDeploymentName: string,  updateMetadata: PackageInfo): Promise<Package> {
        var requestBody: string = JSON.stringify({ packageInfo: updateMetadata });
        return this.post(urlEncode `/apps/${this.appNameParam(appName)}/deployments/${sourceDeploymentName}/promote/${destinationDeploymentName}`, requestBody, /*expectResponseBody=*/ true)
            .then((res: JsonResponse) => res.body.package);
    }

    public rollback(appName: string, deploymentName: string, targetRelease?: string): Promise<void> {
        return this.post(urlEncode `/apps/${this.appNameParam(appName)}/deployments/${deploymentName}/rollback/${targetRelease || ``}`, /*requestBody=*/ null, /*expectResponseBody=*/ false)
            .then(() => null);
    }

    private packageFileFromPath(filePath: string): Promise<PackageFile> {
        var getPackageFilePromise: Promise<PackageFile>;
        if (fs.lstatSync(filePath).isDirectory()) {
            getPackageFilePromise = Promise<PackageFile>((resolve: (file: PackageFile) => void, reject: (reason: Error) => void): void => {
                var directoryPath: string = filePath;

                recursiveFs.readdirr(directoryPath, (error?: any, directories?: string[], files?: string[]): void => {
                    if (error) {
                        reject(error);
                        return;
                    }

                    var baseDirectoryPath = path.dirname(directoryPath);
                    var fileName: string = this.generateRandomFilename(15) + ".zip";
                    var zipFile = new yazl.ZipFile();
                    var writeStream: fs.WriteStream = fs.createWriteStream(fileName);

                    zipFile.outputStream.pipe(writeStream)
                        .on("error", (error: Error): void => {
                            reject(error);
                        })
                        .on("close", (): void => {
                            filePath = path.join(process.cwd(), fileName);

                            resolve({ isTemporary: true, path: filePath });
                        });

                    for (var i = 0; i < files.length; ++i) {
                        var file: string = files[i];
                        var relativePath: string = path.relative(baseDirectoryPath, file);

                        // yazl does not like backslash (\) in the metadata path.
                        relativePath = slash(relativePath);

                        zipFile.addFile(file, relativePath);
                    }

                    zipFile.end();
                });
            });
        } else {
            getPackageFilePromise = Q({ isTemporary: false, path: filePath });
        }
        return getPackageFilePromise;
    }

    private generateRandomFilename(length: number): string {
        var filename: string = "";
        var validChar: string = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

        for (var i = 0; i < length; i++) {
            filename += validChar.charAt(Math.floor(Math.random() * validChar.length));
        }

        return filename;
    }

    private get(endpoint: string, expectResponseBody: boolean = true): Promise<JsonResponse> {
        return this.makeApiRequest("get", endpoint, /*requestBody=*/ null, expectResponseBody, /*contentType=*/ null);
    }

    private post(endpoint: string, requestBody: string, expectResponseBody: boolean, contentType: string = "application/json;charset=UTF-8"): Promise<JsonResponse> {
        return this.makeApiRequest("post", endpoint, requestBody, expectResponseBody, contentType);
    }

    private patch(endpoint: string, requestBody: string, expectResponseBody: boolean = false, contentType: string = "application/json;charset=UTF-8"): Promise<JsonResponse> {
        return this.makeApiRequest("patch", endpoint, requestBody, expectResponseBody, contentType);
    }

    private del(endpoint: string, expectResponseBody: boolean = false): Promise<JsonResponse> {
        return this.makeApiRequest("del", endpoint, /*requestBody=*/ null, expectResponseBody, /*contentType=*/ null);
    }

    private makeApiRequest(method: string, endpoint: string, requestBody: string, expectResponseBody: boolean, contentType: string): Promise<JsonResponse> {
        return Promise<JsonResponse>((resolve, reject, notify) => {
            var request: superagent.Request<any> = (<any>superagent)[method](this._serverUrl + endpoint);
            if (this._proxy) (<any>request).proxy(this._proxy);
            this.attachCredentials(request);

            if (requestBody) {
                if (contentType) {
                    request = request.set("Content-Type", contentType);
                }

                request = request.send(requestBody);
            }

            request.end((err: any, res: superagent.Response) => {
                if (err) {
                    reject(this.getCodePushError(err, res));
                    return;
                }

                try {
                    var body = JSON.parse(res.text);
                } catch (err) {
                }

                if (res.ok) {
                    if (expectResponseBody && !body) {
                        reject(<CodePushError>{ message: `Could not parse response: ${res.text}`, statusCode: AccountManager.ERROR_INTERNAL_SERVER });
                    } else {
                        resolve(<JsonResponse>{
                            headers: res.header,
                            body: body
                        });
                    }
                } else {
                    if (body) {
                        reject(<CodePushError>{ message: body.message, statusCode: this.getErrorStatus(err, res) });
                    } else {
                        reject(<CodePushError>{ message: res.text, statusCode: this.getErrorStatus(err, res) });
                    }
                }
            });
        });
    }

    private getCodePushError(error: any, response: superagent.Response): CodePushError {
        if (error.syscall === "getaddrinfo") {
            error.message = `Unable to connect to the CodePush server. Are you offline, or behind a firewall or proxy?\n(${error.message})`;
        }

        return {
            message: this.getErrorMessage(error, response),
            statusCode: this.getErrorStatus(error, response)
        };
    }

    private getErrorStatus(error: any, response: superagent.Response): number {
        return (error && error.status) || (response && response.status) || AccountManager.ERROR_GATEWAY_TIMEOUT;
    }

    private getErrorMessage(error: Error, response: superagent.Response): string {
        return response && response.text ? response.text : error.message;
    }

    private attachCredentials(request: superagent.Request<any>): void {
        if (this._customHeaders) {
            for (var headerName in this._customHeaders) {
                request.set(headerName, this._customHeaders[headerName]);
            }
        }

        request.set("Accept", `application/vnd.code-push.v${AccountManager.API_VERSION}+json`);
        request.set("Authorization", `Bearer ${this._accessKey}`);
        request.set("X-CodePush-SDK-Version", packageJson.version);
    }

    // IIS and Azure web apps have this annoying behavior where %2F (URL encoded slashes) in the URL are URL decoded
    // BEFORE the requests reach node. That essentially means there's no good way to encode a "/" in the app name--
    // URL encodeing will work when running locally but when running on Azure it gets decoded before express sees it,
    // so app names with slashes don't get routed properly. See https://github.com/tjanczuk/iisnode/issues/343 (or other sites
    // that complain about the same) for some more info. I explored some IIS config based workarounds, but the previous
    // link seems to say they won't work, so I eventually gave up on that.
    // Anyway, to workaround this issue, we now allow the client to encode / characters as ~~ (two tildes, URL encoded).
    // The CLI now converts / to ~~ if / appears in an app name, before passing that as part of the URL. This code below
    // does the encoding. It's hack, but seems like the least bad option here.
    // Eventually, this service will go away & we'll all be on Max's new service. That's hosted in docker, no more IIS,
    // so this issue should go away then.
    private appNameParam(appName: string) {
        return appName.replace("/", "~~");
    }
}

export = AccountManager;
