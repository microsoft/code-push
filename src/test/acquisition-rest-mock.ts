import * as querystring from "querystring";

import * as acquisitionSdk from "../script/acquisition-sdk";
import * as types from "../script/types";

export var validDeploymentKey = "Valid Deployment Key";
export var latestPackage = <types.UpdateCheckResponse>{
    download_url: "http://www.windowsazure.com/blobs/awperoiuqpweru",
    description: "Angry flappy birds",
    target_binary_range: "1.5.0",
    label: "2.4.0",
    is_mandatory: false,
    is_available: true,
    update_app_version: false,
    package_hash: "hash240",
    package_size: 1024
};

export var serverUrl = "http://myurl.com";
var publicPrefixUrl = "/v0.1/public/codepush";
var reportStatusDeployUrl = serverUrl + publicPrefixUrl + "/report_status/deploy";
var reportStatusDownloadUrl = serverUrl + publicPrefixUrl + "/report_status/download";
var updateCheckUrl = serverUrl + publicPrefixUrl + "/update_check?";

export function updateMockUrl() {
    reportStatusDeployUrl = serverUrl + publicPrefixUrl + "/report_status/deploy";
    reportStatusDownloadUrl = serverUrl + publicPrefixUrl + "/report_status/download";
    updateCheckUrl = serverUrl + publicPrefixUrl + "/update_check?";
}

export class HttpRequester implements acquisitionSdk.Http.Requester {
    private expectedStatusCode: number;

    constructor(expectedStatusCode?: number) {
        this.expectedStatusCode = expectedStatusCode;
    }

    public request(verb: acquisitionSdk.Http.Verb, url: string, requestBodyOrCallback: string | acquisitionSdk.Callback<acquisitionSdk.Http.Response>, callback?: acquisitionSdk.Callback<acquisitionSdk.Http.Response>): void {
        if (!callback && typeof requestBodyOrCallback === "function") {
            callback = <acquisitionSdk.Callback<acquisitionSdk.Http.Response>>requestBodyOrCallback;
        }

        if (verb === acquisitionSdk.Http.Verb.GET && url.indexOf(updateCheckUrl) === 0) {
            var params = querystring.parse(url.substring(updateCheckUrl.length));
            Server.onUpdateCheck(params, callback, this.expectedStatusCode);
        } else if (verb === acquisitionSdk.Http.Verb.POST && url === reportStatusDeployUrl) {
            Server.onReportStatus(callback, this.expectedStatusCode);
        } else if (verb === acquisitionSdk.Http.Verb.POST && url === reportStatusDownloadUrl) {
            Server.onReportStatus(callback, this.expectedStatusCode);
        } else {
            throw new Error("Unexpected call");
        }
    }
}

export class CustomResponseHttpRequester implements acquisitionSdk.Http.Requester {
    response: acquisitionSdk.Http.Response;

    constructor(response: acquisitionSdk.Http.Response) {
        this.response = response;
    }

    public request(verb: acquisitionSdk.Http.Verb, url: string, requestBodyOrCallback: string | acquisitionSdk.Callback<acquisitionSdk.Http.Response>, callback?: acquisitionSdk.Callback<acquisitionSdk.Http.Response>): void {
        if (typeof requestBodyOrCallback !== "function") {
            throw new Error("Unexpected request body");
        }

        callback = <acquisitionSdk.Callback<acquisitionSdk.Http.Response>>requestBodyOrCallback;
        callback(null, this.response);
    }
}

class Server {
    public static onAcquire(params: any, callback: acquisitionSdk.Callback<acquisitionSdk.Http.Response>): void {
        if (params.deploymentKey !== validDeploymentKey) {
            callback(/*error=*/ null, {
                statusCode: 200,
                body: JSON.stringify({ update_info: { isAvailable: false } })
            });
        } else {
            callback(/*error=*/ null, {
                statusCode: 200,
                body: JSON.stringify({ update_info: latestPackage })
            });
        }
    }

    public static onUpdateCheck(params: any, callback: acquisitionSdk.Callback<acquisitionSdk.Http.Response>, expectedStatusCode?: number): void {
        var updateRequest: types.UpdateCheckRequest = {
            deployment_key: params.deployment_key,
            app_version: params.app_version,
            package_hash: params.package_hash,
            is_companion: !!(params.is_companion),
            label: params.label
        };

        if (!updateRequest.deployment_key || !updateRequest.app_version) {
            callback(/*error=*/ null, { statusCode: 400 });
        } else {
            var updateInfo = <types.UpdateCheckResponse>{ is_available: false };
            if (updateRequest.deployment_key === validDeploymentKey) {
                if (updateRequest.is_companion || updateRequest.app_version === latestPackage.target_binary_range) {
                    if (updateRequest.package_hash !== latestPackage.package_hash) {
                        updateInfo = latestPackage;
                    }
                } else if (updateRequest.app_version < latestPackage.target_binary_range) {
                    updateInfo = <types.UpdateCheckResponse><any>{ update_app_version: true, target_binary_range: latestPackage.target_binary_range };
                }
            }

            callback(/*error=*/ null, {
                statusCode: expectedStatusCode ? expectedStatusCode : 200,
                body: JSON.stringify({ update_info: updateInfo })
            });
        }
    }

    public static onReportStatus(callback: acquisitionSdk.Callback<acquisitionSdk.Http.Response>, expectedStatusCode: number): void {
        callback(/*error*/ null, /*response*/ { statusCode: expectedStatusCode ? expectedStatusCode : 200 });
    }
}
