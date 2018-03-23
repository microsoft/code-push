/// <reference path="../definitions/harness.d.ts" />

import { UpdateCheckResponse, UpdateCheckRequest, DeploymentStatusReport, DownloadReport } from "rest-definitions";

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
    private _appVersion: string;
    private _clientUniqueId: string;
    private _deploymentKey: string;
    private _httpRequester: Http.Requester;
    private _ignoreAppVersion: boolean;
    private _serverUrl: string;

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

    public queryUpdateWithCurrentPackage(currentPackage: Package, callback?: Callback<RemotePackage | NativeUpdateNotification>): void {
        if (!currentPackage || !currentPackage.appVersion) {
            throw new Error("Calling common acquisition SDK with incorrect package");  // Unexpected; indicates error in our implementation
        }

        var updateRequest: UpdateCheckRequest = {
            deploymentKey: this._deploymentKey,
            appVersion: currentPackage.appVersion,
            packageHash: currentPackage.packageHash,
            isCompanion: this._ignoreAppVersion,
            label: currentPackage.label,
            clientUniqueId: this._clientUniqueId
        };

        var requestUrl: string = this._serverUrl + "updateCheck?" + queryStringify(updateRequest);

        this._httpRequester.request(Http.Verb.GET, requestUrl, (error: Error, response: Http.Response) => {
            if (error) {
                callback(error, /*remotePackage=*/ null);
                return;
            }

            if (response.statusCode !== 200) {
                let errorMessage: any;
                if (response.statusCode === 0) {
                    errorMessage = `Couldn't send request to ${requestUrl}, xhr.statusCode = 0 was returned. One of the possible reasons for that might be connection problems. Please, check your internet connection.`;
                } else {
                    errorMessage = `${response.statusCode}: ${response.body}`;
                }
                callback(new Error(errorMessage), /*remotePackage=*/ null);
                return;
            }
            try {
                var responseObject = JSON.parse(response.body);
                var updateInfo: UpdateCheckResponse = responseObject.updateInfo;
            } catch (error) {
                callback(error, /*remotePackage=*/ null);
                return;
            }

            if (!updateInfo) {
                callback(error, /*remotePackage=*/ null);
                return;
            } else if (updateInfo.updateAppVersion) {
                callback(/*error=*/ null, { updateAppVersion: true, appVersion: updateInfo.appVersion });
                return;
            } else if (!updateInfo.isAvailable) {
                callback(/*error=*/ null, /*remotePackage=*/ null);
                return;
            }

            var remotePackage: RemotePackage = {
                deploymentKey: this._deploymentKey,
                description: updateInfo.description,
                label: updateInfo.label,
                appVersion: updateInfo.appVersion,
                isMandatory: updateInfo.isMandatory,
                packageHash: updateInfo.packageHash,
                packageSize: updateInfo.packageSize,
                downloadUrl: updateInfo.downloadURL
            };

            callback(/*error=*/ null, remotePackage);
        });
    }

    public reportStatusDeploy(deployedPackage?: Package, status?: string, previousLabelOrAppVersion?: string, previousDeploymentKey?: string, callback?: Callback<void>): void {
        var url: string = this._serverUrl + "reportStatus/deploy";
        var body: DeploymentStatusReport = {
            appVersion: this._appVersion,
            deploymentKey: this._deploymentKey
        };

        if (this._clientUniqueId) {
            body.clientUniqueId = this._clientUniqueId;
        }

        if (deployedPackage) {
            body.label = deployedPackage.label;
            body.appVersion = deployedPackage.appVersion;

            switch (status) {
                case AcquisitionStatus.DeploymentSucceeded:
                case AcquisitionStatus.DeploymentFailed:
                    body.status = status;
                    break;

                default:
                    if (callback) {
                        if (!status) {
                            callback(new Error("Missing status argument."), /*not used*/ null);
                        } else {
                            callback(new Error("Unrecognized status \"" + status + "\"."), /*not used*/ null);
                        }
                    }
                    return;
            }
        }

        if (previousLabelOrAppVersion) {
            body.previousLabelOrAppVersion = previousLabelOrAppVersion;
        }

        if (previousDeploymentKey) {
            body.previousDeploymentKey = previousDeploymentKey;
        }

        callback = typeof arguments[arguments.length - 1] === "function" && arguments[arguments.length - 1];

        this._httpRequester.request(Http.Verb.POST, url, JSON.stringify(body), (error: Error, response: Http.Response): void => {
            if (callback) {
                if (error) {
                    callback(error, /*not used*/ null);
                    return;
                }

                if (response.statusCode !== 200) {
                    callback(new Error(response.statusCode + ": " + response.body), /*not used*/ null);
                    return;
                }

                callback(/*error*/ null, /*not used*/ null);
            }
        });
    }

    public reportStatusDownload(downloadedPackage: Package, callback?: Callback<void>): void {
        var url: string = this._serverUrl + "reportStatus/download";
        var body: DownloadReport = {
            clientUniqueId: this._clientUniqueId,
            deploymentKey: this._deploymentKey,
            label: downloadedPackage.label
        };

        this._httpRequester.request(Http.Verb.POST, url, JSON.stringify(body), (error: Error, response: Http.Response): void => {
            if (callback) {
                if (error) {
                    callback(error, /*not used*/ null);
                    return;
                }

                if (response.statusCode !== 200) {
                    callback(new Error(response.statusCode + ": " + response.body), /*not used*/ null);
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
            if (!isFirst) {
                queryString += "&";
            }

            queryString += encodeURIComponent(property) + "=";
            if (value !== null && typeof value !== "undefined") {
                queryString += encodeURIComponent(value);
            }

            isFirst = false;
        }
    }

    return queryString;
}