import * as fs from "fs";
import * as path from "path";
import slash = require("slash");
import * as recursiveFs from "recursive-fs";
import * as yazl from "yazl";
import Adapter from "../utils/adapter/adapter"
import RequestManager from "../utils/request-manager"
import { CodePushUnauthorizedError } from "./code-push-error"
import FileUploadClient, { IProgress } from "appcenter-file-upload-client";

import { AccessKey, AccessKeyRequest, Account, App, AppCreationRequest, CollaboratorMap, Deployment, DeploymentMetrics, Headers, Package, PackageInfo, ReleaseUploadAssets, UploadReleaseProperties, CodePushError } from "./types";

interface JsonResponse {
    headers: Headers;
    body?: any;
}

interface PackageFile {
    isTemporary: boolean;
    path: string;
}

// A template string tag function that URL encodes the substituted values
function urlEncode(strings: TemplateStringsArray, ...values: string[]): string {
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

    private _accessKey: string;
    private _requestManager: RequestManager;
    private _adapter: Adapter;
    private _fileUploadClient: FileUploadClient;

    constructor(accessKey: string, customHeaders?: Headers, serverUrl?: string, proxy?: string) {
        if (!accessKey) throw new CodePushUnauthorizedError("A token must be specified.");

        this._accessKey = accessKey;
        this._requestManager = new RequestManager(accessKey, customHeaders, serverUrl, proxy);
        this._adapter = new Adapter(this._requestManager);
        this._fileUploadClient = new FileUploadClient();
    }

    public get accessKey(): string {
        return this._accessKey;
    }

    public async isAuthenticated(throwIfUnauthorized?: boolean): Promise<boolean> {
        let res: JsonResponse;
        let codePushError: CodePushError;

        try {
            res = await this._requestManager.get(urlEncode`/user`, false);
        } catch (error) {
            codePushError = error as CodePushError;
            if (codePushError && (codePushError.statusCode !== RequestManager.ERROR_UNAUTHORIZED || throwIfUnauthorized)) {
                throw codePushError;
            }
        }

        const authenticated: boolean = !!res && !!res.body;

        return authenticated;
    }

    // Access keys
    public async addAccessKey(friendlyName: string, ttl?: number): Promise<AccessKey> {
        if (!friendlyName) {
            throw new CodePushUnauthorizedError("A name must be specified when adding an access key.");
        }

        const accessKeyRequest: AccessKeyRequest = {
            description: friendlyName
        };

        const res: JsonResponse = await this._requestManager.post(urlEncode`/api_tokens`, JSON.stringify(accessKeyRequest), /*expectResponseBody=*/ true);
        const accessKey = this._adapter.toLegacyAccessKey(res.body);
        return accessKey;
    }

    public async getAccessKeys(): Promise<AccessKey[]> {
        const res: JsonResponse = await this._requestManager.get(urlEncode`/api_tokens`);
        const accessKeys = this._adapter.toLegacyAccessKeyList(res.body);
        return accessKeys;
    }

    public async removeAccessKey(name: string): Promise<void> {
        const accessKey = await this._adapter.resolveAccessKey(name);

        await this._requestManager.del(urlEncode`/api_tokens/${accessKey.id}`);
        return null;
    }

    // Account
    public async getAccountInfo(): Promise<Account> {
        const res: JsonResponse = await this._requestManager.get(urlEncode`/user`);
        const accountInfo = this._adapter.toLegacyAccount(res.body);
        return accountInfo;
    }

    // Apps
    public async getApps(): Promise<App[]> {
        const res: JsonResponse = await this._requestManager.get(urlEncode`/apps`);
        const apps = await this._adapter.toLegacyApps(res.body);
        return apps;
    }

    public async getApp(appName: string): Promise<App> {
        const appParams = await this._adapter.parseApiAppName(appName);
        const res: JsonResponse = await this._requestManager.get(urlEncode`/apps/${appParams.appOwner}/${appParams.appName}`);
        const app = await this._adapter.toLegacyApp(res.body);
        return app;
    }

    public async addApp(appName: string, appOs: string, appPlatform: string, manuallyProvisionDeployments: boolean = false): Promise<App> {
        var app: AppCreationRequest = {
            name: appName,
            os: appOs,
            platform: appPlatform,
            manuallyProvisionDeployments: manuallyProvisionDeployments
        };

        const apigatewayAppCreationRequest = this._adapter.toApigatewayAppCreationRequest(app);

        const path = apigatewayAppCreationRequest.org ? `/orgs/${apigatewayAppCreationRequest.org}/apps` : `/apps`;
        await this._requestManager.post(path, JSON.stringify(apigatewayAppCreationRequest.appcenterClientApp), /*expectResponseBody=*/ false);

        if (!manuallyProvisionDeployments) {
            await this._adapter.addStandardDeployments(appName);
        }
        return app;
    }

    public async removeApp(appName: string): Promise<void> {
        const appParams = await this._adapter.parseApiAppName(appName);
        await this._requestManager.del(urlEncode`/apps/${appParams.appOwner}/${appParams.appName}`);
        return null;
    }

    public async renameApp(oldAppName: string, newAppName: string): Promise<void> {
        const { appOwner, appName } = await this._adapter.parseApiAppName(oldAppName);
        const updatedApp = await this._adapter.getRenamedApp(newAppName, appOwner, appName);

        await this._requestManager.patch(urlEncode`/apps/${appOwner}/${appName}`, JSON.stringify(updatedApp));
        return null;
    }

    public async transferApp(appName: string, orgName: string): Promise<void> {
        const appParams = await this._adapter.parseApiAppName(appName);

        await this._requestManager.post(urlEncode`/apps/${appParams.appOwner}/${appParams.appName}/transfer/${orgName}`, /*requestBody=*/ null, /*expectResponseBody=*/ false);
        return null;
    }

    // Collaborators
    public async getCollaborators(appName: string): Promise<CollaboratorMap> {
        const appParams = await this._adapter.parseApiAppName(appName);

        const res: JsonResponse = await this._requestManager.get(urlEncode`/apps/${appParams.appOwner}/${appParams.appName}/users`);
        const collaborators = await this._adapter.toLegacyCollaborators(res.body, appParams.appOwner);
        return collaborators;
    }

    public async addCollaborator(appName: string, email: string): Promise<void> {
        const appParams = await this._adapter.parseApiAppName(appName);
        const userEmailRequest = {
            user_email: email
        };
        await this._requestManager.post(urlEncode`/apps/${appParams.appOwner}/${appParams.appName}/invitations`, JSON.stringify(userEmailRequest), /*expectResponseBody=*/ false);
        return null;
    }

    public async removeCollaborator(appName: string, email: string): Promise<void> {
        const appParams = await this._adapter.parseApiAppName(appName);

        await this._requestManager.del(urlEncode`/apps/${appParams.appOwner}/${appParams.appName}/invitations/${email}`);
        return null;
    }

    // Deployments
    public async addDeployment(appName: string, deploymentName: string): Promise<Deployment> {
        const deployment = <Deployment>{ name: deploymentName };
        const appParams = await this._adapter.parseApiAppName(appName);
        const res = await this._requestManager.post(urlEncode`/apps/${appParams.appOwner}/${appParams.appName}/deployments/`, JSON.stringify(deployment), /*expectResponseBody=*/ true);

        return this._adapter.toLegacyDeployment(res.body);
    }

    public async clearDeploymentHistory(appName: string, deploymentName: string): Promise<void> {
        const appParams = await this._adapter.parseApiAppName(appName);

        await this._requestManager.del(urlEncode`/apps/${appParams.appOwner}/${appParams.appName}/deployments/${deploymentName}/releases`);
        return null;
    }

    public async getDeployments(appName: string): Promise<Deployment[]> {
        const appParams = await this._adapter.parseApiAppName(appName);
        const res: JsonResponse = await this._requestManager.get(urlEncode`/apps/${appParams.appOwner}/${appParams.appName}/deployments/`);

        return this._adapter.toLegacyDeployments(res.body);
    }

    public async getDeployment(appName: string, deploymentName: string): Promise<Deployment> {
        const appParams = await this._adapter.parseApiAppName(appName);
        const res: JsonResponse = await this._requestManager.get(urlEncode`/apps/${appParams.appOwner}/${appParams.appName}/deployments/${deploymentName}`);

        return this._adapter.toLegacyDeployment(res.body);
    }

    public async renameDeployment(appName: string, oldDeploymentName: string, newDeploymentName: string): Promise<void> {
        const appParams = await this._adapter.parseApiAppName(appName);
        await this._requestManager.patch(urlEncode`/apps/${appParams.appOwner}/${appParams.appName}/deployments/${oldDeploymentName}`, JSON.stringify({ name: newDeploymentName }));

        return null;
    }

    public async removeDeployment(appName: string, deploymentName: string): Promise<void> {
        const appParams = await this._adapter.parseApiAppName(appName);
        await this._requestManager.del(urlEncode`/apps/${appParams.appOwner}/${appParams.appName}/deployments/${deploymentName}`);

        return null;
    }

    public async getDeploymentMetrics(appName: string, deploymentName: string): Promise<DeploymentMetrics> {
        const appParams = await this._adapter.parseApiAppName(appName);

        const res = await this._requestManager.get(urlEncode`/apps/${appParams.appOwner}/${appParams.appName}/deployments/${deploymentName}/metrics`);
        const deploymentMetrics = this._adapter.toLegacyDeploymentMetrics(res.body);
        return deploymentMetrics;
    }

    public async getDeploymentHistory(appName: string, deploymentName: string): Promise<Package[]> {
        const appParams = await this._adapter.parseApiAppName(appName);
        const res = await this._requestManager.get(urlEncode`/apps/${appParams.appOwner}/${appParams.appName}/deployments/${deploymentName}/releases`);

        return this._adapter.toLegacyDeploymentHistory(res.body);
    }

    // Releases
    public async release(appName: string, deploymentName: string, filePath: string, targetBinaryVersion: string, updateMetadata: PackageInfo, uploadProgressCallback?: (progress: number) => void): Promise<Package> {
        updateMetadata.appVersion = targetBinaryVersion;
        const packageFile: PackageFile = await this.packageFileFromPath(filePath);
        const appParams = await this._adapter.parseApiAppName(appName);

        const assetJsonResponse: JsonResponse = await this._requestManager.post(urlEncode`/apps/${appParams.appOwner}/${appParams.appName}/deployments/${deploymentName}/uploads`, null, true)
        const assets = assetJsonResponse.body as ReleaseUploadAssets;

        await this._fileUploadClient.upload({
            assetId: assets.id,
            assetDomain: assets.upload_domain,
            assetToken: assets.token,
            file: packageFile.path,
            onProgressChanged: (progressData: IProgress) => {
                if (uploadProgressCallback) {
                    uploadProgressCallback(progressData.percentCompleted);
                }
            },
        });

        const releaseUploadProperties: UploadReleaseProperties = this._adapter.toReleaseUploadProperties(updateMetadata, assets, deploymentName);
        const releaseJsonResponse: JsonResponse = await this._requestManager.post(urlEncode`/apps/${appParams.appOwner}/${appParams.appName}/deployments/${deploymentName}/releases`, JSON.stringify(releaseUploadProperties), true);
        const releasePackage: Package = this._adapter.releaseToPackage(releaseJsonResponse.body);

        return releasePackage;
    }

    public async patchRelease(appName: string, deploymentName: string, label: string, updateMetadata: PackageInfo): Promise<void> {
        const appParams = await this._adapter.parseApiAppName(appName);
        const requestBody = this._adapter.toRestReleaseModification(updateMetadata);

        await this._requestManager.patch(urlEncode`/apps/${appParams.appOwner}/${appParams.appName}/deployments/${deploymentName}/releases/${label}`, JSON.stringify(requestBody), /*expectResponseBody=*/ false)
        return null;
    }

    public async promote(appName: string, sourceDeploymentName: string, destinationDeploymentName: string, updateMetadata: PackageInfo): Promise<Package> {
        const appParams = await this._adapter.parseApiAppName(appName);
        const requestBody = this._adapter.toRestReleaseModification(updateMetadata);
        const res = await this._requestManager.post(urlEncode`/apps/${appParams.appOwner}/${appParams.appName}/deployments/${sourceDeploymentName}/promote_release/${destinationDeploymentName}`, JSON.stringify(requestBody), /*expectResponseBody=*/ true);
        const releasePackage: Package = this._adapter.releaseToPackage(res.body);

        return releasePackage;
    }

    public async rollback(appName: string, deploymentName: string, targetRelease?: string): Promise<void> {
        const appParams = await this._adapter.parseApiAppName(appName);
        const requestBody = targetRelease ? {
            label: targetRelease
        } : null;

        await this._requestManager.post(urlEncode`/apps/${appParams.appOwner}/${appParams.appName}/deployments/${deploymentName}/rollback_release`, JSON.stringify(requestBody), /*expectResponseBody=*/ false);
        return null;
    }

    // Deprecated
    public getAccessKey(accessKeyName: string): CodePushError {
        throw {
            message: 'Method is deprecated',
            statusCode: 404
        }
    }

    // Deprecated
    public getSessions(): CodePushError {
        throw this.getDeprecatedMethodError();
    }

    // Deprecated
    public patchAccessKey(oldName: string, newName?: string, ttl?: number): CodePushError {
        throw this.getDeprecatedMethodError();
    }

    // Deprecated
    public removeSession(machineName: string): CodePushError {
        throw this.getDeprecatedMethodError();
    }

    private packageFileFromPath(filePath: string): Promise<PackageFile> {
        var getPackageFilePromise: Promise<PackageFile>;
        if (fs.lstatSync(filePath).isDirectory()) {
            getPackageFilePromise = new Promise<PackageFile>((resolve: (file: PackageFile) => void, reject: (reason: Error) => void): void => {
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
            getPackageFilePromise = new Promise<PackageFile>((resolve: (file: PackageFile) => void, reject: (reason: Error) => void): void => {
                resolve({ isTemporary: false, path: filePath });
            });
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

    private getDeprecatedMethodError() {
        return {
            message: 'Method is deprecated',
            statusCode: 404
        };
    }
}

export = AccountManager;
