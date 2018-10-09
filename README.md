[![appcenterbanner](https://user-images.githubusercontent.com/31293287/32969262-3cc5d48a-cb99-11e7-91bf-fa57c67a371c.png)](http://microsoft.github.io/code-push/)

# CodePush

[CodePush](https://microsoft.github.io/code-push) is a cloud service that enables Cordova and React Native developers to deploy mobile app updates directly to their users' devices. It works by acting as a central repository that developers can publish updates to (JS, HTML, CSS and images), and that apps can query for updates from (using provided client SDKs for [Cordova](https://github.com/Microsoft/cordova-plugin-code-push) and [React Native](https://github.com/Microsoft/react-native-code-push)). This allows you to have a more deterministic and direct engagement model with your userbase, when addressing bugs and/or adding small features that don't require you to re-build a binary and re-distribute it through the respective app stores.

This repo includes the [management CLI](https://github.com/Microsoft/code-push/tree/master/cli) and [Node.js management SDK](https://github.com/Microsoft/code-push/tree/master/sdk), which allows you to manage and automate the needs of your Cordova and React Native apps. To get started using CodePush, refer to our [documentation](https://docs.microsoft.com/en-us/appcenter/distribution/codepush/), otherwise, read the following steps if you'd like to build/contribute to the project from source.

## Dev Setup

* Install [Node.js](https://nodejs.org/)
* Install [Git](http://www.git-scm.com/)
* Install [Gulp](https://gulpjs.com/): `npm install -g gulp`
* Clone the Repository: `git clone https://github.com/Microsoft/code-push.git`

### Building

* Run `npm install` from the root of the repository.
* Run `gulp install` to install the NPM dependencies of each module within the project.
* Run `gulp link` to link CLI and SDK for local development. It is advisable to do this step if you are making changes to the SDK and want the CLI to pick those changes.
* Run `gulp build` to build all of the modules. To build just one of the modules (e.g. cli or sdk), run `gulp build-cli` or `gulp build-sdk`.

### Running Tests

To run all tests, run `gulp test` script from the root of the project.

To test just one of the projects (e.g. cli or sdk), run `gulp test-cli` or `gulp test-sdk`

### Coding Conventions

* Use double quotes for strings
* Use four space tabs
* Use `camelCase` for local variables and imported modules, `PascalCase` for types, and `dash-case` for file names

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/). For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.
