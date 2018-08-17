# CodePush Management SDK (Node.js)

A JavaScript library for programmatically managing your CodePush account (e.g. creating apps, promoting releases), which allows authoring Node.js-based build and/or deployment scripts, without needing to shell out to the [CLI](https://github.com/Microsoft/code-push/blob/master/cli/README.md).


## Getting Started

1. Create an access key to authenticate with the CodePush server using the following CodePush CLI command:

    ```shell
    code-push access-key add "DESCRIPTION_OF_THE_KEY"
    ```
    
    If you already created a key that you want to use here, then you can retrieve it by running `code-push access-key ls` and using the value of the `Key` column for the key you wish to use.
    
2. Install the management SDK by running `npm install code-push --save`

3. Import it using the following statement (using ES6 syntax as applicable):

    ```javascript
    var CodePush = require("code-push");    
    ```
    
4. Create an instance of the `CodePush` class, passing it the access key you created or retrieved in step #1:

    ```javascript
    var codePush = new CodePush("YOUR_ACCESS_KEY");
    ```

5. Begin automating the management of your account! For more details on what you can do with this `codePush` object, refer to the API reference section below.

## API Reference

The `code-push` module exports a single class (typically referred to as `CodePush`), which represents a proxy to the CodePush account management REST API. This class has a single constructor for authenticating with the CodePush service, and a collection of instance methods that correspond to the commands in the management [CLI](https://github.com/Microsoft/code-push/blob/master/cli/README.md), which allow you to programmatically control every aspect of your CodePush account.

### Constructors

- __CodePush(accessKey: string)__ - Creates a new instance of the CodePush management SDK, using the specified access key to authenticated with the server.

### Methods

- __addAccessKey(description: string): Promise&lt;AccessKey&gt;__ - Creates a new access key with the specified description (e.g. "VSTS CI").

- __addApp(name: string, os: string, platform: string, manuallyProvisionDeployments: boolean = false): Promise&lt;App&gt;__ - Creates a new CodePush app with the specified name, os, and platform. If the default deployments of "Staging" and "Production" are not desired, pass a value of true for the manuallyProvisionDesployments parameter.

- __addCollaborator(appName: string, email: string): Promise&lt;void&gt;__ - Adds the specified CodePush user as a collaborator to the specified CodePush app.

- __addDeployment(appName: string, deploymentName: string): Promise&lt;Deployment&gt;__ - Creates a new deployment with the specified name, and associated with the specified app.

- __clearDeploymentHistory(appName: string, deploymentName: string): Promise&lt;void&gt;__ - Clears the release history associated with the specified app deployment.

- __getAccessKey(accessKey: string): Promise&lt;AccessKey&gt;__ - Retrieves the metadata about the specific access key.

- __getAccessKeys(): Promise&lt;AccessKey[]&gt;__ - Retrieves the list of access keys associated with your CodePush account.

- __getApp(appName: string): Promise&lt;App&gt;__ - Retrieves the metadata about the specified app.

- __getApps(): Promise&lt;App[]&gt;__ - Retrieves the list of apps associated with your CodePush account.

- __getCollaborators(appName: string): Promise&lt;CollaboratorMap&gt;__ - Retrieves the list of collaborators associated with the specified app.

- __getDeployment(appName: string, deploymentName: string): Promise&lt;Deployment&gt;__ - Retrieves the metadata for the specified app deployment.

- __getDeploymentHistory(appName: string, deploymentName: string): Promise&lt;Package[]&gt;__ - Retrieves the list of releases that have been made to the specified app deployment.

- __getDeploymentMetrics(appName: string, deploymentName: string): Promise&lt;DeploymentMetrics&gt;__ - Retrieves the installation metrics for the specified app deployment.

- __getDeployments(appName: string): Promose&lt;Deployment[]&gt;__ - Retrieves the list of deployments associated with the specified app.

- __patchRelease(appName: string, deploymentName: string, label: string, updateMetadata: PackageInfo): Promise&lt;void&gt;__ - Updates the specified release's metadata with the given information.

- __promote(appName: string, sourceDeploymentName: string, destinationDeploymentName: string, updateMetadata: PackageInfo): Promise&lt;Package&gt;__ - Promotes the latest release from one deployment to another for the specified app and updates the release with the given metadata.

- __release(appName: string, deploymentName: string, updateContentsPath: string, targetBinaryVersion: string, updateMetadata: PackageInfo): Promise&lt;Package&gt;__ - Releases a new update to the specified deployment with the given metadata.

- __removeAccessKey(accessKey: string): Promise&lt;void&gt;__ - Removes the specified access key from your CodePush account.

- __removeApp(appName: string): Promise&lt;void&gt;__ - Deletes the specified CodePush app from your account.

- __removeCollaborator(appName: string, email: string): Promise&lt;void&gt;__ - Removes the specified account as a collaborator from the specified app.

- __removeDeployment(appName: string, deploymentName: string): Promise&lt;void&gt;__ - Removes the specified deployment from the specified app.

- __renameApp(oldAppName: string, newAppName: string): Promise&lt;void&gt;__ - Renames an existing app.

- __renameDeployment(appName: string, oldDeploymentName: string, newDeploymentName: string): Promise&lt;void&gt;__ - Renames an existing deployment within the specified app.

- __rollback(appName: string, deploymentName: string, targetRelease?: string): Promise&lt;void&gt;__ - Rolls back the latest release within the specified deployment. Optionally allows you to target a specific release in the deployment's history, as opposed to rolling to the previous release.

- __transferApp(appName: string, email: string): Promise&lt;void&gt;__ - Transfers the ownership of the specified app to the specified account.

### Error Handling

When an error occurs in any of the methods, the promise will be rejected with a CodePushError object with the following properties:

- __message__: A user-friendly message that describes the error.
- __statusCode__: An HTTP response code that identifies the category of error:
    - __CodePush.ERROR_GATEWAY_TIMEOUT__: A network error prevented you from connecting to the CodePush server.
    - __CodePush.ERROR_INTERNAL_SERVER__: An error occurred internally on the CodePush server.
    - __CodePush.ERROR_NOT_FOUND__: The resource you are attempting to retrieve does not exist.
    - __CodePush.ERROR_CONFLICT__: The resource you are attempting to create already exists.
    - __CodePush.ERROR_UNAUTHORIZED__: The access key you configured is invalid or expired.
