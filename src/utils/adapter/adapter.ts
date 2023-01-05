import * as adapterTypes from "./adapter-types";
import * as sdkTypes from "../../script/types";
import RequestManager from "../request-manager";

class Adapter {
    constructor(private readonly _requestManager: RequestManager) { }

    public toLegacyAccount(profile: adapterTypes.UserProfile): sdkTypes.Account {
        return {
            name: profile.name,
            email: profile.email,
            linkedProviders: []
        };
    }

    public toLegacyAccessKey(apiToken: adapterTypes.ApiToken): sdkTypes.AccessKey {
        const accessKey: sdkTypes.AccessKey = {
            createdTime: Date.parse(apiToken.created_at),
            expires: Date.parse('9999-12-31T23:59:59'), // never,
            key: apiToken.api_token,
            name: apiToken.description
        };

        return accessKey;
    }

    public toLegacyAccessKeyList(apiTokens: adapterTypes.ApiTokensGetResponse[]): sdkTypes.AccessKey[] {
        console.log(apiTokens);
        const accessKeyList: sdkTypes.AccessKey[] = apiTokens.map((apiToken) => {
            const accessKey: sdkTypes.AccessKey = {
                createdTime: Date.parse(apiToken.created_at),
                expires: Date.parse('9999-12-31T23:59:59'), // never,
                name: apiToken.description,
            };

            return accessKey;
        });

        accessKeyList.sort(
            (first: sdkTypes.AccessKey, second: sdkTypes.AccessKey) => {
                const firstTime = first.createdTime || 0;
                const secondTime = second.createdTime || 0;
                return firstTime - secondTime;
            }
        );

        return accessKeyList;
    }

    public async toLegacyApp(app: adapterTypes.App): Promise<sdkTypes.App> {
        const [user, deployments] = await Promise.all([this.getUser(), this.getDeployments(app.owner.name, app.name)]);
        const deploymentsNames = deployments.map((deployment: adapterTypes.Deployment) => deployment.name);
        return this.toLegacyRestApp(app, user, deploymentsNames);
    };

    public async toLegacyApps(apps: adapterTypes.App[]): Promise<sdkTypes.App[]> {
        const user = await this.getUser();
        const sortedApps = await Promise.all(
            apps.sort((first: adapterTypes.App, second: adapterTypes.App) => {
                const firstOwner = first.owner.name || '';
                const secondOwner = second.owner.name || '';

                // First sort by owner, then by app name
                if (firstOwner !== secondOwner) {
                    return firstOwner.localeCompare(secondOwner);
                } else {
                    return first.name.localeCompare(second.name);
                }
            })
        );

        const legacyApps = await Promise.all(
            sortedApps.map(async (app) => {
                const deployments: adapterTypes.Deployment[] = await this.getDeployments(app.owner.name, app.name);
                const deploymentsNames = deployments.map((deployment: adapterTypes.Deployment) => deployment.name);

                return this.toLegacyRestApp(app, user, deploymentsNames);
            })
        );

        return legacyApps;
    };

    public toApigatewayAppCreationRequest(appToCreate: sdkTypes.AppCreationRequest): adapterTypes.ApigatewayAppCreationRequest {
        if (
            appToCreate.os !== 'iOS' &&
            appToCreate.os !== 'Android' &&
            appToCreate.os !== 'Windows' &&
            appToCreate.os !== 'Linux'
        ) {
            throw this.getCodePushError(`The app OS "${appToCreate.os}" isn't valid. It should be "iOS", "Android", "Windows" or "Linux".`, RequestManager.ERROR_CONFLICT);
        }

        if (
            appToCreate.platform !== 'React-Native' &&
            appToCreate.platform !== 'Cordova' &&
            appToCreate.platform !== 'Electron'
        ) {
            throw this.getCodePushError(`The app platform "${appToCreate.platform}" isn't valid. It should be "React-Native", "Cordova" or "Electron".`, RequestManager.ERROR_CONFLICT);
        }

        const org: string = this.getOrgFromLegacyAppRequest(appToCreate);
        const appcenterClientApp: adapterTypes.App = this.toAppcenterClientApp(appToCreate);

        if (!this.isValidAppCenterAppName(appcenterClientApp.display_name)) {
            throw this.getCodePushError(`The app name "${appcenterClientApp.display_name}" isn't valid. It can only contain alphanumeric characters, dashes, periods, or underscores.`, RequestManager.ERROR_CONFLICT);
        }

        return { org, appcenterClientApp };
    }

    public async addStandardDeployments(apiAppName: string): Promise<void> {
        const { appOwner, appName } = await this.parseApiAppName(apiAppName);
        const deploymentsToCreate = ['Staging', 'Production'];
        await Promise.all(
            deploymentsToCreate.map(async (deploymentName) => {
                const deployment = <sdkTypes.Deployment>{ name: deploymentName };
                return await this._requestManager.post(`/apps/${appOwner}/${appName}/deployments/`, JSON.stringify(deployment), /*expectResponseBody=*/ true);
            })
        );

        return;
    };

    public async getRenamedApp(newName: string, appOwner: string, oldName: string): Promise<adapterTypes.UpdatedApp> {
        const app = await this.getApp(appOwner, oldName);

        if (newName.indexOf('/') !== -1) {
            throw this.getCodePushError(`The new app name "${newName}" must be unqualified, not having a '/' character.`, RequestManager.ERROR_CONFLICT);
        }

        if (!this.isValidAppCenterAppName(newName)) {
            throw this.getCodePushError(`The app name "${newName}" isn't valid. It can only contain alphanumeric characters, dashes, periods, or underscores.`, RequestManager.ERROR_CONFLICT);
        }

        // If the display name was set on the existing app, then it was different than the app name. In that case, leave the display name unchanged;
        // the user can change the display name through the Mobile Center web portal if they want to rename it.
        // But if the display name and app name were the same, then rename them both.
        const updatedApp =
            app.name === app.display_name
                ? {
                    name: newName,
                    display_name: newName
                }
                : { name: newName };

        return updatedApp;
    }

    public async resolveAccessKey(accessKeyName: string): Promise<adapterTypes.ApiTokensGetResponse> {
        const accessKeys = await this.getApiTokens();
        const foundAccessKey = accessKeys.find((key) => {
            return key.description === accessKeyName;
        });

        if (!foundAccessKey) {
            throw this.getCodePushError(`Access key "${accessKeyName}" does not exist.`, RequestManager.ERROR_NOT_FOUND);
        }

        return foundAccessKey;
    }

    public toLegacyDeployments(deployments: adapterTypes.Deployment[]): sdkTypes.Deployment[] {
        deployments.sort((first: adapterTypes.Deployment, second: adapterTypes.Deployment) => {
            return first.name.localeCompare(second.name);
        });

        return this.toLegacyRestDeployments(deployments);
    };

    public toLegacyDeployment(deployment: adapterTypes.Deployment): sdkTypes.Deployment {
        return this.toLegacyRestDeployment(deployment);
    };

    public async toLegacyCollaborators(
        userList: adapterTypes.UserProfile[],
        appOwner: string,
    ): Promise<sdkTypes.CollaboratorMap> {
        const callingUser = await this.getUser();
        const legacyCollaborators: sdkTypes.CollaboratorMap = {};
        userList.forEach((user) => {
            legacyCollaborators[user.email] = {
                isCurrentAccount: callingUser.email === user.email,
                permission: this.toLegacyUserPermission(user.permissions[0], user.name && user.name === appOwner)
            };
        });
        return legacyCollaborators;
    }

    public async toLegacyDeploymentMetrics(
        deploymentMetrics: adapterTypes.DeploymentMetrics[],
    ): Promise<sdkTypes.DeploymentMetrics> {
        const legacyDeploymentMetrics: sdkTypes.DeploymentMetrics = {};
        deploymentMetrics.forEach((deployment) => {
            legacyDeploymentMetrics[deployment.label] = {
                active: deployment.active,
                downloaded: deployment.downloaded,
                failed: deployment.failed,
                installed: deployment.installed
            };
        });
        return legacyDeploymentMetrics;
    }

    public async parseApiAppName(apiAppName: string): Promise<adapterTypes.appParams> {
        const callingUser = await this.getUser();
        // If the separating / is not included, assume the owner is the calling user and only the app name is provided
        if (!apiAppName.includes("/")) {
            return {
                appOwner: callingUser.name,
                appName: apiAppName,
            };
        }
        const [appOwner, appName] = apiAppName.split("/");
        return {
            appOwner: appOwner,
            appName: appName,
        };
    }

    public toLegacyDeploymentHistory(releases: adapterTypes.CodePushRelease[]): sdkTypes.Package[] {
        return releases.map((release) => this.releaseToPackage(release));
    }

    private toLegacyRestApp(app: adapterTypes.App, user: adapterTypes.UserProfile, deployments: string[]): sdkTypes.App {
        const isCurrentAccount: boolean = user.id === app.owner.id;
        const isNameAndDisplayNameSame: boolean = app.name === app.display_name;

        let appName: string = app.name;
        if (!isCurrentAccount) {
            appName = app.owner.name + '/' + app.name;
        }

        if (!isNameAndDisplayNameSame) {
            appName += `  (${app.display_name})`;
        }

        return {
            name: appName,
            collaborators: {
                [app.owner.name]: {
                    isCurrentAccount: user.id === app.owner.id,
                    permission: 'Owner'
                }
            },
            deployments,
            os: app.os,
            platform: app.platform
        };
    }

    public toReleaseUploadProperties(updateMetadata: sdkTypes.PackageInfo, releaseUploadAssets: sdkTypes.ReleaseUploadAssets, deploymentName: string): sdkTypes.UploadReleaseProperties {
        const releaseUpload: sdkTypes.UploadReleaseProperties = {
            release_upload: releaseUploadAssets,
            target_binary_version: updateMetadata.appVersion,
            deployment_name: deploymentName,
            no_duplicate_release_error: false, // This property is not implemented in CodePush SDK Management
        }

        if (updateMetadata.description) releaseUpload.description = updateMetadata.description;

        if (updateMetadata.isDisabled) releaseUpload.disabled = updateMetadata.isDisabled;

        if (updateMetadata.isMandatory) releaseUpload.mandatory = updateMetadata.isMandatory;

        if (updateMetadata.rollout) releaseUpload.rollout = updateMetadata.rollout;

        return releaseUpload;
    }

    public toRestReleaseModification(
        legacyCodePushReleaseInfo: sdkTypes.PackageInfo
    ): adapterTypes.ReleaseModification {
        let releaseModification: adapterTypes.ReleaseModification = {} as adapterTypes.ReleaseModification ;

        if (legacyCodePushReleaseInfo.appVersion) releaseModification.target_binary_range = legacyCodePushReleaseInfo.appVersion;

        if (legacyCodePushReleaseInfo.isDisabled) releaseModification.is_disabled = legacyCodePushReleaseInfo.isDisabled;

        if (legacyCodePushReleaseInfo.isMandatory !== undefined) releaseModification.is_mandatory = legacyCodePushReleaseInfo.isMandatory === true;

        if (legacyCodePushReleaseInfo.description) releaseModification.description = legacyCodePushReleaseInfo.description;

        if (legacyCodePushReleaseInfo.rollout) releaseModification.rollout = legacyCodePushReleaseInfo.rollout;

        if (legacyCodePushReleaseInfo.label) releaseModification.label = legacyCodePushReleaseInfo.label;

        return releaseModification;
    }

    public releaseToPackage(releasePackage: adapterTypes.CodePushRelease): sdkTypes.Package {
        const sdkPackage: sdkTypes.Package = {
            blobUrl: releasePackage.blob_url,
            size: releasePackage.size,
            uploadTime: releasePackage.upload_time,
            isDisabled: !!releasePackage.is_disabled,
            isMandatory: !!releasePackage.is_mandatory,
        }

        if (releasePackage.target_binary_range) sdkPackage.appVersion = releasePackage.target_binary_range;

        if (releasePackage.description) sdkPackage.description = releasePackage.description;

        if (releasePackage.label) sdkPackage.label = releasePackage.label;

        if (releasePackage.package_hash) sdkPackage.packageHash = releasePackage.package_hash;

        if (releasePackage.rollout) sdkPackage.rollout = releasePackage.rollout;

        if (releasePackage.diff_package_map) sdkPackage.diffPackageMap = releasePackage.diff_package_map;

        if (releasePackage.original_label) sdkPackage.originalLabel = releasePackage.original_label;

        if (releasePackage.original_deployment) sdkPackage.originalDeployment = releasePackage.original_deployment;

        if (releasePackage.released_by) sdkPackage.releasedBy = releasePackage.released_by;

        if (releasePackage.release_method) sdkPackage.releaseMethod = releasePackage.release_method;

        return sdkPackage;
    }

    private toLegacyRestDeployments(apiGatewayDeployments: adapterTypes.Deployment[]): sdkTypes.Deployment[] {
        const deployments: sdkTypes.Deployment[] = apiGatewayDeployments.map((deployment) => {
            return this.toLegacyRestDeployment(deployment);
        });

        return deployments;
    }

    private toLegacyRestDeployment(deployment: adapterTypes.Deployment): sdkTypes.Deployment {
        const apiGatewayPackage = deployment.latest_release ? this.releaseToPackage(deployment.latest_release) : null;

        const restDeployment: sdkTypes.Deployment = {
            name: deployment.name,
            key: deployment.key,
            package: apiGatewayPackage
        };

        return restDeployment;
    }

    private async getUser(): Promise<adapterTypes.UserProfile> {
        try {
            const res = await this._requestManager.get(`/user`);
            return res.body;
        } catch (error) {
            throw error;
        }
    }

    private async getApiTokens(): Promise<adapterTypes.ApiTokensGetResponse[]> {
        try {
            const res = await this._requestManager.get(`/api_tokens`);
            return res.body;
        } catch (error) {
            throw error;
        }
    }

    private async getApp(appOwner: string, appName: string): Promise<adapterTypes.App> {
        try {
            const res = await this._requestManager.get(`/apps/${appOwner}/${appName}`);
            return res.body;
        } catch (error) {
            throw error;
        }
    }

    private async getDeployments(appOwner: string, appName: string): Promise<adapterTypes.Deployment[]> {
        try {
            const res = await this._requestManager.get(`/apps/${appOwner}/${appName}/deployments/`);
            return res.body;
        } catch (error) {
            throw error;
        }
    }

    private toLegacyUserPermission(expectedPermission: adapterTypes.AppMemberPermissions, isOwner: boolean): string {
        if (expectedPermission === 'manager') {
            return isOwner ? 'Owner' : 'Manager';
        } else if (expectedPermission === 'developer') {
            return 'Collaborator';
        }
        return 'Reader';
    }

    private getOrgFromLegacyAppRequest(legacyCreateAppRequest: sdkTypes.AppCreationRequest) {
        const slashIndex = legacyCreateAppRequest.name.indexOf('/');
        const org = slashIndex !== -1 ? legacyCreateAppRequest.name.substring(0, slashIndex) : null;

        return org;
    }

    private toAppcenterClientApp(legacyCreateAppRequest: sdkTypes.AppCreationRequest): adapterTypes.App {
        // If the app name contains a slash, then assume that the app is intended to be owned by an org, with the org name
        // before the slash. Update the app info accordingly.
        const slashIndex = legacyCreateAppRequest.name.indexOf('/');

        return {
            os: legacyCreateAppRequest.os as adapterTypes.AppOs,
            platform: legacyCreateAppRequest.platform as adapterTypes.AppPlatform,
            display_name:
                slashIndex !== -1 ? legacyCreateAppRequest.name.substring(slashIndex + 1) : legacyCreateAppRequest.name
        };
    }

    private isValidAppCenterAppName(name: any): boolean {
        return this.getStringValidator(/*maxLength=*/ 1000, /*minLength=*/ 1)(name) && /^[a-zA-Z0-9-._]+$/.test(name); // Only allow alphanumeric characters, dashes, periods, or underscores
    }

    private getStringValidator(maxLength: number = 1000, minLength: number = 0): (value: any) => boolean {
        return function isValidString(value: string): boolean {
            if (typeof value !== 'string') {
                return false;
            }

            if (maxLength > 0 && value.length > maxLength) {
                return false;
            }

            return value.length >= minLength;
        };
    }

    private getCodePushError(message: string, errorCode: number): sdkTypes.CodePushError {
        return {
            message: message,
            statusCode: errorCode
        };
    }
}

export = Adapter;
