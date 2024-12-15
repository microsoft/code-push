import { UpdateCheckResponse, UpdateCheckRequest, DeploymentStatusReport, DownloadReport } from "./types";
import { CodePushHttpError, CodePushDeployStatusError, CodePushPackageError } from "./code-push-error"

export module Http {
    export const enum Verb {
        GET, HEAD, POST, PUT, DELETE, TRACE, OPTIONS, CONNECT, PATCH
    }

    export interface Response {
        statusCode: number;
        body?: string;
    }

    export interface Requester {
        request(verb: Verb, url: string, callback: Callback<Response>): void;
        request(verb: Verb, url: string, requestBody: string, callback: Callback<Response>): void;
    }
}

// All fields are non-nullable, except when retrieving the currently running package on the first run of the app,
// in which case only the appVersion is compulsory
export interface Package {
    deploymentKey: string;
    description: string;
    label: string;
    appVersion: string;
    isMandatory: boolean;
    packageHash: string;
    packageSize: number;
}

export interface RemotePackage extends Package {
    downloadUrl: string;
}

export interface NativeUpdateNotification {
    updateAppVersion: boolean;   // Always true
    appVersion: string;
}

export interface LocalPackage extends Package {
    localPath: string;
}

export interface Callback<T> { (error: Error, parameter: T): void; }

export interface Configuration {
    appVersion: string;
    clientUniqueId: string;
    deploymentKey: string;
    serverUrl: string;
    ignoreAppVersion?: boolean
}

export class AcquisitionStatus {
    public static DeploymentSucceeded = "DeploymentSucceeded";
    public static DeploymentFailed = "DeploymentFailed";
}

export class AcquisitionManager {
    private readonly BASE_URL_PART = "appcenter.ms";
    private _appVersion: string;
    private _clientUniqueId: string;
    private _deploymentKey: string;
    private _httpRequester: Http.Requester;
    private _ignoreAppVersion: boolean;
    private _serverUrl: string;
    private _publicPrefixUrl: string = "v0.1/public/codepush/";
    private _statusCode: number;
    private static _apiCallsDisabled: boolean = false;
    constructor(httpRequester: Http.Requester, configuration: Configuration) {
        this._httpRequester = httpRequester;

        this._serverUrl = configuration.serverUrl;
        if (this._serverUrl.slice(-1) !== "/") {
            this._serverUrl += "/";
        }

        this._appVersion = configuration.appVersion;
        this._clientUniqueId = configuration.clientUniqueId;
        this._deploymentKey = configuration.deploymentKey;
        this._ignoreAppVersion = configuration.ignoreAppVersion;
    }

    private isRecoverable = (statusCode: number): boolean => statusCode >= 500 || statusCode === 408 || statusCode === 429;

    private handleRequestFailure() {
        if (this._serverUrl.includes(this.BASE_URL_PART) && !this.isRecoverable(this._statusCode)) {
            AcquisitionManager._apiCallsDisabled = true;
        }
    }

    public queryUpdateWithCurrentPackage(currentPackage: Package, callback?: Callback<RemotePackage | NativeUpdateNotification>): void {
        if (AcquisitionManager._apiCallsDisabled) {
            console.log(`[CodePush] Api calls are disabled, skipping API call`);
            callback(/*error=*/ null, /*remotePackage=*/ null);
            return;
        }

        if (!currentPackage || !currentPackage.appVersion) {
            throw new CodePushPackageError("Calling common acquisition SDK with incorrect package");  // Unexpected; indicates error in our implementation
        }

        var updateRequest: UpdateCheckRequest = {
            deployment_key: this._deploymentKey,
            app_version: currentPackage.appVersion,
            package_hash: currentPackage.packageHash,
            is_companion: this._ignoreAppVersion,
            label: currentPackage.label,
            client_unique_id: this._clientUniqueId
        };

        var requestUrl: string = this._serverUrl + this._publicPrefixUrl + "update_check?" + queryStringify(updateRequest);

        this._httpRequester.request(Http.Verb.GET, requestUrl, (error: Error, response: Http.Response) => {
            if (error) {
                callback(error, /*remotePackage=*/ null);
                return;
            }

            if (response.statusCode < 200 || response.statusCode >= 300) {
                let errorMessage: any;
                this._statusCode = response.statusCode;
                this.handleRequestFailure();
                if (response.statusCode === 0) {
                    errorMessage = `Couldn't send request to ${requestUrl}, xhr.statusCode = 0 was returned. One of the possible reasons for that might be connection problems. Please, check your internet connection.`;
                } else {
                    errorMessage = `${response.statusCode}: ${response.body}`;
                }
                callback(new CodePushHttpError(errorMessage), /*remotePackage=*/ null);
                return;
            }
            try {
                var responseObject = JSON.parse(response.body);
                var updateInfo: UpdateCheckResponse = responseObject.update_info;
            } catch (error) {
                callback(error, /*remotePackage=*/ null);
                return;
            }

            if (!updateInfo) {
                callback(error, /*remotePackage=*/ null);
                return;
            } else if (updateInfo.update_app_version) {
                callback(/*error=*/ null, { updateAppVersion: true, appVersion: updateInfo.target_binary_range });
                return;
            } else if (!updateInfo.is_available) {
                callback(/*error=*/ null, /*remotePackage=*/ null);
                return;
            }

            var remotePackage: RemotePackage = {
                deploymentKey: this._deploymentKey,
                description: updateInfo.description,
                label: updateInfo.label,
                appVersion: updateInfo.target_binary_range,
                isMandatory: updateInfo.is_mandatory,
                packageHash: updateInfo.package_hash,
                packageSize: updateInfo.package_size,
                downloadUrl: updateInfo.download_url
            };

            callback(/*error=*/ null, remotePackage);
        });
    }

    public reportStatusDeploy(deployedPackage?: Package, status?: string, previousLabelOrAppVersion?: string, previousDeploymentKey?: string, callback?: Callback<void>): void {
        if (AcquisitionManager._apiCallsDisabled) {
            console.log(`[CodePush] Api calls are disabled, skipping API call`);
            callback(/*error*/ null, /*not used*/ null);
            return;
        }

        var url: string = this._serverUrl + this._publicPrefixUrl + "report_status/deploy";
        var body: DeploymentStatusReport = {
            app_version: this._appVersion,
            deployment_key: this._deploymentKey
        };

        if (this._clientUniqueId) {
            body.client_unique_id = this._clientUniqueId;
        }

        if (deployedPackage) {
            body.label = deployedPackage.label;
            body.app_version = deployedPackage.appVersion;

            switch (status) {
                case AcquisitionStatus.DeploymentSucceeded:
                case AcquisitionStatus.DeploymentFailed:
                    body.status = status;
                    break;

                default:
                    if (callback) {
                        if (!status) {
                            callback(new CodePushDeployStatusError("Missing status argument."), /*not used*/ null);
                        } else {
                            callback(new CodePushDeployStatusError("Unrecognized status \"" + status + "\"."), /*not used*/ null);
                        }
                    }
                    return;
            }
        }

        if (previousLabelOrAppVersion) {
            body.previous_label_or_app_version = previousLabelOrAppVersion;
        }

        if (previousDeploymentKey) {
            body.previous_deployment_key = previousDeploymentKey;
        }

        callback = typeof arguments[arguments.length - 1] === "function" && arguments[arguments.length - 1];

        this._httpRequester.request(Http.Verb.POST, url, JSON.stringify(body), (error: Error, response: Http.Response): void => {
            if (callback) {
                if (error) {
                    callback(error, /*not used*/ null);
                    return;
                }

                if (response.statusCode < 200 || response.statusCode >= 300) {
                    this._statusCode = response.statusCode;
                    this.handleRequestFailure();
                    callback(new CodePushHttpError(response.statusCode + ": " + response.body), /*not used*/ null);
                    return;
                }

                callback(/*error*/ null, /*not used*/ null);
            }
        });
    }

    public reportStatusDownload(downloadedPackage: Package, callback?: Callback<void>): void {
        if (AcquisitionManager._apiCallsDisabled) {
            console.log(`[CodePush] Api calls are disabled, skipping API call`);
            callback(/*error*/ null, /*not used*/ null);
            return;
        }

        var url: string = this._serverUrl + this._publicPrefixUrl + "report_status/download";
        var body: DownloadReport = {
            client_unique_id: this._clientUniqueId,
            deployment_key: this._deploymentKey,
            label: downloadedPackage.label
        };

        this._httpRequester.request(Http.Verb.POST, url, JSON.stringify(body), (error: Error, response: Http.Response): void => {
            if (callback) {
                if (error) {
                    callback(error, /*not used*/ null);
                    return;
                }

                if (response.statusCode < 200 || response.statusCode >= 300) {
                    this._statusCode = response.statusCode;
                    this.handleRequestFailure();
                    callback(new CodePushHttpError(response.statusCode + ": " + response.body), /*not used*/ null);
                    return;
                }

                callback(/*error*/ null, /*not used*/ null);
            }
        });
    }
}

function queryStringify(object: Object): string {
    var queryString = "";
    var isFirst: boolean = true;

    for (var property in object) {
        if (object.hasOwnProperty(property)) {
            var value: string = (<any>object)[property];
            if (value !== null && typeof value !== "undefined") {
                if (!isFirst) {
                    queryString += "&";
                }

                queryString += encodeURIComponent(property) + "=";
                queryString += encodeURIComponent(value);
            }

            isFirst = false;
        }
    }

    return queryString;
}