[![appcenterbanner](https://user-images.githubusercontent.com/31293287/32969262-3cc5d48a-cb99-11e7-91bf-fa57c67a371c.png)](http://microsoft.github.io/code-push/)

#### [Sign up With App Center](https://appcenter.ms/signup?utm_source=CodePush&utm_medium=Azure) to use CodePush

# CodePush

[CodePush](https://microsoft.github.io/code-push) is a cloud service that enables Cordova and React Native developers to deploy mobile app updates directly to their users' devices. It works by acting as a central repository that developers can publish updates to (JS, HTML, CSS and images), and that apps can query for updates from (using provided client SDK for [Cordova](https://github.com/Microsoft/cordova-plugin-code-push) and [React Native](https://github.com/Microsoft/react-native-code-push)). This allows you to have a more deterministic and direct engagement model with your userbase, when addressing bugs and/or adding small features that don't require you to re-build a binary and re-distribute it through the respective app stores.

To get started using CodePush, refer to our [documentation](https://docs.microsoft.com/en-us/appcenter/distribution/codepush/), otherwise, read the following steps if you'd like to build/contribute to the project from source.

*NOTE: If you need information about [code-push management CLI](https://github.com/microsoft/code-push/tree/v3.0.1/cli), you can find it in v3.0.1.*

## Dev Setup

* Install [Node.js](https://nodejs.org/)
* Install [Git](http://www.git-scm.com/)
* Clone the Repository: `git clone https://github.com/Microsoft/code-push.git`

### Building

* Run `npm run setup` to install the NPM dependencies of management SDK.
* Run `npm run build` to build the management SDK for testing.
* Run `npm run build:release` to build the release version of management SDK.

### Running Tests

* To run tests, run `npm run test` from the root of the project.
* You can use debug mode for tests with `.vscode/launch.json` file.

### Coding Conventions

* Use double quotes for strings
* Use four space tabs
* Use `camelCase` for local variables and imported modules, `PascalCase` for types, and `dash-case` for file names

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/). For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

# CodePush Management SDK (Node.js)

A JavaScript library for programmatically managing your CodePush account (e.g. creating apps, promoting releases), which allows authoring Node.js-based build and/or deployment scripts, without needing to shell out to the [App Center CLI](https://github.com/microsoft/appcenter-cli).

## Getting Started

1. Create a token to authenticate with the CodePush server using the following [App Center CLI](https://github.com/microsoft/appcenter-cli) command:

    ```shell
    appcenter tokens create -d "DESCRIPTION_OF_THE_TOKEN"
    ```

    Please copy your `API Token` and keep it secret. You won't be able to see it again.

2. Install the management SDK by running `npm install code-push --save`

3. Import it using one of the following statement: (using ES6 syntax as applicable):
   * On commonjs environments:

    ```javascript
    const CodePush = require("code-push");
    ```

    * Using ES6 syntax with tsconfig.json:

    ```javascript
    import CodePush from "code-push";
    ```

4. Create an instance of the `CodePush` class, passing it the `API Token` you created or retrieved in step #1:

    ```javascript
    const codePush = new CodePush("YOUR_API_TOKEN");
    ```

5. Begin automating the management of your account! For more details on what you can do with this `codePush` object, refer to the API reference section below.

## API Reference

The `code-push` module exports a single class (typically referred to as `CodePush`), which represents a proxy to the CodePush account management REST API. This class has a single constructor for authenticating with the CodePush service, and a collection of instance methods that correspond to the commands in the [App Center CLI](https://github.com/microsoft/appcenter-cli), which allow you to programmatically control every aspect of your CodePush account.

### Constructors

* __CodePush(accessKey: string)__ - Creates a new instance of the CodePush management SDK, using the specified access key to authenticated with the server.

### Methods

*Note: `access key` here refers to an AppCenter API Token.*

* __addAccessKey(description: string): Promise&lt;AccessKey&gt;__ - Creates a new access key with the specified description (e.g. "VSTS CI").

* __addApp(name: string, os: string, platform: string, manuallyProvisionDeployments: boolean = false): Promise&lt;App&gt;__ - Creates a new CodePush app with the specified name, os, and platform. If the default deployments of "Staging" and "Production" are not desired, pass a value of true for the manuallyProvisionDeployments parameter.

* __addCollaborator(appName: string, email: string): Promise&lt;void&gt;__ - Adds the specified CodePush user as a collaborator to the specified CodePush app.

* __addDeployment(appName: string, deploymentName: string): Promise&lt;Deployment&gt;__ - Creates a new deployment with the specified name, and associated with the specified app.

* __clearDeploymentHistory(appName: string, deploymentName: string): Promise&lt;void&gt;__ - Clears the release history associated with the specified app deployment.

* __getAccessKey(accessKey: string): Promise&lt;AccessKey&gt;__ - Retrieves the metadata about the specific access key.

* __getAccessKeys(): Promise&lt;AccessKey[]&gt;__ - Retrieves the list of access keys associated with your CodePush account.

* __getApp(appName: string): Promise&lt;App&gt;__ - Retrieves the metadata about the specified app.

* __getApps(): Promise&lt;App[]&gt;__ - Retrieves the list of apps associated with your CodePush account.

* __getCollaborators(appName: string): Promise&lt;CollaboratorMap&gt;__ - Retrieves the list of collaborators associated with the specified app.

* __getDeployment(appName: string, deploymentName: string): Promise&lt;Deployment&gt;__ - Retrieves the metadata for the specified app deployment.

* __getDeploymentHistory(appName: string, deploymentName: string): Promise&lt;Package[]&gt;__ - Retrieves the list of releases that have been made to the specified app deployment.

* __getDeploymentMetrics(appName: string, deploymentName: string): Promise&lt;DeploymentMetrics&gt;__ - Retrieves the installation metrics for the specified app deployment.

* __getDeployments(appName: string): Promise&lt;Deployment[]&gt;__ - Retrieves the list of deployments associated with the specified app.

* __patchRelease(appName: string, deploymentName: string, label: string, updateMetadata: PackageInfo): Promise&lt;void&gt;__ - Updates the specified release's metadata with the given information.

* __promote(appName: string, sourceDeploymentName: string, destinationDeploymentName: string, updateMetadata: PackageInfo): Promise&lt;Package&gt;__ - Promotes the latest release from one deployment to another for the specified app and updates the release with the given metadata.

* __release(appName: string, deploymentName: string, updateContentsPath: string, targetBinaryVersion: string, updateMetadata: PackageInfo): Promise&lt;Package&gt;__ - Releases a new update to the specified deployment with the given metadata.

* __removeAccessKey(accessKey: string): Promise&lt;void&gt;__ - Removes the specified access key from your CodePush account.

* __removeApp(appName: string): Promise&lt;void&gt;__ - Deletes the specified CodePush app from your account.

* __removeCollaborator(appName: string, email: string): Promise&lt;void&gt;__ - Removes the specified account as a collaborator from the specified app.

* __removeDeployment(appName: string, deploymentName: string): Promise&lt;void&gt;__ - Removes the specified deployment from the specified app.

* __renameApp(oldAppName: string, newAppName: string): Promise&lt;void&gt;__ - Renames an existing app.

* __renameDeployment(appName: string, oldDeploymentName: string, newDeploymentName: string): Promise&lt;void&gt;__ - Renames an existing deployment within the specified app.

* __rollback(appName: string, deploymentName: string, targetRelease?: string): Promise&lt;void&gt;__ - Rolls back the latest release within the specified deployment. Optionally allows you to target a specific release in the deployment's history, as opposed to rolling to the previous release.

* __transferApp(appName: string, email: string): Promise&lt;void&gt;__ - Transfers the ownership of the specified app to the specified account.

### Error Handling

When an error occurs in any of the methods, the promise will be rejected with a CodePushError object with the following properties:

* __message__: A user-friendly message that describes the error.
* __statusCode__: An HTTP response code that identifies the category of error:
  * __CodePush.ERROR_GATEWAY_TIMEOUT__: A network error prevented you from connecting to the CodePush server.
  * __CodePush.ERROR_INTERNAL_SERVER__: An error occurred internally on the CodePush server.
  * __CodePush.ERROR_NOT_FOUND__: The resource you are attempting to retrieve does not exist.
  * __CodePush.ERROR_CONFLICT__: The resource you are attempting to create already exists.
  * __CodePush.ERROR_UNAUTHORIZED__: The access key you configured is invalid or expired.
