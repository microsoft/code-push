declare module "appcenter-rest-definitions" {

    /*in*/
    export interface DeploymentStatusReport {
        app_version: string;
        client_unique_id?: string;
        deployment_key: string;
        previous_deployment_key?: string;
        previous_label_or_app_version?: string;
        label?: string;
        status?: string;
    }

    /*in*/
    export interface DownloadReport {
        client_unique_id: string;
        deployment_key: string;
        label: string;
    }

    /*inout*/
    export interface PackageInfo {
        target_binary_range?: string;
        description?: string;
        is_disabled?: boolean;
        is_mandatory?: boolean;
        /*generated*/ label?: string;
        /*generated*/ package_hash?: string;
        rollout?: number;
    }

    /*out*/
    export interface UpdateCheckResponse extends PackageInfo {
        download_url?: string;
        is_available: boolean;
        package_size?: number;
        should_run_binary_version?: boolean;
        update_app_version?: boolean;
    }

    /*in*/
    export interface UpdateCheckRequest {
        app_version: string;
        client_unique_id?: string;
        deployment_key: string;
        is_companion?: boolean;
        label?: string;
        package_hash?: string;
    }
}