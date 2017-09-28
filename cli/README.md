# CodePush Management CLI

CodePush is a cloud service that enables Cordova and React Native developers to deploy mobile app updates directly to their users' devices. It works by acting as a central repository that developers can publish updates to (JS, HTML, CSS and images), and that apps can query for updates from (using the provided client SDKs for [Cordova](http://github.com/Microsoft/cordova-plugin-code-push) and [React Native](http://github.com/Microsoft/react-native-code-push)). This allows you to have a more deterministic and direct engagement model with your user base, when addressing bugs and/or adding small features that don't require you to re-build a binary and re-distribute it through the respective app stores.

![CodePush CLI](https://cloud.githubusercontent.com/assets/245892/26749409/feb439f6-47d7-11e7-98fd-07d750b856d8.png)

<!-- CLI Catalog -->

* [Installation](#installation)
* [Getting Started](#getting-started)
* [Account Management](#account-management)
    * [Authentication](#authentication)
    * [Access Keys](#access-keys)
    * [Proxy Support](#proxy-support)
* [App Management](#app-management)
   * [App Collaboration](#app-collaboration)
   * [Ownership Transfer](#ownership-transfer)
   * [Deployment Management](#deployment-management)
* [Releasing Updates](#releasing-updates)
    * [Releasing Updates (General)](#releasing-updates-general)
    * [Releasing Updates (React Native)](#releasing-updates-react-native)
    * [Releasing Updates (Cordova)](#releasing-updates-cordova)
* [Debugging CodePush Integration](#debugging-codepush-integration)
* [Patching Update Metadata](#patching-update-metadata)
* [Promoting Updates](#promoting-updates)
* [Rolling Back Updates](#rolling-back-updates)
* [Viewing Release History](#viewing-release-history)
* [Clearing Release History](#clearing-release-history)
* [Code Signing](#code-signing)
[[Chinese version 中文版]](./README-cn.md)

<!-- CLI Catalog -->

## Installation

* Install [Node.js](https://nodejs.org/)
* Install the CodePush CLI: `npm install -g code-push-cli`

## Getting Started

1. Create a [CodePush account](#account-creation) push using the CodePush CLI
2. Register your [app](#app-management) with CodePush, and optionally [share it](#app-collaboration) with other developers on your team
3. CodePush-ify your app and point it at the deployment you wish to use ([Cordova](http://github.com/Microsoft/cordova-plugin-code-push) and [React Native](http://github.com/Microsoft/react-native-code-push))
4. [Release](#releasing-updates) an update for your app
5. Check out the [debug logs](#debugging-codepush-integration) to ensure everything is working as expected
6. Live long and prosper! ([details](https://en.wikipedia.org/wiki/Vulcan_salute))

## Account Management

Before you can begin releasing app updates, you need to create a CodePush account. You can do this by simply running the following command once you've installed the CLI:

```
code-push register
```

This will launch a browser, asking you to authenticate with either your GitHub or Microsoft account. Once authenticated, it will create a CodePush account "linked" to your GitHub/MSA identity, and generate an access key you can copy/paste into the CLI in order to login.

*Note: After registering, you are automatically logged-in with the CLI, so until you explicitly log out, you don't need to login again from the same machine.*

If you have an existing account, you may also link your account to another identity provider (e.g. Microsoft, GitHub) by running:

```
code-push link
```

*Note: In order to link multiple accounts, the email address associated with each provider must match.*

### Authentication

Most commands within the CodePush CLI require authentication, and therefore, before you can begin managing your account, you need to login using the GitHub or Microsoft account you used when registering. You can do this by running the following command:

```shell
code-push login
```

This will launch a browser, asking you to authenticate with either your GitHub or Microsoft account. This will generate an access key that you need to copy/paste into the CLI (it will prompt you for it). You are now successfully authenticated and can safely close your browser window.

If at any time you want to determine if you're already logged in, you can run the following command to display the e-mail address associated with your current authentication session, which identity providers your account is linked to (e.g. GitHub) and any previously set proxy:

```shell
code-push whoami
```

When you login from the CLI, your access key is persisted to disk for the duration of your session so that you don't have to login every time you attempt to access your account. In order to end your session and delete this access key, simply run the following command:

```shell
code-push logout
```

If you forget to logout from a machine you'd prefer not to leave a running session on (e.g. your friend's laptop), you can use the following commands to list and remove any current login sessions.

```shell
code-push session ls
code-push session rm <machineName>
```

### Access Keys

If you need to be able to authenticate against the CodePush service without launching a browser and/or without needing to use your GitHub and/or Microsoft credentials (e.g. in a CI environment), you can run the following command to create an "access key" (along with a name describing what it is for):

```shell
code-push access-key add "VSTS Integration"
```

After creating the new key, you can specify its value using the `--accessKey` flag of the `login` command, which allows you to perform "headless" authentication, as opposed to launching a browser.

```shell
code-push login --accessKey <accessKey>
```

When logging in via this method, the access key will not be automatically invalidated on logout, and can be used in future sessions until it is explicitly removed from the CodePush server or expires. However, it is still recommended that you log out once your session is complete, in order to remove your credentials from disk.

### Proxy Support

By default, the `login` command will automatically look for a system-wide proxy, specified via an `HTTPS_PROXY` or `HTTP_PROXY` environment variable, and use that to connect to the CodePush server. If you'd like to disable this behavior, and have the CLI establish a direct connection to CodePush, simply specify the `--noProxy` parameter when logging in:

```shell
code-push login --noProxy
```

I'd you like to explicitly specify a proxy server that the CodePush CLI should use, without relying on system-wide settings, you can instead pass the `--proxy` parameter when logging in:

```shell
code-push login --proxy https://foo.com:3454
```

Once you've logged in, any inferred and/or specified proxy settings are persisted along with your user session. This allows you to continue using the CodePush CLI without needing to re-authenticate or re-specify your preferred proxy. If at any time you want to start or stop using a proxy, simply logout, and then log back in with the newly desired settings.

Additionally, if at any time you want to see what proxy settings (if any) are being used for your current login setting, simply run the `code-push whoami` command, which will display whether you're using, or explicitly bypassing a proxy.

![ignoredproxy](https://cloud.githubusercontent.com/assets/116461/16537275/5166abf8-3fb3-11e6-930b-fb6a8164c65d.PNG)

## App Management

Before you can deploy any updates, you need to register an app with the CodePush service using the following command:

```
code-push app add <appName> <os> <platform>
```

If your app targets both iOS and Android, please *create separate apps for each platform* with CodePush (see the note below for details). This way, you can manage and release updates to them separately, which in the long run, also tends to make things simpler. The naming convention that most folks use is to suffix the app name with `-iOS` and `-Android`. For example:

```
code-push app add MyApp-Android android cordova
code-push app add MyApp-iOS ios react-native
```

*NOTE: Using the same app for iOS and Android may cause installation exceptions because the CodePush update package produced for iOS will have different content from the update produced for Android.*

All new apps automatically come with two deployments (`Staging` and `Production`) so that you can begin distributing updates to multiple channels without needing to do anything extra (see deployment instructions below). After you create an app, the CLI will output the deployment keys for the `Staging` and `Production` deployments, which you can begin using to configure your mobile clients via their respective SDKs (details for [Cordova](http://github.com/Microsoft/cordova-plugin-code-push) and [React Native](http://github.com/Microsoft/react-native-code-push)).

If you decide that you don't like the name you gave to an app, you can rename it at any time using the following command:

```
code-push app rename <appName> <newAppName>
```

The app's name is only meant to be recognizable from the management side, and therefore, you can feel free to rename it as necessary. It won't actually impact the running app, since update queries are made via deployment keys.

If at some point you no longer need an app, you can remove it from the server using the following command:

```
code-push app rm <appName>
```

Do this with caution since any apps that have been configured to use it will obviously stop receiving updates.

Finally, if you want to list all apps that you've registered with the CodePush server,
you can run the following command:

```
code-push app ls
```

### App Collaboration

If you will be working with other developers on the same CodePush app, you can add them as collaborators using the following command:

```shell
code-push collaborator add <appName> <collaboratorEmail>
```

*NOTE: This expects the developer to have already [registered](#account-creation) with CodePush using the specified e-mail address, so ensure that they have done that before attempting to share the app with them.*

Once added, all collaborators will immediately have the following permissions with regards to the newly shared app:

1. View the app, its collaborators, [deployments](#deployment-management) and [release history](#viewing-release-history)
1. [Release](#releasing-updates) updates to any of the app's deployments
1. [Promote](#promoting-updates) an update between any of the app's deployments
1. [Rollback](#rolling-back-undesired-updates) any of the app's deployments
1. [Patch](#updating-existing-releases) any releases within any of the app's deployments

Inversely, that means that an app collaborator cannot do any of the following:

1. Rename or delete the app
1. Create, rename or delete new deployments within the app
1. Clear a deployment's release history
1. Add or remove collaborators from the app (*)

*NOTE: A developer can remove him/herself as a collaborator from an app that was shared with them.*

Over time, if someone is no longer working on an app with you, you can remove them as a collaborator using the following command:

```shell
code-push collaborator rm <appName> <collaboratorEmail>
```

If at any time you want to list all collaborators that have been added to an app, you can simply run the following command:

```shell
code-push collaborator ls <appName>
```

### Ownership Transfer

The update to version 2.0.0.0 saw the removal of the `app transfer` command. You may still transfer ownership of your applications by managing the transfer through an organization. This requires that you visit [Mobile Center](https://mobile.azure.com) and execute a few steps.

1. Go to to [https://mobile.azure.com](https://mobile.azure.com) and create a new organization.
2. Invite the person you to whom you wish to transfer the app to the organization. Once they have accepted the invitation change their access permissions to "Admin". 
3. Navigate to your app and click on the "Manage App" button (top right when on the "Getting Started" page for the app). Hit the Transfer button there to transfer the app to the org. Note that currently this operation cannot be reversed, although this will change in the future.
4. Once your invitee has accepted, select the organization that you created and remove yourself from it.


### Deployment Management

From the CodePush perspective, an app is simply a named grouping for one or more things called "deployments". While the app represents a conceptual "namespace" or "scope" for a platform-specific version of an app (e.g. the iOS port of Foo app), its deployments represent the actual target for releasing updates (for developers) and synchronizing updates (for end-users). Deployments allow you to have multiple "environments" for each app in-flight at any given time, and help model the reality that apps typically move from a dev's personal environment to a testing/QA/staging environment, before finally making their way into production.

*NOTE: As you'll see below, the `release`, `promote` and `rollback` commands require both an app name and a deployment name in order to work, because it is the combination of the two that uniquely identifies a point of distribution (e.g. I want to release an update of my iOS app to my beta testers).*

Whenever an app is registered using the CLI, the CodePush service includes two deployments by default: `Staging` and `Production`. This allows you to immediately begin releasing updates to an internal environment (Staging), where you can thoroughly test each update before pushing them out to your end-users (Production). This workflow is critical for ensuring your releases are ready for mass-consumption, and is a practice that has been established in the web for a long time.

If having a staging and production version of your app is enough to meet your needs, then you don't need to do anything else. However, if you want an alpha, dev, etc. deployment, you can easily create them using the following command:

```
code-push deployment add <appName> <deploymentName>
```

Just like with apps, you can remove and rename deployments as well, using the following commands respectively:

```
code-push deployment rm <appName> <deploymentName>
code-push deployment rename <appName> <deploymentName> <newDeploymentName>
```

If at any time you'd like to view the list of deployments that a specific app includes, you can simply run the following command:

```
code-push deployment ls <appName> [--displayKeys|-k]
```

This will display not only the list of deployments, but also the update metadata (e.g. mandatory, description) and installation metrics for their latest release:

![Deployment list](https://cloud.githubusercontent.com/assets/116461/12526883/7730991c-c127-11e5-9196-98e9ceec758f.png)

*NOTE: Due to their infrequent use and needed screen real estate, deployment keys aren't displayed by default. If you need to view them, simply make sure to pass the `-k` flag to the `deployment ls` command.*

The install metrics have the following meaning:

* **Active** - The number of successful installs that are currently running this release (i.e. if the user opened your app, they would see/run this version). This number will increase and decrease as end-users upgrade to and away from this release, respectively. This metric shows both the total of active users, as well as what percentage of your overall audience that represents. This makes it easy to determine the distribution of updates that your users are currently running, as well as answer questions such as "How many of my users have received my latest update?".

* **Total** - The total number of successful installations that this update has received overall. This number only ever increases as new users/devices install it, and therefore, this is always a superset of the total active count. An update is considered successful once `notifyApplicationReady` (or `sync`) is called after it was installed. Between the moment that an update is downloaded, and it is marked as being successful, it will be reported as a "pending" update (see below for details).

* **Pending** - The number of times this release has been downloaded, but not yet installed (i.e. the app was restarted to apply the changes). Therefore, this metric increases as updates are downloaded, and decreases as those corresponding downloaded updates are installed. This metric primarily applies to updates that aren't configured to install immediately, and helps provide the broader picture of release adoption for apps that rely on app resume and/or restart to apply an update (e.g. I want to rollback an update and I'm curious if anyone has downloaded it yet). If you've configured updates to install immediately, and are still seeing pending updates being reported, then it's likely that you're not calling `notifyApplicationReady` (or `sync`) on app start, which is the method that initiates sending install reports and marks installed updates as being considered successful.

* **Rollbacks** - The number of times that this release has been automatically rolled back on the client. Ideally this number should be zero, and in that case, this metric isn't even shown. However, if you released an update that includes a crash as part of the installation process, the CodePush plugin will roll the end-user back to the previous release, and report that issue back to the server. This allows your end-users to remain unblocked in the event of broken releases, and by being able to see this telemetry in the CLI, you can identify erroneous releases and respond to them by [rolling it back](#rolling-back-undesired-updates) on the server.

* **Rollout** - Indicates the percentage of users that are eligible to receive this update. This property will only be displayed for releases that represent an "active" rollout, and therefore, have a rollout percentage that is less than 100%. Additionally, since a deployment can only have one active rollout at any given time, this label would only be present on the latest release within a deployment.

* **Disabled** - Indicates whether the release has been marked as disabled or not, and therefore, is downloadable by end users. This property will only be displayed for releases that are actually disabled.

When the metrics cell reports `No installs recorded`, that indicates that the server hasn't seen any activity for this release. This could either be because it precluded the plugin versions that included telemetry support, or no end-users have synchronized with the CodePush server yet. As soon as an install happens, you will begin to see metrics populate in the CLI for the release.

## Releasing Updates

Once your app has been configured to query for updates against the CodePush server, you can begin releasing updates to it. In order to provide both simplicity and flexibility, the CodePush CLI includes three different commands for releasing updates:

1. [General](#releasing-updates-general) - Releases an update to the CodePush server that was generated by an external tool or build script (e.g. a Gulp task, the `react-native bundle` command). This provides the most flexibility in terms of fitting into existing workflows, since it strictly deals with CodePush-specific step, and leaves the app-specific compilation process to you.

2. [React Native](#releasing-updates-react-native) - Performs the same functionality as the general release command, but also handles the task of generating the updated app contents for you (JS bundle and assets), instead of requiring you to run both `react-native bundle` and then `code-push release`.

3. [Cordova](#releasing-updates-cordova) - Performs the same functionality as the general release command, but also handles the task of preparing the app update for you, instead of requiring you to run both `cordova prepare` (or `phonegap prepare`)  and then `code-push release`.

Which of these commands you should use is mostly a matter of requirements and/or preference. However, we generally recommend using the relevant platform-specific command to start (since it greatly simplifies the experience), and then leverage the general-purpose `release` command if/when greater control is needed.

### Releasing Updates (General)

```
code-push release <appName> <updateContents> <targetBinaryVersion>
[--deploymentName <deploymentName>]
[--description <description>]
[--disabled <disabled>]
[--mandatory]
[--noDuplicateReleaseError]
[--rollout <rolloutPercentage>]
[--privateKeyPath <pathToPrivateKey>]
```

#### App name parameter

This specifies the name of the CodePush app that this update is being released for. This value corresponds to the friendly name that you specified when originally calling `code-push app add` (e.g. "MyApp-Android"). If you need to look it up, you can run the `code-push app ls` command to see your list of apps.

#### Update contents parameter

This specifies the location of the updated app code and assets you want to release. You can provide either a single file (e.g. a JS bundle for a React Native app), or a path to a directory (e.g. the `/platforms/ios/www` folder for a Cordova app). Note that you don't need to ZIP up multiple files or directories in order to deploy those changes, since the CLI will automatically ZIP them for you.

It's important that the path you specify refers to the platform-specific, prepared/bundled version of your app. The following table outlines which command you should run before releasing, as well as the location you can subsequently refer to using the `updateContents` parameter:

| Platform                         | Prepare command                                                                                                                                            | Package path (relative to project root)                                                                     |
|----------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------|
| Cordova (Android)                | `cordova prepare android`                                                                                                                                  | `./platforms/android/assets/www` directory 																 |
| Cordova (iOS)                    | `cordova prepare ios`                                                                                                                                      | `./platforms/ios/www ` directory          															|
| React Native wo/assets (Android) | `react-native bundle --platform android --entry-file <entryFile> --bundle-output <bundleOutput> --dev false`                                               | Value of the `--bundle-output` option      																 |
| React Native w/assets (Android)  | `react-native bundle --platform android --entry-file <entryFile> --bundle-output <releaseFolder>/<bundleOutput> --assets-dest <releaseFolder> --dev false` | Value of the `--assets-dest` option, which should represent a newly created directory that includes your assets and JS bundle |
| React Native wo/assets (iOS)     | `react-native bundle --platform ios --entry-file <entryFile> --bundle-output <bundleOutput> --dev false`                                                   | Value of the `--bundle-output` option                                                                 |
| React Native w/assets (iOS)      | `react-native bundle --platform ios --entry-file <entryFile> --bundle-output <releaseFolder>/<bundleOutput> --assets-dest <releaseFolder> --dev false` | Value of the `--assets-dest` option, which should represent a newly created directory that includes your assets and JS bundle |

#### Target binary version parameter

This specifies the store/binary version of the application you are releasing the update for, so that only users running that version will receive the update, while users running an older and/or newer version of the app binary will not. This is useful for the following reasons:

1. If a user is running an older binary version, it's possible that there are breaking changes in the CodePush update that wouldn't be compatible with what they're running.

2. If a user is running a newer binary version, then it's presumed that what they are running is newer (and potentially incompatible) with the CodePush update.

If you ever want an update to target multiple versions of the app store binary, we also allow you to specify the parameter as a [semver range expression](https://github.com/npm/node-semver#advanced-range-syntax). That way, any client device running a version of the binary that satisfies the range expression (i.e. `semver.satisfies(version, range)` returns `true`) will get the update. Examples of valid semver range expressions are as follows:

| Range Expression | Who gets the update                                                                    |
|------------------|----------------------------------------------------------------------------------------|
| `1.2.3`          | Only devices running the specific binary app store version `1.2.3` of your app         |
| `*`              | Any device configured to consume updates from your CodePush app                        |
| `1.2.x`          | Devices running major version 1, minor version 2 and any patch version of your app     |
| `1.2.3 - 1.2.7`  | Devices running any binary version between `1.2.3` (inclusive) and `1.2.7` (inclusive) |
| `>=1.2.3 <1.2.7` | Devices running any binary version between `1.2.3` (inclusive) and `1.2.7` (exclusive) |
| `1.2`            | Equivalent to `>=1.2.0 <1.3.0`                                                         |
| `~1.2.3`         | Equivalent to `>=1.2.3 <1.3.0`                                                         |
| `^1.2.3`         | Equivalent to `>=1.2.3 <2.0.0`                                                         |

*NOTE: If your semver expression starts with a special shell character or operator such as `>`, `^`, or **
*, the command may not execute correctly if you do not wrap the value in quotes as the shell will not supply the right values to our CLI process. Therefore, it is best to wrap your `targetBinaryVersion` parameter in double quotes when calling the `release` command, e.g. `code-push release MyApp-iOS updateContents ">1.2.3"`.*

*NOTE: As defined in the semver spec, ranges only work for non pre-release versions: https://github.com/npm/node-semver#prerelease-tags. If you want to update a version with pre-release tags, then you need to write the exact version you want to update (`1.2.3-beta` for example).*

The following table outlines the version value that CodePush expects your update's semver range to satisfy for each respective app type:

| Platform               | Source of app store version                                                  |
|------------------------|------------------------------------------------------------------------------|
| Cordova                | The `<widget version>` attribute in the `config.xml` file                    |
| React Native (Android) | The `android.defaultConfig.versionName` property in your `build.gradle` file |
| React Native (iOS)     | The `CFBundleShortVersionString` key in the `Info.plist` file                |
| React Native (Windows) | The `<Identity Version>` key in the `Package.appxmanifest` file                                |

*NOTE: If the app store version in the metadata files are missing a patch version, e.g. `2.0`, it will be treated as having a patch version of `0`, i.e. `2.0 -> 2.0.0`. The same is true for app store version equal to plain integer number, `1` will be treated as `1.0.0` in this case.*

#### Deployment name parameter

This specifies which deployment you want to release the update to. This defaults to `Staging`, but when you're ready to deploy to `Production`, or one of your own custom deployments, just explicitly set this argument.

*NOTE: The parameter can be set using either "--deploymentName" or "-d".*

#### Description parameter

This provides an optional "change log" for the deployment. The value is simply round tripped to the client so that when the update is detected, your app can choose to display it to the end-user (e.g. via a "What's new?" dialog). This string accepts control characters such as `\n` and `\t` so that you can include whitespace formatting within your descriptions for improved readability.

*NOTE: This parameter can be set using either "--description" or "-des"*

#### Disabled parameter

This specifies whether an update should be downloadable by end users or not. If left unspecified, the update will not be disabled (i.e. users will download it the moment your app calls `sync`). This parameter can be valuable if you want to release an update that isn't immediately available, until you expicitly [patch it](#patching-releases) when you want end users to be able to download it (e.g. an announcement blog post went live).

*NOTE: This parameter can be set using either "--disabled" or "-x"*

#### Mandatory parameter

This specifies whether the update should be considered mandatory or not (e.g. it includes a critical security fix). This attribute is simply round tripped to the client, who can then decide if and how they would like to enforce it.

*NOTE: This parameter is simply a "flag", and therefore, its absence indicates that the release is optional, and its presence indicates that it's mandatory. You can provide a value to it (e.g. `--mandatory true`), however, simply specifying `--mandatory` is sufficient for marking a release as mandatory.*

The mandatory attribute is unique because the server will dynamically modify it as necessary in order to ensure that the semantics of your releases are maintained for your end-users. For example, imagine that you released the following three updates to your app:

| Release | Mandatory? |
|---------|------------|
| v1      | No         |
| v2      | Yes        |
| v3      | No         |

If an end-user is currently running `v1`, and they query the server for an update, it will respond with `v3` (since that is the latest), but it will dynamically convert the release to mandatory, since a mandatory update was released in between. This behavior is important since the code contained in `v3` is incremental to that included in `v2`, and therefore, whatever made `v2` mandatory, continues to make `v3` mandatory for anyone that didn't already acquire `v2`.

If an end-user is currently running `v2`, and they query the server for an update, it will respond with `v3`, but leave the release as optional. This is because they already received the mandatory update, and therefore, there isn't a need to modify the policy of `v3`. This behavior is why we say that the server will "dynamically convert" the mandatory flag, because as far as the release goes, its mandatory attribute will always be stored using the value you specified when releasing it. It is only changed on-the-fly as necessary when responding to an update check from an end-user.

If you never release an update that is marked as mandatory, then the above behavior doesn't apply to you, since the server will never change an optional release to mandatory unless there were intermingled mandatory updates as illustrated above. Additionally, if a release is marked as mandatory, it will never be converted to optional, since that wouldn't make any sense. The server will only change an optional release to mandatory in order to respect the semantics described above.

*NOTE: This parameter can be set using either `--mandatory` or `-m`*

#### No duplicate release error parameter

This specifies that if the update is identical to the latest release on the deployment, the CLI should generate a warning instead of an error. This is useful for continuous integration scenarios where it is expected that small modifications may trigger releases where no production code has changed.

#### Rollout parameter

**IMPORTANT: In order for this parameter to actually take affect, your end users need to be running version `1.6.0-beta+` (for Cordova) or `1.9.0-beta+` (for React Native) of the CodePush plugin. If you release an update that specifies a rollout property, no end user running an older version of the Cordova or React Native plugins will be eligible for the update. Therefore, until you have adopted the neccessary version of the platform-specific CodePush plugin (as previously mentioned), we would advise not setting a rollout value on your releases, since no one would end up receiving it.**

This specifies the percentage of users (as an integer between `1` and `100`) that should be eligible to receive this update. It can be helpful if you want to "flight" new releases with a portion of your audience (e.g. 25%), and get feedback and/or watch for exceptions/crashes, before making it broadly available for everyone. If this parameter isn't set, it is set to `100%`, and therefore, you only need to set it if you want to actually limit how many users will receive it.

 When leveraging the rollout capability, there are a few additional considerations to keep in mind:

1. You cannot release a new update to a deployment whose latest release is an "active" rollout (i.e. its rollout property is non-null). The rollout needs to be "completed" (i.e. setting the `rollout` property to `100`) before you can release further updates to the deployment.

2. If you rollback a deployment whose latest release is an "active" rollout, the rollout value will be cleared, effectively "deactivating" the rollout behavior

3. Unlike the `mandatory` and `description` fields, when you promote a release from one deployment to another, it will not propagate the `rollout` property, and therefore, if you want the new release (in the target deployment) to have a rollout value, you need to explicitly set it when you call the `promote` command.

*NOTE: This parameter can be set using either `--rollout` or `-r`*

#### Private key path parameter

This parameter specifies a path to the private key file used to generate the signature of the update. If the private key path parameter is omitted, signature verification in the code-push plugin will be ignored.

Please refer to the [Code Signing section](#code-signing) for more details on the Code Signing feature.

* NOTE: This option is supported only for React Native applications on Android and iOS platforms.*

### Releasing Updates (React Native)

```shell
code-push release-react <appName> <platform>
[--bundleName <bundleName>]
[--deploymentName <deploymentName>]
[--description <description>]
[--development <development>]
[--disabled <disabled>]
[--entryFile <entryFile>]
[--gradleFile <gradleFile>]
[--mandatory]
[--noDuplicateReleaseError]
[--outputDir <outputDir>]
[--plistFile <plistFile>]
[--plistFilePrefix <plistFilePrefix>]
[--sourcemapOutput <sourcemapOutput>]
[--targetBinaryVersion <targetBinaryVersion>]
[--rollout <rolloutPercentage>]
[--privateKeyPath <pathToPrivateKey>]
```

The `release-react` command is a React Native-specific version of the "vanilla" [`release`](#releasing-app-updates) command, which supports all of the same parameters (e.g. `--mandatory`, `--description`), yet simplifies the process of releasing updates by performing the following additional behavior:

1. Running the `react-native bundle` command in order to generate the [update contents](#update-contents-parameter) (JS bundle and assets) that will be released to the CodePush server. It uses sensible defaults as much as possible (e.g. creating a non-dev build, assuming an iOS entry file is named `index.ios.js`), but also exposes the relevant `react-native bundle` parameters to enable flexibility (e.g. `--sourcemapOutput`).

2. Inferring the [`targetBinaryVersion`](#target-binary-version-parameter) of this release by using the version name that is specified in your project's `Info.plist` (for iOS) and `build.gradle` (for Android) files.

To illustrate the difference that the `release-react` command can make, the following is an example of how you might generate and release an update for a React Native app using the "vanilla" `release` command:

```shell
mkdir ./CodePush

react-native bundle --platform ios \
--entry-file index.ios.js \
--bundle-output ./CodePush/main.jsbundle \
--assets-dest ./CodePush \
--dev false

code-push release MyApp-iOS ./CodePush 1.0.0
```

Achieving the equivalent behavior with the `release-react` command would simply require the following command, which is generally less error-prone:

```shell
code-push release-react MyApp-iOS ios
```

*NOTE: We believe that the `release-react` command should be valuable for most React Native developers, so if you're finding that it isn't flexible enough or missing a key feature, please don't hesistate to [let us know](mailto:codepushfeed@microsoft.com), so that we can improve it!*

#### App name parameter

This is the same parameter as the one described in the [above section](#app-name-parameter).

#### Platform parameter

This specifies which platform the current update is targeting, and can be either `android`, `ios` or `windows` (case-insensitive). This value is only used to determine how to properly bundle your update contents and isn't actually sent to the server.

#### Deployment name parameter

This is the same parameter as the one described in the [above section](#deployment-name-parameter).

#### Description parameter

This is the same parameter as the one described in the [above section](#description-parameter).

#### Mandatory parameter

This is the same parameter as the one described in the [above section](#mandatory-parameter).

#### No duplicate release error parameter

This is the same parameter as the one described in the [above section](#no-duplicate-release-error-parameter).

#### Rollout parameter

This is the same parameter as the one described in the [above section](#rollout-parameter). If left unspecified, the release will be made available to all users.

#### Target binary version parameter

This is the same parameter as the one described in the [above section](#target-binary-version-parameter). If left unspecified, this defaults to targeting the exact version specified in the app's `Info.plist` (for iOS) and `build.gradle` (for Android) files.

#### Bundle name parameter

This specifies the file name that should be used for the generated JS bundle. If left unspecified, the standard bundle name will be used for the specified platform: `main.jsbundle` (iOS), `index.android.bundle` (Android) and `index.windows.bundle` (Windows).

*NOTE: This parameter can be set using either --bundleName or -b*

#### Development parameter

This specifies whether to generate a unminified, development JS bundle. If left unspecified, this defaults to `false` where warnings are disabled and the bundle is minified.

*NOTE: This parameter can be set using either --development or --dev*

#### Disabled parameter

This is the same parameter as the one described in the [above section](#disabled-parameter).

#### Entry file parameter

This specifies the relative path to the app's root/entry JavaScript file. If left unspecified, this defaults to `index.ios.js` (for iOS),  `index.android.js` (for Android) or `index.windows.bundle` (for Windows) if that file exists, or `index.js` otherwise.

*NOTE: This parameter can be set using either --entryFile or -e*

#### Gradle file parameter (Android only)

This specifies the relative path to the `build.gradle` file that the CLI should use when attempting to auto-detect the target binary version for the release. This parameter is only meant for advanced scenarios, since the CLI will automatically be able to find your `build.grade` file in "standard" React Native projects. However, if your gradle file is located in an arbitrary location, that the CLI can't discover, then using this parameter allows you to continue releasing CodePush updates, without needing to explicitly set the `--targetBinaryVersion` parameter. Since `build.gradle` is a required file name, specifying the path to the containing folder or the full path to the file itself will both achieve the same effect.

```shell
code-push release-react MyApp-Android android -p "./foo/bar/"
code-push release-react MyApp-Android android -p "./foo/bar/build.gradle"
```

#### Plist file parameter (iOS only)

This specifies the relative path to the `Info.plist` file that the CLI should use when attempting to auto-detect the target binary version for the release. This parameter is only meant for advanced scenarios, since the CLI will automatically be able to find your `Info.plist` file in "standard" React Native projects, and you can use the `--plistFilePrefix` parameter in order to support per-environment plist files (e.g. `STAGING-Info.plist`). However, if your plist is located in an arbitrary location, that the CLI can't discover, then using this parameter allows you to continue releasing CodePush updates, without needing to explicitly set the `--targetBinaryVersion` parameter.

```shell
code-push release-react MyApp-iOS ios -p "./foo/bar/MyFile.plist"
```

*NOTE: This parameter can be set using either --plistFile or -p*

#### Private key path parameter

This is the same parameter as the one described in the [above section](#private-key-path-parameter).

#### Plist file prefix parameter (iOS only)

This specifies the file name prefix of the `Info.plist` file that that CLI should use when attempting to auto-detect the target binary version for the release. This can be useful if you've created per-environment plist files (e.g. `DEV-Info.plist`, `STAGING-Info.plist`), and you want to be able to release CodePush updates without needing to explicity set the `--targetBinaryVersion` parameter. By specifying a `--plistFilePrefx`, the CLI will look for a file named `<prefix>-Info.plist`, instead of simply `Info.plist` (which is the default behavior), in the following locations: `./ios` and `./ios/<appName>`. If your plist file isn't located in either of those directories (e.g. your app is a native iOS app with embedded RN views), or uses an entirely different file naming convention, then consider using the `--plistFile` parameter.

```shell
# Auto-detect the target binary version of this release by looking up the
# app version within the STAGING-Info.plist file in either the ./ios or ./ios/<APP> directories.
code-push release-react MyApp-iOS ios --pre "STAGING"

# Tell the CLI to use your dev plist (`DEV-Info.plist`).
# Note that the hyphen separator can be explicitly stated.
code-push release-react MyApp-iOS ios --pre "DEV-"
```

*NOTE: This parameter can be set using either --plistFilePrefix or --pre*

#### Sourcemap output parameter

This specifies the relative path to where the generated JS bundle's sourcemap file should be written. If left unspecified, sourcemaps will not be generated.

*NOTE: This parameter can be set using either --sourcemapOutput or -s*

#### Output directory parameter

This specifies the relative path to where the assets, JS bundle and sourcemap files should be written. If left unspecified, the assets, JS bundle and sourcemap will be copied to the `/tmp/CodePush` folder.

*NOTE: All contents within specified folder will be deleted before copying*

*NOTE: This parameter can be set using either --outputDir or -o*

### Releasing Updates (Cordova)

```shell
code-push release-cordova <appName> <platform>
[--build]
[--deploymentName <deploymentName>]
[--description <description>]
[--isReleaseBuildType]
[--mandatory]
[--noDuplicateReleaseError]
[--rollout <rolloutPercentage>]
[--targetBinaryVersion <targetBinaryVersion>]
```

The `release-cordova` command is a Cordova-specific version of the "vanilla" [`release`](#releasing-app-updates) command, which supports all of the same parameters (e.g. `--mandatory`, `--description`), yet simplifies the process of releasing updates by performing the following additional behavior:

1. Running the `cordova prepare` (or `phonegap prepare`) command in order to generate the [update contents](#update-contents-parameter) (`www` folder) that will be released to the CodePush server.

2. Inferring the [`targetBinaryVersion`](#target-binary-version-parameter) of this release by using the version name that is specified in your project's `config.xml` file.

To illustrate the difference that the `release-cordova` command can make, the following is an example of how you might generate and release an update for a Cordova app using the "vanilla" `release` command:

```shell
cordova prepare ios
code-push release MyApp-iOS ./platforms/ios/www 1.0.0
```

Achieving the equivalent behavior with the `release-cordova` command would simply require the following command, which is generally less error-prone:

```shell
code-push release-cordova MyApp-iOS ios
```

*NOTE: We believe that the `release-cordova` command should be valuable for most Cordova developers, so if you're finding that it isn't flexible enough or missing a key feature, please don't hesistate to [let us know](mailto:codepushfeed@microsoft.com), so that we can improve it.*

#### App name parameter

This is the same parameter as the one described in the [above section](#app-name-parameter).

#### Platform parameter

This specifies which platform the current update is targeting, and can be either `ios` or `android` (case-insensitive).

#### Build parameter

Specifies whether you want to run `cordova build` instead of `cordova prepare` (which is the default behavior), when generating your updated web assets. This is valuable if your project includes before and/or after build hooks (e.g. to transpile TypeScript), and therefore, having CodePush simply run `cordova prepare` isn't sufficient to create and release an update. If left unspecified, this defaults to `false`.

*NOTE: This parameter can be set using either --build or -b*

#### Deployment name parameter

This is the same parameter as the one described in the [above section](#deployment-name-parameter).

#### Description parameter

This is the same parameter as the one described in the [above section](#description-parameter).

#### Disabled parameter

This is the same parameter as the one described in the [above section](#disabled-parameter).

#### IsReleaseBuildType parameter

If `build` option is true specifies whether perform a release build. If left unspecified, this defaults to `debug`.

#### Mandatory parameter

This is the same parameter as the one described in the [above section](#mandatory-parameter).

#### No duplicate release error parameter

This is the same parameter as the one described in the [above section](#no-duplicate-release-error-parameter).

#### Rollout parameter

This is the same parameter as the one described in the [above section](#rollout-parameter). If left unspecified, the release will be made available to all users.

#### Target binary version parameter

This is the same parameter as the one described in the [above section](#target-binary-version-parameter). If left unspecified, the command defaults to targeting only the specified version in the project's metadata (`Info.plist` if this update is for iOS clients, and `build.gradle` for Android clients).

## Debugging CodePush Integration

Once you've released an update, and the Cordova or React Native plugin has been integrated into your app, it can be helpful to diagnose how the plugin is behaving, especially if you run into an issue and want to understand why. In order to debug the CodePush update discovery experience, you can run the following command in order to easily view the diagnostic logs produced by the CodePush plugin within your app:

```shell
code-push debug <platform>

# View all CodePush logs from a running
# instace of the iOS simulator.
code-push debug ios

# View all CodePush logs from a running
# Android emulator or attached device.
code-push debug android
```

<img width="500" src="https://cloud.githubusercontent.com/assets/116461/16246597/bd49a9ac-37ba-11e6-9aa4-a2d3b2821a90.png" />

Under the covers, this command simply automates the usage of the iOS system logs and ADB logcat, but provides a platform-agnostic, filtered view of all logs coming from the CodePush plugin, for both Cordova or React Native. This way, you don't need to learn and/or use another tool simply to be able to answer basic questions about how CodePush is behaving.

*NOTE: The debug command supports both emulators and devices for Android, but currently only supports listening to logs from the iOS simulator. We hope to add device support soon.*

## Patching Update Metadata

After releasing an update, there may be scenarios where you need to modify one or more of the metadata attributes associated with it (e.g. you forgot to mark a critical bug fix as mandatory, you want to increase the rollout percentage of an update). You can easily do this by running the following command:

```shell
code-push patch <appName> <deploymentName>
[--label <releaseLabel>]
[--mandatory <isMandatory>]
[--description <description>]
[--rollout <rolloutPercentage>]
[--disabled <isDisabled>]
[--targetBinaryVersion <targetBinaryVersion>]
```

*NOTE: This command doesn't allow modifying the actual update contents of a release (e.g. `www` folder of a Cordova app). If you need to respond to a release that has been identified as being broken, you should use the [rollback](#rolling-back-updates) command to immediately roll it back, and then if necessary, release a new update with the approrpriate fix when it is available.*

Aside from the `appName` and `deploymentName`, all parameters are optional, and therefore, you can use this command to update just a single attribute or all of them at once. Calling the `patch` command without specifying any attribute flag will result in a no-op.

```shell
# Mark the latest production release as mandatory
code-push patch MyApp-iOS Production -m

# Increase the rollout for v23 to 50%
code-push patch MyApp-iOS Production -l v23 -rollout 50%
```

### Label parameter

Indicates which release (e.g. `v23`) you want to update within the specified deployment. If ommitted, the requested changes will be applied to the latest release in the specified deployment. In order to look up the label for the release you want to update, you can run the `code-push deployment history` command and refer to the `Label` column.

*NOTE: This parameter can be set using either `--label` or `-l`*

### Mandatory parameter

This is the same parameter as the one described in the [above section](#mandatory-parameter), and simply allows you to update whether the release should be considered mandatory or not. Note that `--mandatory` and `--mandatory true` are equivalent, but the absence of this flag is not equivalent to `--mandatory false`. Therefore, if the parameter is ommitted, no change will be made to the value of the target release's mandatory property. You need to set this to `--mandatory false` to explicitly make a release optional.

### Description parameter

This is the same parameter as the one described in the [above section](#description-parameter), and simply allows you to update the description associated with the release (e.g. you made a typo when releasing, or you forgot to add a description at all). If this parameter is ommitted, no change will be made to the value of the target release's description property.

### Disabled parameter

This is the same parameter as the one described in the [above section](#disabled-parameter), and simply allows you to update whether the release should be disabled or not. Note that `--disabled` and `--disabled true` are equivalent, but the absence of this flag is not equivalent to `--disabled false`. Therefore, if the paremeter is ommitted, no change will be made to the value of the target release's disabled property. You need to set this to `--disabled false` to explicity make a release acquirable if it was previously disabled.

### Rollout parameter

This is the same parameter as the one described in the [above section](#rollout-parameter), and simply allows you to increase the rollout percentage of the target release. This parameter can only be set to an integer whose value is greater than the current rollout value. Additionally, if you want to "complete" the rollout, and therefore, make the release available to everyone, you can simply set this parameter to `--rollout 100`. If this parameter is ommitted, no change will be made to the value of the target release's rollout parameter.

Additionally, as mentioned above, when you release an update without a rollout value, it is treated equivalently to setting the rollout to `100`. Therefore, if you released an update without a rollout, you cannot change the rollout property of it via the `patch` command since that would be considered lowering the rollout percentage.

### Target binary version parameter

This is the same parameter as the one described in the [above section](#target-binary-version-parameter), and simply allows you to update the semver range that indicates which binary version(s) a release is compatible with. This can be useful if you made a mistake when originally releasing an update (e.g. you specified `1.0.0` but meant `1.1.0`) or you want to increase or decrease the version range that a release supports (e.g. you discovered that a release doesn't work with `1.1.2` after all). If this paremeter is ommitted, no change will be made to the value of the target release's version property.

```shell
# Add a "max binary version" to an existing release
# by scoping its eligibility to users running >= 1.0.5
code-push patch MyApp-iOS Staging -t "1.0.0 - 1.0.5"
```

## Promoting Updates

Once you've tested an update against a specific deployment (e.g. `Staging`), and you want to promote it "downstream" (e.g. dev->staging, staging->production), you can simply use the following command to copy the release from one deployment to another:

```
code-push promote <appName> <sourceDeploymentName> <destDeploymentName>
[--description <description>]
[--label <label>]
[--disabled <disabled>]
[--mandatory]
[--noDuplicateReleaseError]
[--rollout <rolloutPercentage>]
[--targetBinaryVersion <targetBinaryVersion]
```

The `promote` command will create a new release for the destination deployment, which includes the **exact code and metadata** (description, mandatory and target binary version) from the latest release of the source deployment. While you could use the `release` command to "manually" migrate an update from one environment to another, the `promote` command has the following benefits:

1. It's quicker, since you don't need to reassemble the release assets you want to publish or remember the description/app store version that are associated with the source deployment's release.

2. It's less error-prone, since the promote operation ensures that the exact thing that you already tested in the source deployment (e.g. `Staging`) will become active in the destination deployment (e.g. `Production`).

We recommend that all users take advantage of the automatically created `Staging` and `Production` environments, and do all releases directly to `Staging`, and then perform a `promote` from `Staging` to `Production` after performing the appropriate testing.

### Description parameter

This is the same parameter as the one described in the [above section](#description-parameter), and simply allows you to override the description that will be used for the promoted release. If unspecified, the new release will inherit the description from the release being promoted.

### Label parameter

This optional parameter allows you to pick the specified label from the source deployment and promote it to the destination deployment. If unspecified, the latest release on the source deployment will be promoted.

### Disabled parameter

This is the same parameter as the one described in the [above section](#disabled-parameter), and simply allows you to override the value of the disabled flag that will be used for the promoted release. If unspecified, the new release will inherit the disabled property from the release being promoted.

### Mandatory parameter

This is the same parameter as the one described in the [above section](#mandatory-parameter), and simply allows you to override the mandatory flag that will be used for the promoted release. If unspecified, the new release will inherit the mandatory property from the release being promoted.

### No duplicate release error parameter

This is the same parameter as the one described in the [above section](#no-duplicate-release-error-parameter).

### Rollout parameter

This is the same parameter as the one described in the [above section](#rollout-parameter), and allows you to specify whether the newly created release should only be made available to a portion of your users. Unlike the other release metadata parameters (e.g. `description`), the `rollout` of a release is not carried over/inherited as part of a promote, and therefore, you need to explicitly set this if you don't want the newly created release to be available to all of your users.

### Target binary version parameter

This is the same parameter as the one described in the [above section](#target-binary-version-parameter), and simply allows you to override the target binary version that will be used for the promoted release. If unspecified, the new release will inherit the target binary version property from the release being promoted.

```shell
# Promote the release to production and make it
# available to all versions using that deployment
code-push promote MyApp-iOS Staging Production -t "*"
```

## Rolling Back Updates

A deployment's release history is immutable, so you cannot delete or remove an update once it has been released. However, if you release an update that is broken or contains unintended features, it is easy to roll it back using the `rollback` command:

```
code-push rollback <appName> <deploymentName>
code-push rollback MyApp-iOS Production
```

This has the effect of creating a new release for the deployment that includes the **exact same code and metadata** as the version prior to the latest one. For example, imagine that you released the following updates to your app:

| Release | Description       | Mandatory |
|---------|-------------------|-----------|
| v1      | Initial release!  | Yes       |
| v2      | Added new feature | No        |
| v3      | Bug fixes         | Yes       |

If you ran the `rollback` command on that deployment, a new release (`v4`) would be created that included the contents of the `v2` release.

| Release                     | Description       | Mandatory |
|-----------------------------|-------------------|-----------|
| v1                          | Initial release!  | Yes       |
| v2                          | Added new feature | No        |
| v3                          | Bug fixes         | Yes       |
| v4 (Rollback from v3 to v2) | Added new feature | No        |

End-users that had already acquired `v3` would now be "moved back" to `v2` when the app performs an update check. Additionally, any users that were still running `v2`, and therefore, had never acquired `v3`, wouldn't receive an update since they are already running the latest release (this is why our update check uses the package hash in addition to the release label).

If you would like to rollback a deployment to a release other than the previous (e.g. `v3` -> `v2`), you can specify the optional `--targetRelease` parameter:

```
code-push rollback MyApp-iOS Production --targetRelease v34
```

*NOTE: The release produced by a rollback will be annotated in the output of the `deployment history` command to help identify them more easily.*

## Viewing Release History

You can view a history of the 50 most recent releases for a specific app deployment using the following command:

```
code-push deployment history <appName> <deploymentName>
```

The history will display all attributes about each release (e.g. label, mandatory) as well as indicate if any releases were made due to a promotion or a rollback operation.

![Deployment History](https://cloud.githubusercontent.com/assets/696206/11605068/14e440d0-9aab-11e5-8837-69ab09bfb66c.PNG)

Additionally, the history displays the install metrics for each release. You can view the details about how to interpret the metric data in the documentation for the `deployment ls` command above.

By default, the history doesn't display the author of each release, but if you are collaborating on an app with other developers, and want to view who released each update, you can pass the additional `--displayAuthor` (or `-a`) flag to the history command.

*NOTE: The history command can also be run using the "h" alias*

## Clearing Release History

You can clear the release history associated with a deployment using the following command:

```
code-push deployment clear <appName> <deploymentName>
```

After running this command, client devices configured to receive updates using its associated deployment key will no longer receive the updates that have been cleared. This command is irreversible, and therefore should not be used in a production deployment.

## Code Signing

### What is it?

Code signing is a way of creating digital signatures for bundles that can later be validated on the client-side prior to installation.

### Why do we need it?

Developers want to know that the code they ship is the code that they wrote. Code signing is the primary mechanism for providing such assurance and can help mitigate or eliminate a whole class of man-in-the-middle attacks.

### How does it work?

First, the developer generates an asymmetric key pair: the private key will be used for signing bundles; the public key for bundle signature verification. The CodePush cli then uses the private key to sign bundles during `release` and `release-react` commands. The public key is shipped with the mobile application. Control over the generation and management of keys is in the hands of the developer.

At the end of release command, the cli computes the bundle's content hash and places this value into a JWT signed with the private key. When the codepush plugin downloads a bundle to a device, it checks the `.codepushrelease` file containing the JWT and validates the JWT signature using the public key. If validation fails, the update is not installed.

### Requirements for using this feature

If you are planning to use this feature you need to do the following:

1. Produce new binary update including 
   * updated codepush plugin supporting Code Signing
   * configure your code-push sdk to use your public key (please, refer relevent [iOS](https://github.com/Microsoft/react-native-code-push/blob/master/docs/setup-ios.md#code-signing-setup) or [Android](https://github.com/Microsoft/react-native-code-push/blob/master/docs/setup-android.md#code-signing-setup) SDK section for details)
2. Produce a new CodePush update that targets the new binary version and specifies a `--privateKeyPath` (or simply `-k`) parameter value

Please refer to our compatibility tables to identify if code-signing feature is supported within your SDK/CLI:

|CodePush Component|Version from which Code Signing is supporting|Supported Platform|
|----|----|----|
|`code-push` cli|2.1.0||
|`react-native-code-push` plugin|5.1.0|Android, iOS|
|`cordova-plugin-code-push` plugin|**Not supported**|**Not supported**|

### Key generation

Code signing supports PEM encoded RSA keys (non-certificates) for signing. You can generate them via openssl as shown below:

```shell
# generate private RSA key and write it to private.pem file
openssl genrsa -out private.pem

# export public key from private.pem into public.pem
openssl rsa -pubout -in private.pem -out public.pem
```

Generated keys example:

```shell
# public key
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA4moC3GsqF7YISFMQ0fnU
0rUF2xhxNqSGx9/GTxCynsQhR3hceroDXj3rAOTxnNkePB27uZfRDHrH3/LLoj9V
k2ghKRtfjDwXa85uDK8slSQDB9ZlD1TLQEJDZpKr1OTXY9VwbgtFaotSXoFmG3MO
RQeALCbrAgDxQ5Q2kJn6rfBuBoszfUz1qZqrlrY74Axerv1/UtTjL8uyF5r00Bxj
kvTveC2Pm5A3kq6QANktgfKWy9Ugs/4ykZF7fxfH+ukJW+iXwLACrdfzhegg/41H
5w06m30h0jqhIBZ3nbj5MN+qVbANHJMjz+fXqXx1Ovr1DfGtdKOku/BTWDxojCl1
iwIDAQAB
-----END PUBLIC KEY-----

# private key
-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA4moC3GsqF7YISFMQ0fnU0rUF2xhxNqSGx9/GTxCynsQhR3hc
eroDXj3rAOTxnNkePB27uZfRDHrH3/LLoj9Vk2ghKRtfjDwXa85uDK8slSQDB9Zl
D1TLQEJDZpKr1OTXY9VwbgtFaotSXoFmG3MORQeALCbrAgDxQ5Q2kJn6rfBuBosz
fUz1qZqrlrY74Axerv1/UtTjL8uyF5r00BxjkvTveC2Pm5A3kq6QANktgfKWy9Ug
s/4ykZF7fxfH+ukJW+iXwLACrdfzhegg/41H5w06m30h0jqhIBZ3nbj5MN+qVbAN
HJMjz+fXqXx1Ovr1DfGtdKOku/BTWDxojCl1iwIDAQABAoIBAQCdwf/8VS8fFlbv
DfHKXKlNp5RM9Nrtl/XRjro+nQPYXBBUHClT2gg+wiXcmalAAIhwmscSqhWe/G4I
PMRmaHrYGtYALnKE49nt5AgKDoSh5lW2QExqQkrcm08bSVcxH8J0bWPJSVE0y564
+rCKr8BhmLhWC0f0PXPeAoeCeceRKYX2oDgO8A0yZRSQUdRWiXOiQ4mUQ3IPCmBc
gD1JJNZ5kR4O904PZz5pbgyvN2t5BKOgLKq+x+8Pa8Rb21rFZKMHO8W04oKaRiGs
f4xwOBAWDOfzDKJzT5xepcPyycgjxcuvyKB2g8biWnDGGOTxDgqMX+R4XeP1aISC
h9bzfRoBAoGBAPREuPhIXRJOsIgSWAAiC5vhLZ9wWELWG95eibQm2SfpY4F0sPpE
lNQJ4yzC7J4BiApFzs1yxwwRmgpVd+wF9iMb4NSzaiTM7fju/Xv4aGhBqRXEokGF
v3QxIlbAwBqeL0rJAAadjbUTTO/u6sC80LI3bfPrn/z1hupZQGR559gjAoGBAO1J
xQ2ODVS4dSH2P+Ocd9LiUBPGyV97+MFixh6z1c2Fd3bNuiIhCxkrng45Dq0CkX84
nPUvtYxEQZoFvyB7gAm0SVlLHnJwBiq+Mp9g0UXSy6rZbjhiFkQs1W/W+Z2OIDsC
y+uXZT7No/J9VyjdrWzZJaBImO8/E4NONXWn8M95AoGACH97j+e0lTZ3ncRFm3uT
u9CRrcJSz8BzJ8FSORpA48qS06YjohFQvC+734rIgJa9DN5w22Tq19ik60cd7PAo
KACISd4UC0O147ssxmtV9oqSP1ef7XehuYEcGLiL9mEadBeaEKDalToeqxo8wIfR
GuIiySGhZ0ODdhO00coL7tECgYBargddD70udDNnICj4PbJY5928QQpxr/m3RZz6
3LTHDstBnosUQdZw7wc+3jUqjsG1gZgR5wKVMPx09N8+dZPPoZMqSZfAGelxajAE
UkaHTXBBwUfqyilCMnP6gofv2wGcK4xsYvXxEzslDxtA5b5By5Yic7vmKg+17Sxm
4yAW2QKBgDyEUzXq3Rrm7ZT720pPhuQDDSO0eHe1L1MUjTRsJ96GkIl0iqQCVgK8
A/6rFFTEeVf8L6GNMTwdtnDFz/CqIU+K1X4HLXmUY2suffWVxZ4KYqiEszCbyrdO
puayMcrx2unhKQyDYjUvD8GxHyquA+p52KDke2TkKfDxfzv0WOE1
-----END RSA PRIVATE KEY-----
```

### Releasing signed update

To release signed update you should use `--privateKeyPath` (or simply `-k`) option for `release` or `release-react` command.

### FAQ and troubleshooting

Q: I've updated my CodePush CLI to the latest version but don't want to use the code signing feature. Will the new CLI break my existing applications?

A: No, you don't have to use the Code Signing feature at all; you may continue to update your apps as you have in the past.


Q: I've configured public key for my application but forgot to sign the update with my private key during release. What is going to happen?

A: Your update will be rejected. To fix this you should simply release a new update signed with correct private key.


Q: I've forgotten to configure a public key for my application and released signed update. What is going to happen?

A: Signature verification will be skipped and a warning will be written to the application log.


Q: I've released newly signed update, but forgot to release a new binary update with the configured public key and updated SDK. What will happen?

A: An application running a CodePush SDK that doesn't support code signing will reject the update. An application running a CodePush SDK that does support code signing but whose public key is out of date will reject the update. If you sign an update with a private key, make sure that you are releasing only to applications configured with a matching public key.


Q: The Code Push Cordova SDK doesn't support the code signing feature but I can sign an update for my Cordova app using the general `release` command. What is going to happen if I do so?

A: Your Cordova clients will reject the update. **DO NOT** use the --privateKeyPath (or -k) option to release updates for Cordova based applications. If you accidentally do so, simply release a new update without the --privateKeyPath (or -k) parameter.


Q: I've lost my private key, what should I do in this situation?

A: We do not have a copy of your key so you will need to create new private/public key pair, release a new binary update using the new public key, and then release a CodePush update using your new private key.
