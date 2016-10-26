export { AccessKeyRequest, Account, App, CollaboratorMap, CollaboratorProperties, Deployment, DeploymentMetrics, Package, PackageInfo, AccessKey as ServerAccessKey, UpdateMetrics } from "rest-definitions";

export interface CodePushError {
    message: string;
    statusCode: number;
}

export interface AccessKey {
    createdTime: number;
    expires: number;
    name: string;
    key?: string;
}

export interface Session {
    loggedInTime: number;
    machineName: string;
}

export type Headers = { [headerName: string]: string };
