import * as assert from "assert";
import * as sinon from "sinon";
import Q = require("q");
import * as path from "path";
import Promise = Q.Promise;
import * as codePush from "code-push/script/types";
import * as cli from "../definitions/cli";
import * as cmdexec from "../script/command-executor";
import * as os from "os";

function assertJsonDescribesObject(json: string, object: Object): void {
    // Make sure JSON is indented correctly
    assert.equal(json, JSON.stringify(object, /*replacer=*/ null, /*spacing=*/ 2));
}

function clone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
}

function ensureInTestAppDirectory(): void {
    if (!~__dirname.indexOf("/resources/TestApp")) {
        process.chdir(__dirname + "/resources/TestApp");
    }
}

function isDefined(object: any): boolean {
    return object !== undefined && object !== null;
}

const NOW = 1471460856191;
const DEFAULT_ACCESS_KEY_MAX_AGE = 1000 * 60 * 60 * 24 * 60; // 60 days
const TEST_MACHINE_NAME = "Test machine";

export class SdkStub {
    public getAccountInfo(): Promise<codePush.Account> {
        return Q(<codePush.Account>{
            email: "a@a.com"
        });
    }

    public addAccessKey(name: string, ttl: number): Promise<codePush.AccessKey> {
        return Q(<codePush.AccessKey>{
            key: "key123",
            createdTime: new Date().getTime(),
            name,
            expires: NOW + (isDefined(ttl) ? ttl : DEFAULT_ACCESS_KEY_MAX_AGE)
        });
    }

    public patchAccessKey(oldName: string, newName?: string, newTtl?: number): Promise<codePush.AccessKey> {
        return Q(<codePush.AccessKey>{
            createdTime: new Date().getTime(),
            name: newName,
            expires: NOW + (isDefined(newTtl) ? newTtl : DEFAULT_ACCESS_KEY_MAX_AGE)
        });
    }

    public addApp(name: string): Promise<codePush.App> {
        return Q(<codePush.App>{
            name: name
        });
    }

    public addCollaborator(name: string, email: string): Promise<void> {
        return Q(<void>null);
    }

    public addDeployment(appId: string, name: string): Promise<codePush.Deployment> {
        return Q(<codePush.Deployment>{
            name: name,
            key: "6"
        });
    }

    public clearDeploymentHistory(appId: string, deployment: string): Promise<void> {
        return Q(<void>null);
    }

    public getAccessKeys(): Promise<codePush.AccessKey[]> {
        return Q([<codePush.AccessKey>{
            createdTime: 0,
            name: "Test name",
            expires: NOW + DEFAULT_ACCESS_KEY_MAX_AGE
        }]);
    }

    public getSessions(): Promise<codePush.Session[]> {
        return Q([<codePush.Session>{
            loggedInTime: 0,
            machineName: TEST_MACHINE_NAME
        }]);
    }

    public getApps(): Promise<codePush.App[]> {
        return Q([<codePush.App>{
            name: "a",
            collaborators: { "a@a.com": { permission: "Owner", isCurrentAccount: true } },
            deployments: [ "Production", "Staging" ]
        }, <codePush.App>{
            name: "b",
            collaborators: { "a@a.com": { permission: "Owner", isCurrentAccount: true } },
            deployments: [ "Production", "Staging" ]
        }]);
    }

    public getDeployments(appId: string): Promise<codePush.Deployment[]> {
        return Q([<codePush.Deployment>{
            name: "Production",
            key: "6"
        }, <codePush.Deployment>{
            name: "Staging",
            key: "6",
            package: {
                appVersion: "1.0.0",
                description: "fgh",
                label: "v2",
                packageHash: "jkl",
                isMandatory: true,
                size: 10,
                blobUrl: "http://mno.pqr",
                uploadTime: 1000
            }
        }]);
    }

    public getDeploymentHistory(appId: string, deploymentId: string): Promise<codePush.Package[]> {
        return Q([
            <codePush.Package>{
                description: null,
                appVersion: "1.0.0",
                isMandatory: false,
                packageHash: "463acc7d06adc9c46233481d87d9e8264b3e9ffe60fe98d721e6974209dc71a0",
                blobUrl: "https://fakeblobstorage.net/storagev2/blobid1",
                uploadTime: 1447113596270,
                size: 1,
                label: "v1"
            },
            <codePush.Package>{
                description: "New update - this update does a whole bunch of things, including testing linewrapping",
                appVersion: "1.0.1",
                isMandatory: false,
                packageHash: "463acc7d06adc9c46233481d87d9e8264b3e9ffe60fe98d721e6974209dc71a0",
                blobUrl: "https://fakeblobstorage.net/storagev2/blobid2",
                uploadTime: 1447118476669,
                size: 2,
                label: "v2"
            }
        ]);
    }

    public getDeploymentMetrics(appId: string, deploymentId: string): Promise<any> {
        return Q({
            "1.0.0": {
                active: 123
            },
            "v1": {
                active: 789,
                downloaded: 456,
                failed: 654,
                installed: 987
            },
            "v2": {
                active: 123,
                downloaded: 321,
                failed: 789,
                installed: 456
            }
        });
    }

    public getCollaborators(app: codePush.App): Promise<any> {
        return Q({
            "a@a.com": {
                permission: "Owner",
                isCurrentAccount: true
            },
            "b@b.com": {
                permission: "Collaborator",
                isCurrentAccount: false
            }
        });
    }

    public patchRelease(appName: string, deployment: string, label: string, updateMetaData: codePush.PackageInfo): Promise<void> {
        return Q(<void>null);
    }

    public promote(appName: string, sourceDeployment: string, destinationDeployment: string, updateMetaData: codePush.PackageInfo): Promise<void> {
        return Q(<void>null);
    }

    public release(appId: string, deploymentId: string): Promise<string> {
        return Q("Successfully released");
    }

    public removeAccessKey(accessKeyId: string): Promise<void> {
        return Q(<void>null);
    }

    public removeApp(appId: string): Promise<void> {
        return Q(<void>null);
    }

    public removeCollaborator(name: string, email: string): Promise<void> {
        return Q(<void>null);
    }

    public removeDeployment(appId: string, deployment: string): Promise<void> {
        return Q(<void>null);
    }

    public removeSession(createdBy: string): Promise<void> {
        return Q(<void>null);
    }

    public renameApp(app: codePush.App): Promise<void> {
        return Q(<void>null);
    }

    public rollback(appName: string, deployment: string, targetRelease: string): Promise<void> {
        return Q(<void>null);
    }

    public transferApp(app: codePush.App): Promise<void> {
        return Q(<void>null);
    }

    public renameDeployment(appId: string, deployment: codePush.Deployment): Promise<void> {
        return Q(<void>null);
    }
}

describe("CLI", () => {
    var log: Sinon.SinonStub;
    var sandbox: Sinon.SinonSandbox;
    var spawn: Sinon.SinonStub;
    var wasConfirmed = true;
    const INVALID_RELEASE_FILE_ERROR_MESSAGE: string = "It is unnecessary to package releases in a .zip or binary file. Please specify the direct path to the update content's directory (e.g. /platforms/ios/www) or file (e.g. main.jsbundle).";

    beforeEach((): void => {
        wasConfirmed = true;

        sandbox = sinon.sandbox.create();

        sandbox.stub(cmdexec, "confirm", (): Promise<boolean> => Q(wasConfirmed));
        sandbox.stub(cmdexec, "createEmptyTempReleaseFolder", (): Promise<void> => Q(<void>null));
        log = sandbox.stub(cmdexec, "log", (message: string): void => { });
        spawn = sandbox.stub(cmdexec, "spawn", (command: string, commandArgs: string[]): any => {
            return {
                stdout: { on: () => { } },
                stderr: { on: () => { } },
                on: (event: string, callback: () => void) => {
                    callback();
                }
            };
        });
        cmdexec.sdk = <any>new SdkStub();
    });

    afterEach((): void => {
        sandbox.restore();
    });

    it("accessKeyAdd creates access key with name and default ttl", (done: MochaDone): void => {
        var command: cli.IAccessKeyAddCommand = {
            type: cli.CommandType.accessKeyAdd,
            name: "Test name"
        };

        cmdexec.execute(command)
            .done((): void => {
                sinon.assert.calledTwice(log);
                assert.equal(log.args[0].length, 1);

                var actual: string = log.args[0][0];
                var expected = `Successfully created the "Test name" access key: key123`;
                assert.equal(actual, expected);

                actual = log.args[1][0];
                expected = "Make sure to save this key value somewhere safe, since you won't be able to view it from the CLI again!";
                assert.equal(actual, expected);

                done();
            });
    });

    it("accessKeyAdd creates access key with name and specified ttl", (done: MochaDone): void => {
        var ttl = 10000;
        var command: cli.IAccessKeyAddCommand = {
            type: cli.CommandType.accessKeyAdd,
            name: "Test name",
            ttl
        };

        cmdexec.execute(command)
            .done((): void => {
                sinon.assert.calledTwice(log);
                assert.equal(log.args[0].length, 1);

                var actual: string = log.args[0][0];
                var expected = `Successfully created the "Test name" access key: key123`;
                assert.equal(actual, expected);

                actual = log.args[1][0];
                expected = "Make sure to save this key value somewhere safe, since you won't be able to view it from the CLI again!";
                assert.equal(actual, expected);

                done();
            });
    });

    it("accessKeyPatch updates access key with new name", (done: MochaDone): void => {
        var command: cli.IAccessKeyPatchCommand = {
            type: cli.CommandType.accessKeyPatch,
            oldName: "Test name",
            newName: "Updated name"
        };

        cmdexec.execute(command)
            .done((): void => {
                sinon.assert.calledOnce(log);
                assert.equal(log.args[0].length, 1);

                var actual: string = log.args[0][0];
                var expected = `Successfully renamed the access key "Test name" to "Updated name".`;

                assert.equal(actual, expected);
                done();
            });
    });


    it("accessKeyPatch updates access key with new ttl", (done: MochaDone): void => {
        var ttl = 10000;
        var command: cli.IAccessKeyPatchCommand = {
            type: cli.CommandType.accessKeyPatch,
            oldName: "Test name",
            ttl
        };

        cmdexec.execute(command)
            .done((): void => {
                sinon.assert.calledOnce(log);
                assert.equal(log.args[0].length, 1);

                var actual: string = log.args[0][0];
                var expected = `Successfully changed the expiration date of the "Test name" access key to Wednesday, August 17, 2016 12:07 PM.`;

                assert.equal(actual, expected);
                done();
            });
    });

    it("accessKeyPatch updates access key with new name and ttl", (done: MochaDone): void => {
        var ttl = 10000;
        var command: cli.IAccessKeyPatchCommand = {
            type: cli.CommandType.accessKeyPatch,
            oldName: "Test name",
            newName: "Updated name",
            ttl
        };

        cmdexec.execute(command)
            .done((): void => {
                sinon.assert.calledOnce(log);
                assert.equal(log.args[0].length, 1);

                var actual: string = log.args[0][0];
                var expected = `Successfully renamed the access key "Test name" to "Updated name" and changed its expiration date to Wednesday, August 17, 2016 12:07 PM.`;

                assert.equal(actual, expected);
                done();
            });
    });

    it("accessKeyList lists access key name and expires fields", (done: MochaDone): void => {
        var command: cli.IAccessKeyListCommand = {
            type: cli.CommandType.accessKeyList,
            format: "json"
        };

        cmdexec.execute(command)
            .done((): void => {
                sinon.assert.calledOnce(log);
                assert.equal(log.args[0].length, 1);

                var actual: string = log.args[0][0];
                var expected = [
                    {
                        createdTime: 0,
                        name: "Test name",
                        expires: NOW + DEFAULT_ACCESS_KEY_MAX_AGE
                    }
                ];

                assertJsonDescribesObject(actual, expected);
                done();
            });
    });

    it("accessKeyRemove removes access key", (done: MochaDone): void => {
        var command: cli.IAccessKeyRemoveCommand = {
            type: cli.CommandType.accessKeyRemove,
            accessKey: "8"
        };

        var removeAccessKey: Sinon.SinonSpy = sandbox.spy(cmdexec.sdk, "removeAccessKey");

        cmdexec.execute(command)
            .done((): void => {
                sinon.assert.calledOnce(removeAccessKey);
                sinon.assert.calledWithExactly(removeAccessKey, "8");
                sinon.assert.calledOnce(log);
                sinon.assert.calledWithExactly(log, "Successfully removed the \"8\" access key.");

                done();
            });
    });

    it("accessKeyRemove does not remove access key if cancelled", (done: MochaDone): void => {
        var command: cli.IAccessKeyRemoveCommand = {
            type: cli.CommandType.accessKeyRemove,
            accessKey: "8"
        };

        var removeAccessKey: Sinon.SinonSpy = sandbox.spy(cmdexec.sdk, "removeAccessKey");

        wasConfirmed = false;

        cmdexec.execute(command)
            .done((): void => {
                sinon.assert.notCalled(removeAccessKey);
                sinon.assert.calledOnce(log);
                sinon.assert.calledWithExactly(log, "Access key removal cancelled.");

                done();
            });
    });

    it("appAdd reports new app name and ID", (done: MochaDone): void => {
        var command: cli.IAppAddCommand = {
            type: cli.CommandType.appAdd,
            appName: "a"
        };

        var addApp: Sinon.SinonSpy = sandbox.spy(cmdexec.sdk, "addApp");
        var deploymentList: Sinon.SinonSpy = sandbox.spy(cmdexec, "deploymentList");

        cmdexec.execute(command)
            .done((): void => {
                sinon.assert.calledOnce(addApp);
                sinon.assert.calledTwice(log);
                sinon.assert.calledWithExactly(log, "Successfully added the \"a\" app, along with the following default deployments:");
                sinon.assert.calledOnce(deploymentList);
                done();
            });
    });

    it("appList lists app names and ID's", (done: MochaDone): void => {
        var command: cli.IAppListCommand = {
            type: cli.CommandType.appList,
            format: "json"
        };

        cmdexec.execute(command)
            .done((): void => {
                sinon.assert.calledOnce(log);
                assert.equal(log.args[0].length, 1);

                var actual: string = log.args[0][0];
                var expected = [
                    {
                        name: "a",
                        collaborators: {
                            "a@a.com": {
                                permission: "Owner",
                                isCurrentAccount: true
                            }
                        },
                        deployments: ["Production", "Staging"]
                    },
                    {
                        name: "b",
                        collaborators: {
                            "a@a.com": {
                                permission: "Owner",
                                isCurrentAccount: true
                            }
                        },
                        deployments: ["Production", "Staging"]
                    }
                ];

                assertJsonDescribesObject(actual, expected);
                done();
            });
    });

    it("appRemove removes app", (done: MochaDone): void => {
        var command: cli.IAppRemoveCommand = {
            type: cli.CommandType.appRemove,
            appName: "a"
        };

        var removeApp: Sinon.SinonSpy = sandbox.spy(cmdexec.sdk, "removeApp");

        cmdexec.execute(command)
            .done((): void => {
                sinon.assert.calledOnce(removeApp);
                sinon.assert.calledWithExactly(removeApp, "a");
                sinon.assert.calledOnce(log);
                sinon.assert.calledWithExactly(log, "Successfully removed the \"a\" app.");

                done();
            });
    });

    it("appRemove does not remove app if cancelled", (done: MochaDone): void => {
        var command: cli.IAppRemoveCommand = {
            type: cli.CommandType.appRemove,
            appName: "a"
        };

        var removeApp: Sinon.SinonSpy = sandbox.spy(cmdexec.sdk, "removeApp");

        wasConfirmed = false;

        cmdexec.execute(command)
            .done((): void => {
                sinon.assert.notCalled(removeApp);
                sinon.assert.calledOnce(log);
                sinon.assert.calledWithExactly(log, "App removal cancelled.");

                done();
            });
    });

    it("appRename renames app", (done: MochaDone): void => {
        var command: cli.IAppRenameCommand = {
            type: cli.CommandType.appRename,
            currentAppName: "a",
            newAppName: "c"
        };

        var renameApp: Sinon.SinonSpy = sandbox.spy(cmdexec.sdk, "renameApp");

        cmdexec.execute(command)
            .done((): void => {
                sinon.assert.calledOnce(renameApp);
                sinon.assert.calledOnce(log);
                sinon.assert.calledWithExactly(log, "Successfully renamed the \"a\" app to \"c\".");

                done();
            });
    });

    it("appTransfer transfers app", (done: MochaDone): void => {
        var command: cli.IAppTransferCommand = {
            type: cli.CommandType.appTransfer,
            appName: "a",
            email: "b@b.com"
        };

        var transferApp: Sinon.SinonSpy = sandbox.spy(cmdexec.sdk, "transferApp");

        cmdexec.execute(command)
            .done((): void => {
                sinon.assert.calledOnce(transferApp);
                sinon.assert.calledOnce(log);
                sinon.assert.calledWithExactly(log, "Successfully transferred the ownership of app \"a\" to the account with email \"b@b.com\".");

                done();
            });
    });

    it("collaboratorAdd adds collaborator", (done: MochaDone): void => {
        var command: cli.ICollaboratorAddCommand = {
            type: cli.CommandType.collaboratorAdd,
            appName: "a",
            email: "b@b.com"
        };

        var addCollaborator: Sinon.SinonSpy = sandbox.spy(cmdexec.sdk, "addCollaborator");

        cmdexec.execute(command)
            .done((): void => {
                sinon.assert.calledOnce(addCollaborator);
                sinon.assert.calledOnce(log);
                sinon.assert.calledWithExactly(log, "Successfully added \"b@b.com\" as a collaborator to the app \"a\".");

                done();
            });
    });

    it("collaboratorList lists collaborators email and properties", (done: MochaDone): void => {
        var command: cli.ICollaboratorListCommand = {
            type: cli.CommandType.collaboratorList,
            appName: "a",
            format: "json"
        };

        cmdexec.execute(command)
            .done((): void => {
                sinon.assert.calledOnce(log);
                assert.equal(log.args[0].length, 1);

                var actual: string = log.args[0][0];
                var expected = {
                    "collaborators":
                    {
                        "a@a.com": { permission: "Owner", isCurrentAccount: true },
                        "b@b.com": { permission: "Collaborator", isCurrentAccount: false }
                    }
                };

                assertJsonDescribesObject(actual, expected);
                done();
            });
    });

    it("collaboratorRemove removes collaborator", (done: MochaDone): void => {
        var command: cli.ICollaboratorRemoveCommand = {
            type: cli.CommandType.collaboratorRemove,
            appName: "a",
            email: "b@b.com"
        };

        var removeCollaborator: Sinon.SinonSpy = sandbox.spy(cmdexec.sdk, "removeCollaborator");

        cmdexec.execute(command)
            .done((): void => {
                sinon.assert.calledOnce(removeCollaborator);
                sinon.assert.calledOnce(log);
                sinon.assert.calledWithExactly(log, "Successfully removed \"b@b.com\" as a collaborator from the app \"a\".");

                done();
            });
    });


    it("deploymentAdd reports new app name and ID", (done: MochaDone): void => {
        var command: cli.IDeploymentAddCommand = {
            type: cli.CommandType.deploymentAdd,
            appName: "a",
            deploymentName: "b"
        };

        var addDeployment: Sinon.SinonSpy = sandbox.spy(cmdexec.sdk, "addDeployment");

        cmdexec.execute(command)
            .done((): void => {
                sinon.assert.calledOnce(addDeployment);
                sinon.assert.calledOnce(log);
                sinon.assert.calledWithExactly(log, "Successfully added the \"b\" deployment with key \"6\" to the \"a\" app.");
                done();
            });
    });

    it("deploymentHistoryClear clears deployment", (done: MochaDone): void => {
        var command: cli.IDeploymentHistoryClearCommand = {
            type: cli.CommandType.deploymentHistoryClear,
            appName: "a",
            deploymentName: "Staging"
        };

        var clearDeployment: Sinon.SinonSpy = sandbox.spy(cmdexec.sdk, "clearDeploymentHistory");

        cmdexec.execute(command)
            .done((): void => {
                sinon.assert.calledOnce(clearDeployment);
                sinon.assert.calledWithExactly(clearDeployment, "a", "Staging");
                sinon.assert.calledOnce(log);
                sinon.assert.calledWithExactly(log, "Successfully cleared the release history associated with the \"Staging\" deployment from the \"a\" app.");

                done();
            });
    });

    it("deploymentHistoryClear does not clear deployment if cancelled", (done: MochaDone): void => {
        var command: cli.IDeploymentHistoryClearCommand = {
            type: cli.CommandType.deploymentHistoryClear,
            appName: "a",
            deploymentName: "Staging"
        };

        var clearDeployment: Sinon.SinonSpy = sandbox.spy(cmdexec.sdk, "clearDeploymentHistory");

        wasConfirmed = false;

        cmdexec.execute(command)
            .done((): void => {
                sinon.assert.notCalled(clearDeployment);
                sinon.assert.calledOnce(log);
                sinon.assert.calledWithExactly(log, "Clear deployment cancelled.");

                done();
            });
    });

    it("deploymentList lists deployment names, deployment keys, and package information", (done: MochaDone): void => {
        var command: cli.IDeploymentListCommand = {
            type: cli.CommandType.deploymentList,
            appName: "a",
            format: "json",
            displayKeys: true
        };

        cmdexec.execute(command)
            .done((): void => {
                sinon.assert.calledOnce(log);
                assert.equal(log.args[0].length, 1);

                var actual: string = log.args[0][0];
                var expected = [
                    {
                        name: "Production",
                        key: "6"
                    },
                    {
                        name: "Staging",
                        key: "6",
                        package: {
                            appVersion: "1.0.0",
                            description: "fgh",
                            label: "v2",
                            packageHash: "jkl",
                            isMandatory: true,
                            size: 10,
                            blobUrl: "http://mno.pqr",
                            uploadTime: 1000,
                            metrics: {
                                active: 123,
                                downloaded: 321,
                                failed: 789,
                                installed: 456,
                                totalActive: 1035
                            }
                        }
                    }
                ];

                assertJsonDescribesObject(actual, expected);
                done();
            });
    });

    it("deploymentRemove removes deployment", (done: MochaDone): void => {
        var command: cli.IDeploymentRemoveCommand = {
            type: cli.CommandType.deploymentRemove,
            appName: "a",
            deploymentName: "Staging"
        };

        var removeDeployment: Sinon.SinonSpy = sandbox.spy(cmdexec.sdk, "removeDeployment");

        cmdexec.execute(command)
            .done((): void => {
                sinon.assert.calledOnce(removeDeployment);
                sinon.assert.calledWithExactly(removeDeployment, "a", "Staging");
                sinon.assert.calledOnce(log);
                sinon.assert.calledWithExactly(log, "Successfully removed the \"Staging\" deployment from the \"a\" app.");

                done();
            });
    });

    it("deploymentRemove does not remove deployment if cancelled", (done: MochaDone): void => {
        var command: cli.IDeploymentRemoveCommand = {
            type: cli.CommandType.deploymentRemove,
            appName: "a",
            deploymentName: "Staging"
        };

        var removeDeployment: Sinon.SinonSpy = sandbox.spy(cmdexec.sdk, "removeDeployment");

        wasConfirmed = false;

        cmdexec.execute(command)
            .done((): void => {
                sinon.assert.notCalled(removeDeployment);
                sinon.assert.calledOnce(log);
                sinon.assert.calledWithExactly(log, "Deployment removal cancelled.");

                done();
            });
    });

    it("deploymentRename renames deployment", (done: MochaDone): void => {
        var command: cli.IDeploymentRenameCommand = {
            type: cli.CommandType.deploymentRename,
            appName: "a",
            currentDeploymentName: "Staging",
            newDeploymentName: "c"
        };

        var renameDeployment: Sinon.SinonSpy = sandbox.spy(cmdexec.sdk, "renameDeployment");

        cmdexec.execute(command)
            .done((): void => {
                sinon.assert.calledOnce(renameDeployment);
                sinon.assert.calledOnce(log);
                sinon.assert.calledWithExactly(log, "Successfully renamed the \"Staging\" deployment to \"c\" for the \"a\" app.");

                done();
            });
    });

    it("deploymentHistory lists package history information", (done: MochaDone): void => {
        var command: cli.IDeploymentHistoryCommand = {
            type: cli.CommandType.deploymentHistory,
            appName: "a",
            deploymentName: "Staging",
            format: "json",
            displayAuthor: false
        };

        var getDeploymentHistory: Sinon.SinonSpy = sandbox.spy(cmdexec.sdk, "getDeploymentHistory");

        cmdexec.execute(command)
            .done((): void => {
                sinon.assert.calledOnce(getDeploymentHistory);
                sinon.assert.calledOnce(log);
                assert.equal(log.args[0].length, 1);

                var actual: string = log.args[0][0];
                var expected: codePush.Package[] = [
                    {
                        description: null,
                        appVersion: "1.0.0",
                        isMandatory: false,
                        packageHash: "463acc7d06adc9c46233481d87d9e8264b3e9ffe60fe98d721e6974209dc71a0",
                        blobUrl: "https://fakeblobstorage.net/storagev2/blobid1",
                        uploadTime: 1447113596270,
                        size: 1,
                        label: "v1",
                        metrics: {
                            active: 789,
                            downloaded: 456,
                            failed: 654,
                            installed: 987,
                            totalActive: 1035
                        }
                    },
                    {
                        description: "New update - this update does a whole bunch of things, including testing linewrapping",
                        appVersion: "1.0.1",
                        isMandatory: false,
                        packageHash: "463acc7d06adc9c46233481d87d9e8264b3e9ffe60fe98d721e6974209dc71a0",
                        blobUrl: "https://fakeblobstorage.net/storagev2/blobid2",
                        uploadTime: 1447118476669,
                        size: 2,
                        label: "v2",
                        metrics: {
                            active: 123,
                            downloaded: 321,
                            failed: 789,
                            installed: 456,
                            totalActive: 1035
                        }
                    }
                ];

                assertJsonDescribesObject(actual, expected);
                done();
            });
    });

    it("patch command successfully updates specific label", (done: MochaDone): void => {
        var command: cli.IPatchCommand = {
            type: cli.CommandType.patch,
            appName: "a",
            deploymentName: "Staging",
            label: "v1",
            disabled: false,
            description: "Patched",
            mandatory: true,
            rollout: 25,
            appStoreVersion: "1.0.1"
        };

        var patch: Sinon.SinonSpy = sandbox.spy(cmdexec.sdk, "patchRelease");

        cmdexec.execute(command)
            .done((): void => {
                sinon.assert.calledOnce(patch);
                sinon.assert.calledOnce(log);
                sinon.assert.calledWithExactly(log, `Successfully updated the "v1" release of "a" app's "Staging" deployment.`);

                done();
            });
    });

    it("patch command successfully updates latest release", (done: MochaDone): void => {
        var command: cli.IPatchCommand = {
            type: cli.CommandType.patch,
            appName: "a",
            deploymentName: "Staging",
            label: null,
            disabled: false,
            description: "Patched",
            mandatory: true,
            rollout: 25,
            appStoreVersion: "1.0.1"
        };

        var patch: Sinon.SinonSpy = sandbox.spy(cmdexec.sdk, "patchRelease");

        cmdexec.execute(command)
            .done((): void => {
                sinon.assert.calledOnce(patch);
                sinon.assert.calledOnce(log);
                sinon.assert.calledWithExactly(log, `Successfully updated the "latest" release of "a" app's "Staging" deployment.`);

                done();
            });
    });

    it("patch command successfully updates without appStoreVersion", (done: MochaDone): void => {
        var command: cli.IPatchCommand = {
            type: cli.CommandType.patch,
            appName: "a",
            deploymentName: "Staging",
            label: null,
            disabled: false,
            description: "Patched",
            mandatory: true,
            rollout: 25,
            appStoreVersion: null
        };

        var patch: Sinon.SinonSpy = sandbox.spy(cmdexec.sdk, "patchRelease");

        cmdexec.execute(command)
            .done((): void => {
                sinon.assert.calledOnce(patch);
                sinon.assert.calledOnce(log);
                sinon.assert.calledWithExactly(log, `Successfully updated the "latest" release of "a" app's "Staging" deployment.`);

                done();
            });
    });

    it("patch command fails if no properties were specified for update", (done: MochaDone): void => {
        var command: cli.IPatchCommand = {
            type: cli.CommandType.patch,
            appName: "a",
            deploymentName: "Staging",
            label: null,
            disabled: null,
            description: null,
            mandatory: null,
            rollout: null,
            appStoreVersion: null
        };

        var patch: Sinon.SinonSpy = sandbox.spy(cmdexec.sdk, "patchRelease");

        cmdexec.execute(command)
            .then(() => {
                done(new Error("Did not throw error."));
            })
            .catch((err) => {
                assert.equal(err.message, "At least one property must be specified to patch a release.");
                sinon.assert.notCalled(patch);
                done();
            })
            .done();
    });

    it("promote works successfully", (done: MochaDone): void => {
        var command: cli.IPromoteCommand = {
            type: cli.CommandType.promote,
            appName: "a",
            sourceDeploymentName: "Staging",
            destDeploymentName: "Production",
            description: "Promoted",
            mandatory: true,
            rollout: 25,
            appStoreVersion: "1.0.1"
        };

        var promote: Sinon.SinonSpy = sandbox.spy(cmdexec.sdk, "promote");

        cmdexec.execute(command)
            .done((): void => {
                sinon.assert.calledOnce(promote);
                sinon.assert.calledOnce(log);
                sinon.assert.calledWithExactly(log, `Successfully promoted the "Staging" deployment of the "a" app to the "Production" deployment.`);

                done();
            });
    });

    it("promote works successfully without appStoreVersion", (done: MochaDone): void => {
        var command: cli.IPromoteCommand = {
            type: cli.CommandType.promote,
            appName: "a",
            sourceDeploymentName: "Staging",
            destDeploymentName: "Production",
            description: "Promoted",
            mandatory: true,
            rollout: 25,
            appStoreVersion: null
        };

        var promote: Sinon.SinonSpy = sandbox.spy(cmdexec.sdk, "promote");

        cmdexec.execute(command)
            .done((): void => {
                sinon.assert.calledOnce(promote);
                sinon.assert.calledOnce(log);
                sinon.assert.calledWithExactly(log, `Successfully promoted the "Staging" deployment of the "a" app to the "Production" deployment.`);

                done();
            });
    });

    it("rollback works successfully", (done: MochaDone): void => {
        var command: cli.IRollbackCommand = {
            type: cli.CommandType.rollback,
            appName: "a",
            deploymentName: "Staging",
            targetRelease: "v2"
        };

        var rollback: Sinon.SinonSpy = sandbox.spy(cmdexec.sdk, "rollback");

        cmdexec.execute(command)
            .done((): void => {
                sinon.assert.calledOnce(rollback);
                sinon.assert.calledOnce(log);
                sinon.assert.calledWithExactly(log, `Successfully performed a rollback on the "Staging" deployment of the "a" app.`);

                done();
            });
    });

    it("release doesn't allow non valid semver ranges", (done: MochaDone): void => {
        var command: cli.IReleaseCommand = {
            type: cli.CommandType.release,
            appName: "a",
            deploymentName: "Staging",
            description: "test releasing zip file",
            mandatory: false,
            rollout: null,
            appStoreVersion: "not semver",
            path: "./resources"
        };

        releaseHelperFunction(command, done, "Please use a semver-compliant target binary version range, for example \"1.0.0\", \"*\" or \"^1.2.3\".");
    });

    it("release doesn't allow releasing .zip file", (done: MochaDone): void => {
        var command: cli.IReleaseCommand = {
            type: cli.CommandType.release,
            appName: "a",
            deploymentName: "Staging",
            description: "test releasing zip file",
            mandatory: false,
            rollout: null,
            appStoreVersion: "1.0.0",
            path: "/fake/path/test/file.zip"
        };

        releaseHelperFunction(command, done, INVALID_RELEASE_FILE_ERROR_MESSAGE);
    });

    it("release doesn't allow releasing .ipa file", (done: MochaDone): void => {
        var command: cli.IReleaseCommand = {
            type: cli.CommandType.release,
            appName: "a",
            deploymentName: "Staging",
            description: "test releasing ipa file",
            mandatory: false,
            rollout: null,
            appStoreVersion: "1.0.0",
            path: "/fake/path/test/file.ipa"
        };

        releaseHelperFunction(command, done, INVALID_RELEASE_FILE_ERROR_MESSAGE);
    });

    it("release doesn't allow releasing .apk file", (done: MochaDone): void => {
        var command: cli.IReleaseCommand = {
            type: cli.CommandType.release,
            appName: "a",
            deploymentName: "Staging",
            description: "test releasing apk file",
            mandatory: false,
            rollout: null,
            appStoreVersion: "1.0.0",
            path: "/fake/path/test/file.apk"
        };

        releaseHelperFunction(command, done, INVALID_RELEASE_FILE_ERROR_MESSAGE);
    });

    it("release-cordova fails if Cordova project cannot be prepared", (done: MochaDone): void => {
        testReleaseCordovaFailure(/*build*/ false, done);
    });

    it("release-cordova fails if Cordova project cannot be built", (done: MochaDone): void => {
        testReleaseCordovaFailure(/*build*/ true, done);
    });

    function testReleaseCordovaFailure(build: boolean, done: MochaDone): void {
        var command: cli.IReleaseCordovaCommand = {
            type: cli.CommandType.releaseCordova,
            appName: "a",
            appStoreVersion: null,
            build: build,
            deploymentName: "Staging",
            description: "Test invalid project",
            mandatory: false,
            rollout: null,
            platform: "ios"
        };

        var cordovaCommand: string = build ? "build" : "prepare";
        var execSync: Sinon.SinonStub = sandbox.stub(cmdexec, "execSync", (command: string, options: any) => { throw `Failed ${cordovaCommand}`; });
        var release: Sinon.SinonSpy = sandbox.spy(cmdexec, "release");
        var releaseCordova: Sinon.SinonSpy = sandbox.spy(cmdexec, "releaseCordova");

        cmdexec.execute(command)
            .then(() => {
                done(new Error("Did not throw error."));
            })
            .catch((err) => {
                assert.equal(err.message, `Unable to ${cordovaCommand} project. Please ensure that the CWD represents a Cordova project and that the "${command.platform}" platform was added by running "cordova platform add ${command.platform}".`);
                sinon.assert.notCalled(release);
                sinon.assert.threw(releaseCordova, "Error");
                done();
            })
            .done();
    }

    it("release-cordova fails if CWD does not contain config.xml", (done: MochaDone): void => {
        var command: cli.IReleaseCordovaCommand = {
            type: cli.CommandType.releaseCordova,
            appName: "a",
            appStoreVersion: null,
            build: false,
            deploymentName: "Staging",
            description: "Test missing config.xml",
            mandatory: false,
            rollout: null,
            platform: "ios"
        };

        var execSync: Sinon.SinonStub = sandbox.stub(cmdexec, "execSync", (command: string, options: any) => { });
        var release: Sinon.SinonSpy = sandbox.spy(cmdexec, "release");
        var releaseCordova: Sinon.SinonSpy = sandbox.spy(cmdexec, "releaseCordova");

        cmdexec.execute(command)
            .then(() => {
                done(new Error("Did not throw error."));
            })
            .catch((err) => {
                assert.equal(err.message, `Unable to find or read "config.xml" in the CWD. The "release-cordova" command must be executed in a Cordova project folder.`);
                sinon.assert.notCalled(release);
                sinon.assert.threw(releaseCordova, "Error");
                sinon.assert.calledOnce(execSync);
                done();
            })
            .done();
    });

    it("release-cordova fails if platform is invalid", (done: MochaDone): void => {
        var command: cli.IReleaseCordovaCommand = {
            type: cli.CommandType.releaseCordova,
            appName: "a",
            appStoreVersion: null,
            build: false,
            deploymentName: "Staging",
            description: "Test invalid platform",
            mandatory: false,
            rollout: null,
            platform: "blackberry",
        };

        var release: Sinon.SinonSpy = sandbox.spy(cmdexec, "release");
        var releaseCordova: Sinon.SinonSpy = sandbox.spy(cmdexec, "releaseCordova");

        cmdexec.execute(command)
            .then(() => {
                done(new Error("Did not throw error."));
            })
            .catch((err) => {
                assert.equal(err.message, "Platform must be either \"ios\" or \"android\".");
                sinon.assert.notCalled(release);
                sinon.assert.threw(releaseCordova, "Error");
                sinon.assert.notCalled(spawn);
                done();
            })
            .done();
    });

    it("release-cordova defaults appStoreVersion to value pulled from config.xml", (done: MochaDone): void => {
        var command: cli.IReleaseCordovaCommand = {
            type: cli.CommandType.releaseCordova,
            appName: "a",
            appStoreVersion: null,
            build: false,
            deploymentName: "Staging",
            description: "Test config.xml app version read",
            mandatory: false,
            rollout: null,
            platform: "ios"
        };

        var oldWd: string = process.cwd();
        ensureInTestAppDirectory();

        var expectedReleaseCommand = <cli.IReleaseCommand>{
            type: cli.CommandType.release,
            appName: "a",
            appStoreVersion: "0.0.1",
            build: false,
            deploymentName: "Staging",
            description: "Test config.xml app version read",
            mandatory: false,
            rollout: null,
            path: path.join(process.cwd(), "platforms", "ios", "www"),
            platform: "ios"
        };

        var execSync: Sinon.SinonStub = sandbox.stub(cmdexec, "execSync", (command: string, options: any) => { });
        var release: Sinon.SinonSpy = sandbox.stub(cmdexec, "release");
        var releaseCordova: Sinon.SinonSpy = sandbox.spy(cmdexec, "releaseCordova");

        cmdexec.execute(command)
            .then((compiledReleaseCommand: any) => {
                sinon.assert.calledOnce(execSync);
                sinon.assert.calledWith(release, expectedReleaseCommand);
                done();
            })
            .catch((err) => {
                done(new Error("Threw error. " + err.message));
            })
            .done(() => {
                process.chdir(oldWd);
            });
    });

    it("release-cordova points 'package' to the built folder for android", (done: MochaDone): void => {
        var command: cli.IReleaseCordovaCommand = {
            type: cli.CommandType.releaseCordova,
            appName: "a",
            appStoreVersion: null,
            build: true,
            deploymentName: "Staging",
            description: "Test android package resolution",
            mandatory: false,
            rollout: null,
            platform: "android"
        };

        var oldWd: string = process.cwd();
        ensureInTestAppDirectory();

        var expectedReleaseCommand = <cli.IReleaseCommand>{
            type: cli.CommandType.release,
            appName: "a",
            appStoreVersion: "0.0.1",
            build: true,
            deploymentName: "Staging",
            description: "Test android package resolution",
            mandatory: false,
            rollout: null,
            path: path.join(process.cwd(), "platforms", "android", "assets", "www"),
            platform: "android"
        };

        var execSync: Sinon.SinonStub = sandbox.stub(cmdexec, "execSync", (command: string, options: any) => { });
        var release: Sinon.SinonSpy = sandbox.stub(cmdexec, "release");
        var releaseCordova: Sinon.SinonSpy = sandbox.spy(cmdexec, "releaseCordova");

        cmdexec.execute(command)
            .then((compiledReleaseCommand: any) => {
                sinon.assert.calledOnce(execSync);
                sinon.assert.calledWith(release, expectedReleaseCommand);
                done();
            })
            .catch((err) => {
                done(new Error("Threw error. " + err.message));
            })
            .done(() => {
                process.chdir(oldWd);
            });
    });

    it("release-react fails if CWD does not contain package.json", (done: MochaDone): void => {
        var command: cli.IReleaseReactCommand = {
            type: cli.CommandType.releaseReact,
            appName: "a",
            appStoreVersion: null,
            deploymentName: "Staging",
            description: "Test invalid folder",
            mandatory: false,
            rollout: null,
            platform: "ios"
        };

        var release: Sinon.SinonSpy = sandbox.spy(cmdexec, "release");
        var releaseReact: Sinon.SinonSpy = sandbox.spy(cmdexec, "releaseReact");

        cmdexec.execute(command)
            .then(() => {
                done(new Error("Did not throw error."));
            })
            .catch((err) => {
                assert.equal(err.message, "Unable to find or read \"package.json\" in the CWD. The \"release-react\" command must be executed in a React Native project folder.");
                sinon.assert.notCalled(release);
                sinon.assert.threw(releaseReact, "Error");
                sinon.assert.notCalled(spawn);
                done();
            })
            .done();
    });

    it("release-react fails if entryFile does not exist", (done: MochaDone): void => {
        var command: cli.IReleaseReactCommand = {
            type: cli.CommandType.releaseReact,
            appName: "a",
            appStoreVersion: null,
            deploymentName: "Staging",
            description: "Test invalid entryFile",
            entryFile: "doesntexist.js",
            mandatory: false,
            rollout: null,
            platform: "ios"
        };

        ensureInTestAppDirectory();

        var release: Sinon.SinonSpy = sandbox.spy(cmdexec, "release");
        var releaseReact: Sinon.SinonSpy = sandbox.spy(cmdexec, "releaseReact");

        cmdexec.execute(command)
            .then(() => {
                done(new Error("Did not throw error."));
            })
            .catch((err) => {
                assert.equal(err.message, "Entry file \"doesntexist.js\" does not exist.");
                sinon.assert.notCalled(release);
                sinon.assert.threw(releaseReact, "Error");
                sinon.assert.notCalled(spawn);
                done();
            })
            .done();
    });

    it("release-react fails if platform is invalid", (done: MochaDone): void => {
        var command: cli.IReleaseReactCommand = {
            type: cli.CommandType.releaseReact,
            appName: "a",
            appStoreVersion: null,
            deploymentName: "Staging",
            description: "Test invalid platform",
            mandatory: false,
            rollout: null,
            platform: "blackberry",
        };

        ensureInTestAppDirectory();

        var release: Sinon.SinonSpy = sandbox.spy(cmdexec, "release");
        var releaseReact: Sinon.SinonSpy = sandbox.spy(cmdexec, "releaseReact");

        cmdexec.execute(command)
            .then(() => {
                done(new Error("Did not throw error."));
            })
            .catch((err) => {
                assert.equal(err.message, "Platform must be either \"android\", \"ios\" or \"windows\".");
                sinon.assert.notCalled(release);
                sinon.assert.threw(releaseReact, "Error");
                sinon.assert.notCalled(spawn);
                done();
            })
            .done();
    });

    it("release-react fails if targetBinaryRange is not a valid semver range expression", (done: MochaDone): void => {
        var bundleName = "bundle.js";
        var command: cli.IReleaseReactCommand = {
            type: cli.CommandType.releaseReact,
            appName: "a",
            appStoreVersion: "notsemver",
            bundleName: bundleName,
            deploymentName: "Staging",
            description: "Test uses targetBinaryRange",
            mandatory: false,
            rollout: null,
            platform: "android",
            sourcemapOutput: "index.android.js.map"
        };

        ensureInTestAppDirectory();

        var release: Sinon.SinonSpy = sandbox.stub(cmdexec, "release", () => { return Q(<void>null) });
        var releaseReact: Sinon.SinonSpy = sandbox.spy(cmdexec, "releaseReact");

        cmdexec.execute(command)
            .then(() => {
                done(new Error("Did not throw error."));
            })
            .catch((err) => {
                assert.equal(err.message, "Please use a semver-compliant target binary version range, for example \"1.0.0\", \"*\" or \"^1.2.3\".");
                sinon.assert.notCalled(release);
                sinon.assert.threw(releaseReact, "Error");
                sinon.assert.notCalled(spawn);
                done();
            })
            .done();
    });

    it("release-react defaults entry file to index.{platform}.js if not provided", (done: MochaDone): void => {
        var bundleName = "bundle.js";
        var command: cli.IReleaseReactCommand = {
            type: cli.CommandType.releaseReact,
            appName: "a",
            appStoreVersion: null,
            bundleName: bundleName,
            deploymentName: "Staging",
            description: "Test default entry file",
            mandatory: false,
            rollout: null,
            platform: "ios"
        };

        ensureInTestAppDirectory();

        var release: Sinon.SinonSpy = sandbox.stub(cmdexec, "release", () => { return Q(<void>null) });

        cmdexec.execute(command)
            .then(() => {
                var releaseCommand: cli.IReleaseCommand = <any>command;
                releaseCommand.path = path.join(os.tmpdir(), "CodePush");
                releaseCommand.appStoreVersion = "1.2.3";

                sinon.assert.calledOnce(spawn);
                var spawnCommand: string = spawn.args[0][0];
                var spawnCommandArgs: string = spawn.args[0][1].join(" ");
                assert.equal(spawnCommand, "node");
                assert.equal(
                    spawnCommandArgs,
                    `${path.join("node_modules", "react-native", "local-cli", "cli.js")} bundle --assets-dest ${path.join(os.tmpdir(), "CodePush")} --bundle-output ${path.join(os.tmpdir(), "CodePush", bundleName)} --dev false --entry-file index.ios.js --platform ios`
                );
                assertJsonDescribesObject(JSON.stringify(release.args[0][0], /*replacer=*/ null, /*spacing=*/ 2), releaseCommand);
                done();
            })
            .done();
    });

    it("release-react defaults bundle name to \"main.jsbundle\" if not provided and platform is \"ios\"", (done: MochaDone): void => {
        var command: cli.IReleaseReactCommand = {
            type: cli.CommandType.releaseReact,
            appName: "a",
            appStoreVersion: null,
            deploymentName: "Staging",
            description: "Test default entry file",
            mandatory: false,
            rollout: null,
            platform: "ios"
        };

        ensureInTestAppDirectory();

        var release: Sinon.SinonSpy = sandbox.stub(cmdexec, "release", () => { return Q(<void>null) });

        cmdexec.execute(command)
            .then(() => {
                var releaseCommand: cli.IReleaseCommand = <any>clone(command);
                var packagePath: string = path.join(os.tmpdir(), "CodePush");
                releaseCommand.path = packagePath;
                releaseCommand.appStoreVersion = "1.2.3";

                sinon.assert.calledOnce(spawn);
                var spawnCommand: string = spawn.args[0][0];
                var spawnCommandArgs: string = spawn.args[0][1].join(" ");
                assert.equal(spawnCommand, "node");
                assert.equal(
                    spawnCommandArgs,
                    `${path.join("node_modules", "react-native", "local-cli", "cli.js")} bundle --assets-dest ${packagePath} --bundle-output ${path.join(packagePath, "main.jsbundle")} --dev false --entry-file index.ios.js --platform ios`
                );
                assertJsonDescribesObject(JSON.stringify(release.args[0][0], /*replacer=*/ null, /*spacing=*/ 2), releaseCommand);
                done();
            })
            .done();
    });

    it("release-react defaults bundle name to \"index.android.bundle\" if not provided and platform is \"android\"", (done: MochaDone): void => {
        var command: cli.IReleaseReactCommand = {
            type: cli.CommandType.releaseReact,
            appName: "a",
            appStoreVersion: null,
            deploymentName: "Staging",
            description: "Test default entry file",
            mandatory: false,
            rollout: null,
            platform: "android"
        };

        ensureInTestAppDirectory();

        var release: Sinon.SinonSpy = sandbox.stub(cmdexec, "release", () => { return Q(<void>null) });

        cmdexec.execute(command)
            .then(() => {
                var releaseCommand: cli.IReleaseCommand = <any>clone(command);
                var packagePath: string = path.join(os.tmpdir(), "CodePush");
                releaseCommand.path = packagePath;
                releaseCommand.appStoreVersion = "1.0.0";

                sinon.assert.calledOnce(spawn);
                var spawnCommand: string = spawn.args[0][0];
                var spawnCommandArgs: string = spawn.args[0][1].join(" ");
                assert.equal(spawnCommand, "node");
                assert.equal(
                    spawnCommandArgs,
                    `${path.join("node_modules", "react-native", "local-cli", "cli.js")} bundle --assets-dest ${packagePath} --bundle-output ${path.join(packagePath, "index.android.bundle")} --dev false --entry-file index.android.js --platform android`
                );
                assertJsonDescribesObject(JSON.stringify(release.args[0][0], /*replacer=*/ null, /*spacing=*/ 2), releaseCommand);
                done();
            })
            .done();
    });

    it("release-react defaults bundle name to \"index.windows.bundle\" if not provided and platform is \"windows\"", (done: MochaDone): void => {
        var command: cli.IReleaseReactCommand = {
            type: cli.CommandType.releaseReact,
            appName: "a",
            appStoreVersion: null,
            deploymentName: "Staging",
            description: "Test default entry file",
            mandatory: false,
            rollout: null,
            platform: "windows"
        };

        ensureInTestAppDirectory();

        var release: Sinon.SinonSpy = sandbox.stub(cmdexec, "release", () => { return Q(<void>null) });

        cmdexec.execute(command)
            .then(() => {
                var releaseCommand: cli.IReleaseCommand = <any>clone(command);
                var packagePath = path.join(os.tmpdir(), "CodePush");
                releaseCommand.path = packagePath;
                releaseCommand.appStoreVersion = "1.0.0";

                sinon.assert.calledOnce(spawn);
                var spawnCommand: string = spawn.args[0][0];
                var spawnCommandArgs: string = spawn.args[0][1].join(" ");
                assert.equal(spawnCommand, "node");
                assert.equal(
                    spawnCommandArgs,
                    `${path.join("node_modules", "react-native", "local-cli", "cli.js")} bundle --assets-dest ${packagePath} --bundle-output ${path.join(packagePath, "index.windows.bundle")} --dev false --entry-file index.windows.js --platform windows`
                );
                assertJsonDescribesObject(JSON.stringify(release.args[0][0], /*replacer=*/ null, /*spacing=*/ 2), releaseCommand);
                done();
            })
            .done();
    });

    it("release-react generates dev bundle", (done: MochaDone): void => {
        var bundleName = "bundle.js";
        var command: cli.IReleaseReactCommand = {
            type: cli.CommandType.releaseReact,
            appName: "a",
            appStoreVersion: null,
            bundleName: bundleName,
            deploymentName: "Staging",
            development: true,
            description: "Test generates dev bundle",
            mandatory: false,
            rollout: null,
            platform: "android",
            sourcemapOutput: "index.android.js.map"
        };

        ensureInTestAppDirectory();

        var release: Sinon.SinonSpy = sandbox.stub(cmdexec, "release", () => { return Q(<void>null) });

        cmdexec.execute(command)
            .then(() => {
                var releaseCommand: cli.IReleaseCommand = <any>command;
                releaseCommand.path = path.join(os.tmpdir(), "CodePush");
                releaseCommand.appStoreVersion = "1.2.3";

                sinon.assert.calledOnce(spawn);
                var spawnCommand: string = spawn.args[0][0];
                var spawnCommandArgs: string = spawn.args[0][1].join(" ");
                assert.equal(spawnCommand, "node");
                assert.equal(
                    spawnCommandArgs,
                    `${path.join("node_modules", "react-native", "local-cli", "cli.js")} bundle --assets-dest ${path.join(os.tmpdir(), "CodePush")} --bundle-output ${path.join(os.tmpdir(), "CodePush", bundleName)} --dev true --entry-file index.android.js --platform android --sourcemap-output index.android.js.map`
                );
                assertJsonDescribesObject(JSON.stringify(release.args[0][0], /*replacer=*/ null, /*spacing=*/ 2), releaseCommand);
                done();
            })
            .done();
    });

    it("release-react generates sourcemaps", (done: MochaDone): void => {
        var bundleName = "bundle.js";
        var command: cli.IReleaseReactCommand = {
            type: cli.CommandType.releaseReact,
            appName: "a",
            appStoreVersion: null,
            bundleName: bundleName,
            deploymentName: "Staging",
            description: "Test generates sourcemaps",
            mandatory: false,
            rollout: null,
            platform: "android",
            sourcemapOutput: "index.android.js.map"
        };

        ensureInTestAppDirectory();

        var release: Sinon.SinonSpy = sandbox.stub(cmdexec, "release", () => { return Q(<void>null) });

        cmdexec.execute(command)
            .then(() => {
                var releaseCommand: cli.IReleaseCommand = <any>command;
                releaseCommand.path = path.join(os.tmpdir(), "CodePush");
                releaseCommand.appStoreVersion = "1.2.3";

                sinon.assert.calledOnce(spawn);
                var spawnCommand: string = spawn.args[0][0];
                var spawnCommandArgs: string = spawn.args[0][1].join(" ");
                assert.equal(spawnCommand, "node");
                assert.equal(
                    spawnCommandArgs,
                    `${path.join("node_modules", "react-native", "local-cli", "cli.js")} bundle --assets-dest ${path.join(os.tmpdir(), "CodePush")} --bundle-output ${path.join(os.tmpdir(), "CodePush", bundleName)} --dev false --entry-file index.android.js --platform android --sourcemap-output index.android.js.map`
                );
                assertJsonDescribesObject(JSON.stringify(release.args[0][0], /*replacer=*/ null, /*spacing=*/ 2), releaseCommand);
                done();
            })
            .done();
    });

    it("release-react uses specified targetBinaryRange option", (done: MochaDone): void => {
        var bundleName = "bundle.js";
        var command: cli.IReleaseReactCommand = {
            type: cli.CommandType.releaseReact,
            appName: "a",
            appStoreVersion: ">=1.0.0 <1.0.5",
            bundleName: bundleName,
            deploymentName: "Staging",
            description: "Test uses targetBinaryRange",
            mandatory: false,
            rollout: null,
            platform: "android",
            sourcemapOutput: "index.android.js.map"
        };

        ensureInTestAppDirectory();

        var release: Sinon.SinonSpy = sandbox.stub(cmdexec, "release", () => { return Q(<void>null) });

        cmdexec.execute(command)
            .then(() => {
                var releaseCommand: cli.IReleaseCommand = <any>command;
                releaseCommand.path = path.join(os.tmpdir(), "CodePush");

                sinon.assert.calledOnce(spawn);
                var spawnCommand: string = spawn.args[0][0];
                var spawnCommandArgs: string = spawn.args[0][1].join(" ");
                assert.equal(spawnCommand, "node");
                assert.equal(
                    spawnCommandArgs,
                    `${path.join("node_modules", "react-native", "local-cli", "cli.js")} bundle --assets-dest ${path.join(os.tmpdir(), "CodePush")} --bundle-output ${path.join(os.tmpdir(), "CodePush", bundleName)} --dev false --entry-file index.android.js --platform android --sourcemap-output index.android.js.map`
                );
                assertJsonDescribesObject(JSON.stringify(release.args[0][0], /*replacer=*/ null, /*spacing=*/ 2), releaseCommand);
                done();
            })
            .done();
    });

    it("sessionList lists session name and expires fields", (done: MochaDone): void => {
        var command: cli.IAccessKeyListCommand = {
            type: cli.CommandType.sessionList,
            format: "json"
        };

        cmdexec.execute(command)
            .done((): void => {
                sinon.assert.calledOnce(log);
                assert.equal(log.args[0].length, 1);

                var actual: string = log.args[0][0];
                var expected = [
                    {
                        loggedInTime: 0,
                        machineName: TEST_MACHINE_NAME,
                    }
                ];

                assertJsonDescribesObject(actual, expected);
                done();
            });
    });

    it("sessionRemove removes session", (done: MochaDone): void => {
        var machineName = TEST_MACHINE_NAME;
        var command: cli.ISessionRemoveCommand = {
            type: cli.CommandType.sessionRemove,
            machineName: machineName
        };

        var removeSession: Sinon.SinonSpy = sandbox.spy(cmdexec.sdk, "removeSession");

        cmdexec.execute(command)
            .done((): void => {
                sinon.assert.calledOnce(removeSession);
                sinon.assert.calledWithExactly(removeSession, machineName);
                sinon.assert.calledOnce(log);
                sinon.assert.calledWithExactly(log, `Successfully removed the login session for "${machineName}".`);

                done();
            });
    });

    it("sessionRemove does not remove session if cancelled", (done: MochaDone): void => {
        var machineName = TEST_MACHINE_NAME;
        var command: cli.ISessionRemoveCommand = {
            type: cli.CommandType.sessionRemove,
            machineName: machineName
        };

        var removeSession: Sinon.SinonSpy = sandbox.spy(cmdexec.sdk, "removeSession");

        wasConfirmed = false;

        cmdexec.execute(command)
            .done((): void => {
                sinon.assert.notCalled(removeSession);
                sinon.assert.calledOnce(log);
                sinon.assert.calledWithExactly(log, "Session removal cancelled.");

                done();
            });
    });

    it("sessionRemove does not remove current session", (done: MochaDone): void => {
        var machineName = os.hostname();
        var command: cli.ISessionRemoveCommand = {
            type: cli.CommandType.sessionRemove,
            machineName: machineName
        };

        var removeSession: Sinon.SinonSpy = sandbox.spy(cmdexec.sdk, "removeSession");

        wasConfirmed = false;

        cmdexec.execute(command)
            .then(() => {
                done(new Error("Did not throw error."));
            })
            .catch((err) => {
                done();
            })
            .done();
    });

    function releaseHelperFunction(command: cli.IReleaseCommand, done: MochaDone, expectedError: string): void {
        var release: Sinon.SinonSpy = sandbox.spy(cmdexec.sdk, "release");
        cmdexec.execute(command)
            .done((): void => {
                throw "Error Expected";
            }, (error: any): void => {
                assert(!!error);
                assert.equal(error.message, expectedError);
                done();
            });
    }
});