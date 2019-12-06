declare module "rest-definitions" {
    /**
     * Annotations for properties on 'inout' interfaces:
     * - generated: This property cannot be specified on any input requests (PUT/PATCH/POST).
     *              As a result, generated properties are always marked as optional.
     * - key: This property is the identifier for an object, with certain uniqueness constraints.
     */

    interface AccessKeyBase {
        createdBy?: string;
        /*legacy*/ description?: string;
        /*key*/ friendlyName?: string;
        /*generated key*/ name?: string;
    }

    /*out*/
    export interface AccessKey extends AccessKeyBase {
        /*generated*/ createdTime?: number;
        expires: number;
        /*generated*/ isSession?: boolean;
    }

    /*in*/
    export interface AccessKeyRequest extends AccessKeyBase {
        ttl?: number;
    }

    /*out*/
    export interface DeploymentMetrics {
        [packageLabelOrAppVersion: string]: UpdateMetrics
    }

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
        appVersion?: string;
        description?: string;
        isDisabled?: boolean;
        isMandatory?: boolean;
        /*generated*/ label?: string;
        /*generated*/ packageHash?: string;
        rollout?: number;
    }

    /*out*/
    export interface UpdateCheckResponse {
        download_url?: string;
        description?: string;
        is_available: boolean;
        is_disabled?: boolean;
        target_binary_range: string;
        /*generated*/ label?: string;
        /*generated*/ package_hash?: string;
        package_size?: number;
        should_run_binary_version?: boolean;
        update_app_version?: boolean;
        is_mandatory?: boolean;
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

    /*out*/
    export interface UpdateMetrics {
        active: number;
        downloaded?: number;
        failed?: number;
        installed?: number;
    }

    /*out*/
    export interface Account {
        /*key*/ email: string;
        name: string;
        linkedProviders: string[];
    }

    /*out*/
    export interface CollaboratorProperties {
        isCurrentAccount?: boolean;
        permission: string;
    }

    /*out*/
    export interface CollaboratorMap {
        [email: string]: CollaboratorProperties;
    }

    /*inout*/
    export interface App {
        /*generated*/ collaborators?: CollaboratorMap;
        /*key*/ name: string;
        /* generated */ deployments?: string[];
        os?: string;
        platform?: string;
    }

    /*in*/
    export interface AppCreationRequest extends App {
        manuallyProvisionDeployments?: boolean;
    }

    /*inout*/
    export interface Deployment {
        /*generated key*/ key?: string;
        /*key*/ name: string;
        /*generated*/ package?: Package
    }

    /*out*/
    export interface BlobInfo {
        size: number;
        url: string;
    }

    /*out*/
    export interface PackageHashToBlobInfoMap {
        [packageHash: string]: BlobInfo;
    }

    /*inout*/
    export interface Package extends PackageInfo {
        /*generated*/ blobUrl: string;
        /*generated*/ diffPackageMap?: PackageHashToBlobInfoMap;
        /*generated*/ originalLabel?: string;       // Set on "Promote" and "Rollback"
        /*generated*/ originalDeployment?: string;  // Set on "Promote"
        /*generated*/ releasedBy?: string;          // Set by commitPackage
        /*generated*/ releaseMethod?: string;       // "Upload", "Promote" or "Rollback". Unknown if unspecified
        /*generated*/ size: number;
        /*generated*/ uploadTime: number;
    }
}