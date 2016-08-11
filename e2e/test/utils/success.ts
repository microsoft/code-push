export module Success {

    // App

    export function appAdd(appName: string): RegExp {
        return new RegExp("Successfully added the \"" + appName + "\" app, along with the following default deployments:.*");
    }

    export function appRename(oldAppName: string, newAppName: string): RegExp {
        return new RegExp("Successfully renamed the \"" + oldAppName + "\" app to \"" + newAppName + "\"[.]")
    }

    export function appRm(appName: string): RegExp {
        return new RegExp("Successfully removed the \"" + appName + "\" app[.]");
    }

    // Deployment

    export function deploymentAdd(appName: string, deploymentName: string): RegExp {
        return new RegExp("Successfully added the \"" + deploymentName + "\" deployment with key \".*\" to the \"" + appName + "\" app[.]");
    }

    export function deploymentRename(appName: string, oldDeploymentName: string, newDeploymentName: string): RegExp {
        return new RegExp("Successfully renamed the \"" + oldDeploymentName + "\" deployment to \"" + newDeploymentName + "\" for the \"" + appName + "\" app[.]")
    }

    export function deploymentRm(appName: string, deploymentName: string): RegExp {
        return new RegExp("Successfully removed the \"" + deploymentName + "\" deployment from the \"" + appName + "\" app[.]");
    }
    
    // Release
    
    export function releaseFile(fileName: string, appName: string, deploymentName: string): RegExp {
        fileName = fileName.replace(/\\/g, "/");
        return new RegExp("Successfully released an update containing the \"" + fileName + "\" file to the \"" + deploymentName + "\" deployment of the \"" + appName + "\" app.")
    }
    
    export function releaseDirectory(directoryName: string, appName: string, deploymentName: string): RegExp {
        directoryName = directoryName.replace(/\\/g, "/");
        return new RegExp("Successfully released an update containing the \"" + directoryName + "\" directory to the \"" + deploymentName + "\" deployment of the \"" + appName + "\" app.")
    }
    
    // Patch
    
    export function patch(appName: string, deploymentName: string, label?: string): RegExp {
        return new RegExp("Successfully updated the " + (label ? label : "latest") + " release of " + appName + " app's " + deploymentName + " deployment.");
    }
    
    // Promote
    
    export function promote(appName: string, oldDeploymentName: string, newDeploymentName: string): RegExp {
        return new RegExp("Successfully promoted the \"" + oldDeploymentName + "\" deployment of the \"" + appName + "\" app to the \"" + newDeploymentName + "\" deployment.");
    }
    
    // Rollback
    
    export function rollback(appName: string, deploymentName: string): RegExp {
        return new RegExp("Successfully performed a rollback on the \"" + deploymentName + "\" deployment of the \"" + appName + "\" app.");
    }

}