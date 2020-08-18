# Migration notice

## CodePush SDK

CodePush SDK migrated to a new service. We recommend updating CodePush SDK to the latest version. Versions are lower than **[4.0.0](https://github.com/microsoft/code-push/releases/tag/v4.0.0)** will not work in the near future.

### Deprecated methods

* getSessions
* patchAccessKey
* removeSession
* getAccessKey

These methods are not supported in the release's version **[4.0.0](https://github.com/microsoft/code-push/releases/tag/v4.0.0)** and above.

### Comparison

* Server URL

  * versions **[4.0.0](https://github.com/microsoft/code-push/releases/tag/v4.0.0)** and above

    `https://api.appcenter.ms/v0.1`

  * versions are lower than **[4.0.0](https://github.com/microsoft/code-push/releases/tag/v4.0.0)**

    `https://codepush-management.azurewebsites.net`

    `https://codepush.appcenter.ms/v0.1/legacy`

* Request's path

    For example the path of `getDeployments` method:

  * versions **[4.0.0](https://github.com/microsoft/code-push/releases/tag/v4.0.0)** and above

    `https://api.appcenter.ms/v0.1/apps/{owner_name}/{app_name}/deployments/`

  * versions are lower than **[4.0.0](https://github.com/microsoft/code-push/releases/tag/v4.0.0)**

    `https://codepush-management.azurewebsites.net/apps/{app_name}/deployments/`

* Error message

  We change some messages for error handling. For example the output of `getDeployments` method:

  * versions **[4.0.0](https://github.com/microsoft/code-push/releases/tag/v4.0.0)** and above

    ```javascript
    {
        message: 'Not found. Correlation ID: *****',
        statusCode: 404
    }
    ```

  * versions are lower than **[4.0.0](https://github.com/microsoft/code-push/releases/tag/v4.0.0)**

    ```javascript
    {
        message: 'Internal Server Error',
        statusCode: 500
    }
    ```

* Method signature

    Methods signature was not changed. All methods work the same as in previous versions.

## CodePush CLI

We released a new version of CodePush CLI. The latest version of CodePush CLI (**[3.0.0](https://www.npmjs.com/package/code-push-cli/v/3.0.0)**) now is available. This is the last release of CodePush CLI. We no longer update CLI and recommend migrating to App Center CLI (<https://github.com/microsoft/appcenter-cli>).

## Cordova-plugin-code-push

Cordova-plugin-code-push versions are lower than to **[1.12.0](https://github.com/microsoft/cordova-plugin-code-push/releases/tag/v1.12.0)** will stop working in the near future.

## React-native-code-push

React-native-code-push versions are lower than to **[5.7.0](https://github.com/microsoft/react-native-code-push/releases/tag/v5.7.0)** will stop working in the near future.
