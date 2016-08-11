import * as assert from "assert";
import * as CodePush from "rest-definitions";
import * as fs from "fs";
import * as path from "path";
import { Command } from "./utils/command";
import { Error } from "./utils/error";
import { makeRandomString } from "./utils/misc";
import { Success } from "./utils/success";
import { Validate } from "./utils/validate";
var nixt = require("nixt");
var tryJSON = require("try-json");

const baseDir: string = path.join("e2e");

const inputFolder: string = path.join(baseDir, "input");
const outputFolder: string = path.join(baseDir, "output");

const cordovaProject: string = path.join(inputFolder, "cordovaProject");
const reactNativeProject: string = path.join(inputFolder, "rnProject");
const singleFile: string = path.join(inputFolder, "singleFile.js");
const folder: string = path.join(inputFolder, "folder");
const zip: string = path.join(inputFolder, "zip.zip");
const apk: string = path.join(inputFolder, "apk.apk");
const ipa: string = path.join(inputFolder, "ipa.ipa");

const release1: string = path.join(inputFolder, "release1.js");
const release2: string = path.join(inputFolder, "release2.js");
const release3: string = path.join(inputFolder, "release3.js");

export function packageTests() {
    /** Resets before every test to clear all the deployments. */
    var appName: string;
    
    const deploymentNameStaging: string = "Staging";
    const deploymentNameProduction: string = "Production";
    
    const binaryVersion1: string = "1.0.0";
    const binaryVersion2: string = "2.0.0";
    const binaryVersion3: string = "3.0.0";
    
    const rolloutFull: number = 100;
    const rolloutPartial: number = 50;
    
    const releaseMethodUpload: string = "Upload";
    const releaseMethodPromote: string = "Promote";
    const releaseMethodRollback: string = "Rollback";
    
    // Clear the output files from last test run, if they exist.
    before(() => {
        try {
            fs.rmdirSync(outputFolder);
        }
        catch(error) { }
        finally {
            fs.mkdirSync(outputFolder);
        }
    });
    
    // Before each test, the app is deleted and recreated so that we can assert that all the deployments are entirely empty.
    
    beforeEach((done: MochaDone) => {
        appName = makeRandomString();
        nixt()
            .stdout(Success.appAdd(appName))
            .run(Command.appAdd(appName))
            .end(done);
    });
    
    afterEach((done: MochaDone) => {
        nixt()
            .stdout(Success.appRm(appName))
            .run(Command.appRm(appName))
            .on(Command.PROMPT_ARE_YOU_SURE).respond(Command.RESPONSE_ACCEPT)
            .end(done);
    });
    
    /** Given a deployment, asserts that the deployment has a package. */
    function assertHasPackage(deployment: CodePush.Deployment) {
        assert(deployment.package, "Deployment that was released to has no package.");
    }
    
    /** Given a deployment, asserts that the deployment has no package. */
    function assertHasNoPackage(deployment: CodePush.Deployment) {
        assert(!deployment.package, "Deployment that was never released to has a package.");
    }
    
    /** Returns a function that checks the given deployment passes the verificationFunction. */
    function verifyDeploymentPackage(callback: () => void, deploymentName: string, verificationFunction: (deployment: CodePush.Deployment) => void): () => void {
        return () => {
            nixt()
                .expect(Validate.Deployments.checkFor(deploymentName, verificationFunction))
                .run(Command.deploymentLs(appName))
                .end(callback);
        }
    }
    
    /** Returns a function that verifies that the given deployment has no package. */
    function verifyDeploymentNoPackage(callback: () => void, deploymentName: string): () => void {
        return verifyDeploymentPackage(callback, deploymentName, (deployment: CodePush.Deployment) => {
            assertHasNoPackage(deployment);
        });
    }
    
    /** Returns a function that asserts that a deployment's package matches the given packageInfo */
    function compareDeploymentPackage(packageInfo: CodePush.PackageInfo, releaseMethod?: string): (deployment: CodePush.Deployment) => void {
        return (deployment: CodePush.Deployment) => {
            assertHasPackage(deployment);
            
            for (var parameter in packageInfo) {
                assert.equal((<any>deployment.package)[parameter], (<any>packageInfo)[parameter], "deployment.package." + parameter + " does not match.");
            }
            
            !!releaseMethod && assert.equal(deployment.package.releaseMethod, releaseMethod);
        };
    }
    
    /** Returns a function that verifies the package of the given deployment is identical to `packageInfo`. */
    function verifyDeploymentPackageMatches(callback: () => void, deploymentName: string, packageInfo: CodePush.PackageInfo, releaseMethod?: string): () => void {
        return verifyDeploymentPackage(callback, deploymentName, compareDeploymentPackage(packageInfo));
    }
    
    describe("deployment ls shows most recent package", () => {
        it("when deployment has no packages", (done: MochaDone) => {
            verifyDeploymentNoPackage(done, deploymentNameStaging)();
        });
        
        it("when deployment has one package", (done: MochaDone) => {
            nixt()
                .stdout(Success.releaseFile(release1, appName, deploymentNameStaging))
                .run(Command.release(appName, release1, binaryVersion1))
                .end(verifyDeploymentPackageMatches(done, deploymentNameStaging, { appVersion: binaryVersion1, label: "v1", rollout: rolloutFull }, releaseMethodUpload));
        });
        
        it("when deployment has multiple packages", (done: MochaDone) => {
            nixt()
                .stdout(Success.releaseFile(release1, appName, deploymentNameStaging))
                .run(Command.release(appName, release1, binaryVersion1))
                .end(() => {
                    nixt()
                        .stdout(Success.releaseFile(release2, appName, deploymentNameStaging))
                        .run(Command.release(appName, release2, binaryVersion1))
                        .end(verifyDeploymentPackageMatches(done, deploymentNameStaging, { appVersion: binaryVersion1, label: "v2", rollout: rolloutFull }, releaseMethodUpload));
                });
        });
        
        it("regardless of binary version", (done: MochaDone) => {
            nixt()
                .stdout(Success.releaseFile(release1, appName, deploymentNameStaging))
                .run(Command.release(appName, release1, binaryVersion3))
                .end(() => {
                    nixt()
                        .stdout(Success.releaseFile(release2, appName, deploymentNameStaging))
                        .run(Command.release(appName, release2, binaryVersion1))
                        .end(() => {
                            nixt()
                                .stdout(Success.releaseFile(release3, appName, deploymentNameStaging))
                                .run(Command.release(appName, release3, binaryVersion2))
                                .end(verifyDeploymentPackageMatches(done, deploymentNameStaging, { appVersion: binaryVersion2, label: "v3", rollout: rolloutFull }, releaseMethodUpload));
                        });
                });
        });
    });
    
    describe("release", () => {
        
        describe("accepts", () => {
            it("file", (done: MochaDone) => {
                nixt()
                    .stdout(Success.releaseFile(singleFile, appName, deploymentNameStaging))
                    .run(Command.release(appName, singleFile, binaryVersion1))
                    .end(verifyDeploymentPackageMatches(done, deploymentNameStaging, { appVersion: binaryVersion1, label: "v1", rollout: rolloutFull }, releaseMethodUpload));
            });
            
            it("folder", (done: MochaDone) => {
                nixt()
                    .stdout(Success.releaseDirectory(folder, appName, deploymentNameStaging))
                    .run(Command.release(appName, folder, binaryVersion1))
                    .end(verifyDeploymentPackageMatches(done, deploymentNameStaging, { appVersion: binaryVersion1, label: "v1", rollout: rolloutFull }, releaseMethodUpload));
            });
            
            it("releases to new deployment", (done: MochaDone) => {
                var newDeploymentName: string = makeRandomString();
                nixt()
                    .stdout(Success.deploymentAdd(appName, newDeploymentName))
                    .run(Command.deploymentAdd(appName, newDeploymentName))
                    .end(() => {
                        nixt()
                            .stdout(Success.releaseFile(singleFile, appName, newDeploymentName))
                            .run(Command.release(appName, singleFile, binaryVersion1, { deploymentName: newDeploymentName }))
                            .end(verifyDeploymentPackageMatches(done, newDeploymentName, { appVersion: binaryVersion1, label: "v1", rollout: rolloutFull }, releaseMethodUpload));
                    });
            });
            
            it("releases to a deployment with another package on the same binary version", (done: MochaDone) => {
                nixt()
                    .stdout(Success.releaseFile(release1, appName, deploymentNameStaging))
                    .run(Command.release(appName, release1, binaryVersion1))
                    .end(() => {
                        nixt()
                            .stdout(Success.releaseFile(release2, appName, deploymentNameStaging))
                            .run(Command.release(appName, release2, binaryVersion1))
                            .end(verifyDeploymentPackageMatches(done, deploymentNameStaging, { appVersion: binaryVersion1, label: "v2", rollout: rolloutFull }, releaseMethodUpload))
                    });
            });
            
            it("releases to a deployment with another package on a different binary version", (done: MochaDone) => {
                nixt()
                    .stdout(Success.releaseFile(release1, appName, deploymentNameStaging))
                    .run(Command.release(appName, release1, binaryVersion1))
                    .end(() => {
                        nixt()
                            .stdout(Success.releaseFile(release2, appName, deploymentNameStaging))
                            .run(Command.release(appName, release2, binaryVersion2))
                            .end(verifyDeploymentPackageMatches(done, deploymentNameStaging, { appVersion: binaryVersion2, label: "v2", rollout: rolloutFull }, releaseMethodUpload))
                    });
            });
            
            it("releases to a deployment with an identical package on a different binary version", (done: MochaDone) => {
                nixt()
                    .stdout(Success.releaseFile(release1, appName, deploymentNameStaging))
                    .run(Command.release(appName, release1, binaryVersion1))
                    .end(() => {
                        nixt()
                            .stdout(Success.releaseFile(release1, appName, deploymentNameStaging))
                            .run(Command.release(appName, release1, binaryVersion2))
                            .end(verifyDeploymentPackageMatches(done, deploymentNameStaging, { appVersion: binaryVersion2, label: "v2", rollout: rolloutFull }, releaseMethodUpload))
                    });
            });
            
            it("specifying description, disabled, and mandatory", (done: MochaDone) => {
                var description: string = "this_is_a_description";
                var isDisabled: boolean = true;
                var isMandatory: boolean = true;
                
                nixt()
                    .stdout(Success.releaseFile(release1, appName, deploymentNameStaging))
                    .run(Command.release(appName, release1, binaryVersion1, { description: description, disabled: isDisabled, mandatory: isMandatory }))
                    .end(verifyDeploymentPackageMatches(done, deploymentNameStaging, { appVersion: binaryVersion1, label: "v1", rollout: rolloutFull, description: description, isDisabled: isDisabled, isMandatory: isMandatory }, releaseMethodUpload))
            });
            
            describe("rollout", () => {
                it("against deployment with no packages", (done: MochaDone) => {
                    nixt()
                        .stdout(Success.releaseFile(singleFile, appName, deploymentNameStaging))
                        .run(Command.release(appName, singleFile, binaryVersion1, { rollout: rolloutPartial }))
                        .end(verifyDeploymentPackageMatches(done, deploymentNameStaging, { appVersion: binaryVersion1, label: "v1", rollout: rolloutPartial }, releaseMethodUpload));
                });
                
                it("against deployment with a full rollout on same binary version", (done: MochaDone) => {
                    nixt()
                        .stdout(Success.releaseFile(release1, appName, deploymentNameStaging))
                        .run(Command.release(appName, release1, binaryVersion1))
                        .end(() => {
                            nixt()
                                .stdout(Success.releaseFile(release2, appName, deploymentNameStaging))
                                .run(Command.release(appName, release2, binaryVersion1, { rollout: rolloutPartial }))
                                .end(verifyDeploymentPackageMatches(done, deploymentNameStaging, { appVersion: binaryVersion1, label: "v2", rollout: rolloutPartial }, releaseMethodUpload));
                        });
                });
                
                it("against deployment with a full rollout on a different binary version", (done: MochaDone) => {
                    nixt()
                        .stdout(Success.releaseFile(release1, appName, deploymentNameStaging))
                        .run(Command.release(appName, release1, binaryVersion2))
                        .end(() => {
                            nixt()
                                .stdout(Success.releaseFile(release2, appName, deploymentNameStaging))
                                .run(Command.release(appName, release2, binaryVersion1, { rollout: rolloutPartial }))
                                .end(verifyDeploymentPackageMatches(done, deploymentNameStaging, { appVersion: binaryVersion1, label: "v2", rollout: rolloutPartial }, releaseMethodUpload));
                        });
                });
                
                it("full against a deployment with a disabled partial rollout", (done: MochaDone) => {
                    nixt()
                        .stdout(Success.releaseFile(release1, appName, deploymentNameStaging))
                        .run(Command.release(appName, release1, binaryVersion1, { rollout: rolloutPartial, disabled: true }))
                        .end(() => {
                            nixt()
                                .stdout(Success.releaseFile(release2, appName, deploymentNameStaging))
                                .run(Command.release(appName, release2, binaryVersion1))
                                .end(verifyDeploymentPackageMatches(done, deploymentNameStaging, { appVersion: binaryVersion1, label: "v2", rollout: rolloutFull }, releaseMethodUpload));
                        });
                });
                
                it("partial against a deployment with a disabled partial rollout", (done: MochaDone) => {
                    nixt()
                        .stdout(Success.releaseFile(release1, appName, deploymentNameStaging))
                        .run(Command.release(appName, release1, binaryVersion1, { rollout: rolloutPartial, disabled: true }))
                        .end(() => {
                            nixt()
                                .stdout(Success.releaseFile(release2, appName, deploymentNameStaging))
                                .run(Command.release(appName, release2, binaryVersion1, { rollout: rolloutPartial }))
                                .end(verifyDeploymentPackageMatches(done, deploymentNameStaging, { appVersion: binaryVersion1, label: "v2", rollout: rolloutPartial }, releaseMethodUpload));
                        });
                });
            });
        });
        
        describe("rejects", () => {
            it("app not found", (done: MochaDone) => {
                var fakeAppName: string = makeRandomString();
                
                nixt()
                    .stderr(Error.appNotFound(fakeAppName))
                    .run(Command.release(fakeAppName, release1, binaryVersion1))
                    .end(verifyDeploymentNoPackage(done, deploymentNameStaging));
            });
            
            it("deployment not found", (done: MochaDone) => {
                var fakeDeploymentName: string = makeRandomString();
                
                nixt()
                    .stderr(Error.deploymentNotFound(fakeDeploymentName))
                    .run(Command.release(appName, release1, binaryVersion1, { deploymentName: fakeDeploymentName }))
                    .end(verifyDeploymentNoPackage(done, deploymentNameStaging));
            });
            
            it("zip", (done: MochaDone) => {
                nixt()
                    .stderr(Error.releaseBinaryZip())
                    .run(Command.release(appName, zip, binaryVersion1))
                    .end(verifyDeploymentNoPackage(done, deploymentNameStaging));
            });
            
            it("apk", (done: MochaDone) => {
                nixt()
                    .stderr(Error.releaseBinaryZip())
                    .run(Command.release(appName, apk, binaryVersion1))
                    .end(verifyDeploymentNoPackage(done, deploymentNameStaging));
            });
            
            it("ipa", (done: MochaDone) => {
                nixt()
                    .stderr(Error.releaseBinaryZip())
                    .run(Command.release(appName, ipa, binaryVersion1))
                    .end(verifyDeploymentNoPackage(done, deploymentNameStaging));
            });
            
            it("identical on same binary version", (done: MochaDone) => {
                nixt()
                    .stdout(Success.releaseFile(release1, appName, deploymentNameStaging))
                    .run(Command.release(appName, release1, binaryVersion1))
                    .end(() => {
                        nixt()
                        .stderr(Error.releaseIdentical())
                        .run(Command.release(appName, release1, binaryVersion1))
                        .end(done);
                    });
            });
            
            it("ENOENT", (done: MochaDone) => {
                nixt()
                    .stderr(Error.enoent())
                    .run(Command.release(appName, "not_a_real_update", binaryVersion1))
                    .end(verifyDeploymentNoPackage(done, deploymentNameStaging));
            });
            
            it("invalid semver", (done: MochaDone) => {
                nixt()
                    .stderr(Error.invalidSemver())
                    .run(Command.release(appName, release1, "not_real_semver"))
                    .end(verifyDeploymentNoPackage(done, deploymentNameStaging));
            });
            
            it("invalid disabled", (done: MochaDone) => {
                nixt()
                    .stderr(Error.releaseUsage())
                    .run(Command.release(appName, release1, binaryVersion1, <any>{ disabled: "not_a_boolean" }))
                    .end(verifyDeploymentNoPackage(done, deploymentNameStaging));
            });
            
            it("invalid mandatory", (done: MochaDone) => {
                nixt()
                    .stderr(Error.releaseUsage())
                    .run(Command.release(appName, release1, binaryVersion1, <any>{ mandatory: "not_a_boolean" }))
                    .end(verifyDeploymentNoPackage(done, deploymentNameStaging));
            });
            
            describe("invalid rollout", () => {
                it("0", (done: MochaDone) => {
                    nixt()
                        .stderr(Error.releaseUsage())
                        .run(Command.release(appName, release1, binaryVersion1, { rollout: 0 }))
                        .end(verifyDeploymentNoPackage(done, deploymentNameStaging));
                });
                
                it("negative", (done: MochaDone) => {
                    nixt()
                        .stderr(Error.releaseUsage())
                        .run(Command.release(appName, release1, binaryVersion1, { rollout: -50 }))
                        .end(verifyDeploymentNoPackage(done, deploymentNameStaging));
                });
                
                it("above 100", (done: MochaDone) => {
                    nixt()
                        .stderr(Error.releaseUsage())
                        .run(Command.release(appName, release1, binaryVersion1, { rollout: 150 }))
                        .end(verifyDeploymentNoPackage(done, deploymentNameStaging));
                });
            });
            
            describe("when a partial rollout is the last package", () => {
                it("of the same binary version", (done: MochaDone) => {
                    nixt()
                        .stdout(Success.releaseFile(release1, appName, deploymentNameStaging))
                        .run(Command.release(appName, release1, binaryVersion1, { rollout: rolloutPartial}))
                        .end(() => {
                            nixt()
                                .stderr(Error.releaseRollbackInProgress())
                                .run(Command.release(appName, release2, binaryVersion1))
                                .end(verifyDeploymentPackageMatches(done, deploymentNameStaging, { appVersion: binaryVersion1, label: "v1", rollout: rolloutPartial }, releaseMethodUpload));
                        });
                });
                
                it("of a different binary version", (done: MochaDone) => {
                    nixt()
                        .stdout(Success.releaseFile(release1, appName, deploymentNameStaging))
                        .run(Command.release(appName, release1, binaryVersion1, { rollout: rolloutPartial}))
                        .end(() => {
                            nixt()
                                .stderr(Error.releaseRollbackInProgress())
                                .run(Command.release(appName, release2, binaryVersion2))
                                .end(verifyDeploymentPackageMatches(done, deploymentNameStaging, { appVersion: binaryVersion1, label: "v1", rollout: rolloutPartial }, releaseMethodUpload));
                        });
                });
            });
        });
    });
    
    /**
     * Verifies that the package history is identical to the given packages.
     */
    function verifyPackageHistory(callback: () => void, deploymentName: string, packages: CodePush.PackageInfo[]): () => void {
        var packagesCheckMap: { [label: string]: Validate.objectValidatorFunction } = {};
        for (var packageInfo of packages) {
            packagesCheckMap[packageInfo.label] = compareDeploymentPackage(packageInfo, releaseMethodUpload);
        }
        // verify that there are no packages in the history by asserting that the next package in the history is nonexistent
        packagesCheckMap["v" + (packages.length + 1)] = Validate.doesNotExistInContainer;
        return () => {
            nixt()
                .expect(Validate.Packages.checkForMany(packagesCheckMap))
                .run(Command.deploymentH(appName, deploymentName))
                .end(callback);
        }
    }
    
    describe("deployment h", () => {
        it("no package", (done: MochaDone) => {
            verifyPackageHistory(done, deploymentNameStaging, [])();
        });
        
        it("one package", (done: MochaDone) => {
            nixt()
                .stdout(Success.releaseFile(release1, appName, deploymentNameStaging))
                .run(Command.release(appName, release1, binaryVersion1))
                .end(verifyPackageHistory(done, deploymentNameStaging, [{ appVersion: binaryVersion3, label: "v1", rollout: rolloutFull }]));
        });
        
        it("multiple packages", (done: MochaDone) => {
            nixt()
                .stdout(Success.releaseFile(release1, appName, deploymentNameStaging))
                .run(Command.release(appName, release1, binaryVersion3))
                .end(() => {
                    nixt()
                        .stdout(Success.releaseFile(release2, appName, deploymentNameStaging))
                        .run(Command.release(appName, release2, binaryVersion1))
                        .end(verifyPackageHistory(done, deploymentNameStaging, [
                            { appVersion: binaryVersion3, label: "v1", rollout: rolloutFull }, 
                            { appVersion: binaryVersion1, label: "v2", rollout: rolloutFull }]))
                });
        });
    });
    
    describe("patch", () => {
        
        describe("label", () => {
            
            it("fails when deployment does not have a package", (done: MochaDone) => {
                var newDescription: string = "another_description";
                
                nixt()
                    .stderr(Error.deploymentNoReleases())
                    .run(Command.patch(appName, deploymentNameStaging, { description: newDescription }))
                    .end(done);
            });
            
            it("fails when label not found", (done: MochaDone) => {
                var newDescription: string = "another_description";
                
                nixt()
                    .stdout(Success.releaseFile(release1, appName, deploymentNameStaging))
                    .run(Command.release(appName, release1, binaryVersion1))
                    .end(() => {
                        nixt()
                            .stderr(Error.patchLabelNotFound())
                            .run(Command.patch(appName, deploymentNameStaging, { label: "v1000", description: newDescription }))
                            .end(done);
                    });
            });
            
            describe("defaults to latest package", () => {
                it("when there is only one package", (done: MochaDone) => {
                    var newDescription: string = "another_description";
                    
                    nixt()
                        .stdout(Success.releaseFile(release1, appName, deploymentNameStaging))
                        .run(Command.release(appName, release1, binaryVersion1))
                        .end(() => {
                            nixt()
                                .stdout(Success.patch(appName, deploymentNameStaging))
                                .run(Command.patch(appName, deploymentNameStaging, { description: newDescription }))
                                .end(verifyDeploymentPackageMatches(done, deploymentNameStaging, { appVersion: binaryVersion1, label: "v1", rollout: rolloutFull, description: newDescription }));
                        });
                });
                
                it("when there are multiple packages", (done: MochaDone) => {
                    var newDescription: string = "another_description";
                    
                    nixt()
                        .stdout(Success.releaseFile(release1, appName, deploymentNameStaging))
                        .run(Command.release(appName, release1, binaryVersion1))
                        .end(() => {
                            nixt()
                                .stdout(Success.releaseFile(release2, appName, deploymentNameStaging))
                                .run(Command.release(appName, release2, binaryVersion1))
                                .end(() => {
                                    nixt()
                                        .stdout(Success.patch(appName, deploymentNameStaging))
                                        .run(Command.patch(appName, deploymentNameStaging, { description: newDescription }))
                                        .end(verifyDeploymentPackageMatches(done, deploymentNameStaging, { appVersion: binaryVersion1, label: "v2", rollout: rolloutFull, description: newDescription }));
                                });
                        });
                });
        
                it("regardless of binary version", (done: MochaDone) => {
                    var newDescription: string = "another_description";
                    
                    nixt()
                        .stdout(Success.releaseFile(release1, appName, deploymentNameStaging))
                        .run(Command.release(appName, release1, binaryVersion3))
                        .end(() => {
                            nixt()
                                .stdout(Success.releaseFile(release2, appName, deploymentNameStaging))
                                .run(Command.release(appName, release2, binaryVersion1))
                                .end(() => {
                                    nixt()
                                        .stdout(Success.releaseFile(release3, appName, deploymentNameStaging))
                                        .run(Command.release(appName, release3, binaryVersion2))
                                        .end(() => {
                                            nixt()
                                                .stdout(Success.patch(appName, deploymentNameStaging))
                                                .run(Command.patch(appName, deploymentNameStaging, { description: newDescription }))
                                                .end(verifyDeploymentPackageMatches(done, deploymentNameStaging, { appVersion: binaryVersion2, label: "v3", rollout: rolloutFull, description: newDescription }));
                                        });
                                });
                        });
                });
            });
            
            describe("allows specifying a package", () => {
                var newDescription: string = "another_description";
                
                var packageHistory: CodePush.PackageInfo[];
                
                beforeEach((done: MochaDone) => {
                    packageHistory = [
                        { appVersion: binaryVersion3, label: "v1", rollout: rolloutFull },
                        { appVersion: binaryVersion1, label: "v2", rollout: rolloutFull },
                        { appVersion: binaryVersion2, label: "v3", rollout: rolloutFull }
                    ];
                    
                    nixt()
                        .stdout(Success.releaseFile(release1, appName, deploymentNameStaging))
                        .run(Command.release(appName, release1, binaryVersion3))
                        .end(() => {
                            nixt()
                                .stdout(Success.releaseFile(release2, appName, deploymentNameStaging))
                                .run(Command.release(appName, release2, binaryVersion1))
                                .end(() => {
                                    nixt()
                                        .stdout(Success.releaseFile(release3, appName, deploymentNameStaging))
                                        .run(Command.release(appName, release3, binaryVersion2))
                                        .end(done);
                                });
                        });
                });
                
                it("that is first", (done: MochaDone) => {
                    packageHistory[0].description = newDescription;
                    
                    nixt()
                        .stdout(Success.patch(appName, deploymentNameStaging, "v1"))
                        .run(Command.patch(appName, deploymentNameStaging, { label: "v1", description: newDescription }))
                        .end(verifyPackageHistory(done, deploymentNameStaging, packageHistory));
                });
                
                it("that is in the middle", (done: MochaDone) => {
                    packageHistory[1].description = newDescription;
                    
                    nixt()
                        .stdout(Success.patch(appName, deploymentNameStaging, "v2"))
                        .run(Command.patch(appName, deploymentNameStaging, { label: "v2", description: newDescription }))
                        .end(verifyPackageHistory(done, deploymentNameStaging, packageHistory));
                });
                
                it("that is last", (done: MochaDone) => {
                    packageHistory[2].description = newDescription;
                    
                    nixt()
                        .stdout(Success.patch(appName, deploymentNameStaging, "v3"))
                        .run(Command.patch(appName, deploymentNameStaging, { label: "v3", description: newDescription }))
                        .end(verifyPackageHistory(done, deploymentNameStaging, packageHistory));
                });
            });
        });
        
        describe("disabled", () => {
            var packageInfo: CodePush.PackageInfo;
            
            beforeEach((done: MochaDone) => {
                packageInfo = { appVersion: binaryVersion1, label: "v1", rollout: rolloutFull };
                
                nixt()
                    .stdout(Success.releaseFile(release1, appName, deploymentNameStaging))
                    .run(Command.release(appName, release1, binaryVersion1))
                    .end(done);
            });
            
            it("succeeds", (done: MochaDone) => {
                packageInfo.isDisabled = true;
                
                nixt()
                    .stdout(Success.patch(appName, deploymentNameStaging))
                    .run(Command.patch(appName, deploymentNameStaging, { disabled: true }))
                    .end(verifyDeploymentPackageMatches(done, deploymentNameStaging, packageInfo));
            });
            
            it("fails on invalid boolean", (done: MochaDone) => {
                nixt()
                    .stderr(Error.patchUsage())
                    .run(Command.patch(appName, deploymentNameStaging, <any>{ disabled: "not_a_boolean" }))
                    .end(verifyDeploymentPackageMatches(done, deploymentNameStaging, packageInfo));
            });
        });
        
        describe("mandatory", () => {
            var packageInfo: CodePush.PackageInfo;
            
            beforeEach((done: MochaDone) => {
                packageInfo = { appVersion: binaryVersion1, label: "v1", rollout: rolloutFull };
                
                nixt()
                    .stdout(Success.releaseFile(release1, appName, deploymentNameStaging))
                    .run(Command.release(appName, release1, binaryVersion1))
                    .end(done);
            });
            
            it("succeeds", (done: MochaDone) => {
                packageInfo.isMandatory = true;
                
                nixt()
                    .stdout(Success.patch(appName, deploymentNameStaging))
                    .run(Command.patch(appName, deploymentNameStaging, { mandatory: true }))
                    .end(verifyDeploymentPackageMatches(done, deploymentNameStaging, packageInfo));
            });
            
            it("fails on invalid boolean", (done: MochaDone) => {
                nixt()
                    .stderr(Error.patchUsage())
                    .run(Command.patch(appName, deploymentNameStaging, <any>{ mandatory: "not_a_boolean" }))
                    .end(verifyDeploymentPackageMatches(done, deploymentNameStaging, packageInfo));
            });
        });
        
        describe("rollout", () => {
            it("fails against full rollout", (done: MochaDone) => {
                nixt()
                    .stdout(Success.releaseFile(release1, appName, deploymentNameStaging))
                    .run(Command.release(appName, release1, binaryVersion1))
                    .end(() => {
                        nixt()
                            .stderr(Error.rolloutAgainstFull())
                            .run(Command.patch(appName, deploymentNameStaging, { rollout: rolloutPartial }))
                            .end(done);
                    });
            });
            
            it("fails on invalid input", (done: MochaDone) => {
                nixt()
                    .stdout(Success.releaseFile(release1, appName, deploymentNameStaging))
                    .run(Command.release(appName, release1, binaryVersion1, { rollout: rolloutPartial }))
                    .end(() => {
                        nixt()
                            .stderr(Error.patchUsage())
                            .run(Command.patch(appName, deploymentNameStaging, { rollout: 0 }))
                            .end(() => {
                                nixt()
                                    .stderr(Error.patchUsage())
                                    .run(Command.patch(appName, deploymentNameStaging, { rollout: -50 }))
                                    .end(() => {
                                        nixt()
                                            .stderr(Error.patchUsage())
                                            .run(Command.patch(appName, deploymentNameStaging, { rollout: 150 }))
                                            .end(done);
                                    });
                            });
                    });
            });
            
            it("cannot decrease", (done: MochaDone) => {
                nixt()
                    .stdout(Success.releaseFile(release1, appName, deploymentNameStaging))
                    .run(Command.release(appName, release1, binaryVersion1, { rollout: rolloutPartial }))
                    .end(() => {
                        nixt()
                            .stderr(Error.rolloutDecreasing(rolloutPartial))
                            .run(Command.patch(appName, deploymentNameStaging, { rollout: rolloutPartial - 1 }))
                            .end(done);
                    });
            });
            
            it("can increase", (done: MochaDone) => {
                var increasedRollOut: number = 75;
                
                nixt()
                    .stdout(Success.releaseFile(release1, appName, deploymentNameStaging))
                    .run(Command.release(appName, release1, binaryVersion1, { rollout: rolloutPartial }))
                    .end(() => {
                        nixt()
                            .stderr(Success.patch(appName, deploymentNameStaging))
                            .run(Command.patch(appName, deploymentNameStaging, { rollout: increasedRollOut }))
                            .end(verifyDeploymentPackageMatches(done, deploymentNameStaging, { appVersion: binaryVersion1, label: "v1", rollout: increasedRollOut }, releaseMethodUpload));
                    });
            });
            
            it("can increase to full", (done: MochaDone) => {
                nixt()
                    .stdout(Success.releaseFile(release1, appName, deploymentNameStaging))
                    .run(Command.release(appName, release1, binaryVersion1, { rollout: rolloutPartial }))
                    .end(() => {
                        nixt()
                            .stderr(Success.patch(appName, deploymentNameStaging))
                            .run(Command.patch(appName, deploymentNameStaging, { rollout: rolloutFull }))
                            .end(verifyDeploymentPackageMatches(done, deploymentNameStaging, { appVersion: binaryVersion1, label: "v1", rollout: rolloutFull }, releaseMethodUpload));
                    });
            });
        });
        
        describe("target binary version", () => {
            var packageInfo: CodePush.PackageInfo;
            
            beforeEach((done: MochaDone) => {
                packageInfo = { appVersion: binaryVersion1, label: "v1", rollout: rolloutFull };
                
                nixt()
                    .stdout(Success.releaseFile(release1, appName, deploymentNameStaging))
                    .run(Command.release(appName, release1, binaryVersion1))
                    .end(done);
            });
            
            it("succeeds", (done: MochaDone) => {
                packageInfo.appVersion = "5.0.0";
                
                nixt()
                    .stdout(Success.patch(appName, deploymentNameStaging))
                    .run(Command.patch(appName, deploymentNameStaging, { targetBinaryVersion: packageInfo.appVersion }))
                    .end(verifyDeploymentPackageMatches(done, deploymentNameStaging, packageInfo));
            });
            
            it("fails on invalid semver", (done: MochaDone) => {
                nixt()
                    .stderr(Error.patchUsage())
                    .run(Command.patch(appName, deploymentNameStaging, { targetBinaryVersion: "not_valid_semver" }))
                    .end(verifyDeploymentPackageMatches(done, deploymentNameStaging, packageInfo));
            });
        });
        
        it("requires at least one option besides label to be specified", (done: MochaDone) => {
            nixt()
                .stderr(Error.patchNoneSpecified())
                .run(Command.patch(appName, deploymentNameStaging, { label: "v1" }))
                .end(done);
        });
    });
    
    describe("promote", () => {
        
        describe("accepts", () => {
            beforeEach((done: MochaDone) => {
                nixt()
                    .stdout(Success.releaseFile(release1, appName, deploymentNameStaging))
                    .run(Command.release(appName, release1, binaryVersion1))
                    .end(done);
            });
            
            it("promoting to new deployment", (done: MochaDone) => {
                var newDeploymentName: string = makeRandomString();
                nixt()
                    .stdout(Success.deploymentAdd(appName, newDeploymentName))
                    .run(Command.deploymentAdd(appName, newDeploymentName))
                    .end(() => {
                        nixt()
                            .stdout(Success.promote(appName, deploymentNameStaging, newDeploymentName))
                            .run(Command.promote(appName, deploymentNameStaging, newDeploymentName))
                            .end(verifyDeploymentPackageMatches(done, newDeploymentName, { appVersion: binaryVersion1, label: "v1", rollout: rolloutFull }, releaseMethodPromote));
                    });
            });
            
            it("promoting to a deployment with another package on the same binary version", (done: MochaDone) => {
                nixt()
                    .stdout(Success.releaseFile(release2, appName, deploymentNameProduction))
                    .run(Command.release(appName, release2, binaryVersion1, { deploymentName: deploymentNameProduction }))
                    .end(() => {
                        nixt()
                            .stdout(Success.promote(appName, deploymentNameStaging, deploymentNameProduction))
                            .run(Command.promote(appName, deploymentNameStaging, deploymentNameProduction))
                            .end(verifyDeploymentPackageMatches(done, deploymentNameProduction, { appVersion: binaryVersion1, label: "v2", rollout: rolloutFull }, releaseMethodPromote))
                    });
            });
            
            it("releases to a deployment with another package on a different binary version", (done: MochaDone) => {
                nixt()
                    .stdout(Success.releaseFile(release2, appName, deploymentNameProduction))
                    .run(Command.release(appName, release2, binaryVersion2, { deploymentName: deploymentNameProduction }))
                    .end(() => {
                        nixt()
                            .stdout(Success.promote(appName, deploymentNameStaging, deploymentNameProduction))
                            .run(Command.promote(appName, deploymentNameStaging, deploymentNameProduction))
                            .end(verifyDeploymentPackageMatches(done, deploymentNameProduction, { appVersion: binaryVersion1, label: "v2", rollout: rolloutFull }, releaseMethodPromote))
                    });
            });
            
            it("releases to a deployment with an identical package on a different binary version", (done: MochaDone) => {
                nixt()
                    .stdout(Success.releaseFile(release1, appName, deploymentNameProduction))
                    .run(Command.release(appName, release1, binaryVersion2, { deploymentName: deploymentNameProduction }))
                    .end(() => {
                        nixt()
                            .stdout(Success.promote(appName, deploymentNameStaging, deploymentNameProduction))
                            .run(Command.promote(appName, deploymentNameStaging, deploymentNameProduction))
                            .end(verifyDeploymentPackageMatches(done, deploymentNameProduction, { appVersion: binaryVersion1, label: "v2", rollout: rolloutFull }, releaseMethodPromote))
                    });
            });
            
            it("specifying description, disabled, and mandatory", (done: MochaDone) => {
                var description: string = "this_is_a_description";
                var isDisabled: boolean = true;
                var isMandatory: boolean = true;
                
                nixt()
                    .stdout(Success.promote(appName, deploymentNameStaging, deploymentNameProduction))
                    .run(Command.promote(appName, deploymentNameStaging, deploymentNameProduction, { description: description, disabled: isDisabled, mandatory: isMandatory }))
                    .end(verifyDeploymentPackageMatches(done, deploymentNameProduction, { appVersion: binaryVersion1, label: "v1", rollout: rolloutFull, description: description, isDisabled: isDisabled, isMandatory: isMandatory }, releaseMethodPromote))
            });
            
            describe("rollout", () => {
                it("against deployment with no packages", (done: MochaDone) => {
                    nixt()
                        .stdout(Success.promote(appName, deploymentNameStaging, deploymentNameProduction))
                        .run(Command.promote(appName, deploymentNameStaging, deploymentNameProduction, { rollout: rolloutPartial }))
                        .end(verifyDeploymentPackageMatches(done, deploymentNameProduction, { appVersion: binaryVersion1, label: "v1", rollout: rolloutPartial }, releaseMethodPromote));
                });
                
                it("against deployment with a full rollout on same binary version", (done: MochaDone) => {
                    nixt()
                        .stdout(Success.releaseFile(release2, appName, deploymentNameProduction))
                        .run(Command.release(appName, release2, binaryVersion1, { deploymentName: deploymentNameProduction }))
                        .end(() => {
                            nixt()
                                .stdout(Success.promote(appName, deploymentNameStaging, deploymentNameProduction))
                                .run(Command.promote(appName, deploymentNameStaging, deploymentNameProduction, { rollout: rolloutPartial }))
                                .end(verifyDeploymentPackageMatches(done, deploymentNameProduction, { appVersion: binaryVersion1, label: "v2", rollout: rolloutPartial }, releaseMethodPromote));
                        });
                });
                
                it("against deployment with a full rollout on a different binary version", (done: MochaDone) => {
                    nixt()
                        .stdout(Success.releaseFile(release2, appName, deploymentNameProduction))
                        .run(Command.release(appName, release2, binaryVersion2, { deploymentName: deploymentNameProduction }))
                        .end(() => {
                            nixt()
                                .stdout(Success.promote(appName, deploymentNameStaging, deploymentNameProduction))
                                .run(Command.promote(appName, deploymentNameStaging, deploymentNameProduction, { rollout: rolloutPartial }))
                                .end(verifyDeploymentPackageMatches(done, deploymentNameProduction, { appVersion: binaryVersion1, label: "v2", rollout: rolloutPartial }, releaseMethodPromote));
                        });
                });
                
                it("full against a deployment with a disabled partial rollout", (done: MochaDone) => {
                    nixt()
                        .stdout(Success.releaseFile(release2, appName, deploymentNameProduction))
                        .run(Command.release(appName, release2, binaryVersion1, { deploymentName: deploymentNameProduction, rollout: rolloutPartial, disabled: true }))
                        .end(() => {
                            nixt()
                                .stdout(Success.promote(appName, deploymentNameStaging, deploymentNameProduction))
                                .run(Command.promote(appName, deploymentNameStaging, deploymentNameProduction))
                                .end(verifyDeploymentPackageMatches(done, deploymentNameProduction, { appVersion: binaryVersion1, label: "v2", rollout: rolloutFull }, releaseMethodPromote));
                        });
                });
                
                it("partial against a deployment with a disabled partial rollout", (done: MochaDone) => {
                    nixt()
                        .stdout(Success.releaseFile(release2, appName, deploymentNameProduction))
                        .run(Command.release(appName, release2, binaryVersion1, { deploymentName: deploymentNameProduction, rollout: rolloutPartial, disabled: true }))
                        .end(() => {
                            nixt()
                                .stdout(Success.promote(appName, deploymentNameStaging, deploymentNameProduction))
                                .run(Command.promote(appName, deploymentNameStaging, deploymentNameProduction, { rollout: rolloutPartial }))
                                .end(verifyDeploymentPackageMatches(done, deploymentNameProduction, { appVersion: binaryVersion1, label: "v2", rollout: rolloutPartial }, releaseMethodPromote));
                        });
                });
            });
        });
        
        describe("rejects", () => {
            beforeEach((done: MochaDone) => {
                nixt()
                    .stdout(Success.releaseFile(release1, appName, deploymentNameStaging))
                    .run(Command.release(appName, release1, binaryVersion1, { rollout: rolloutPartial}))
                    .end(done);
            });
            
            describe("when a partial rollout is the last package", () => {
                it("of the same binary version", (done: MochaDone) => {
                    nixt()
                        .stdout(Success.releaseFile(release1, appName, deploymentNameProduction))
                        .run(Command.release(appName, release1, binaryVersion1, { rollout: rolloutPartial}))
                        .end(() => {
                            nixt()
                                .stderr(Error.releaseRollbackInProgress())
                                .run(Command.promote(appName, deploymentNameStaging, deploymentNameProduction, { rollout: rolloutPartial }))
                                .end(verifyDeploymentPackageMatches(done, deploymentNameProduction, { appVersion: binaryVersion1, label: "v1", rollout: rolloutPartial }, releaseMethodPromote));
                        });
                });
                
                it("of a different binary version", (done: MochaDone) => {
                    nixt()
                        .stdout(Success.releaseFile(release1, appName, deploymentNameStaging))
                        .run(Command.release(appName, release1, binaryVersion1, { rollout: rolloutPartial}))
                        .end(() => {
                            nixt()
                                .stderr(Error.releaseRollbackInProgress())
                                .run(Command.promote(appName, deploymentNameStaging, deploymentNameProduction, { rollout: rolloutPartial }))
                                .end(verifyDeploymentPackageMatches(done, deploymentNameProduction, { appVersion: binaryVersion1, label: "v1", rollout: rolloutPartial }, releaseMethodPromote));
                        });
                });
            });
        });
        
        describe("label", () => {
            it("fails when deployment does not have a package", (done: MochaDone) => {
                var newDescription: string = "another_description";
                
                nixt()
                    .stderr(Error.promoteNoReleases())
                    .run(Command.promote(appName, deploymentNameStaging, deploymentNameProduction, { description: newDescription }))
                    .end(done);
            });
            
            describe("defaults to latest package", () => {
                it("when there is only one package", (done: MochaDone) => {
                    var newDescription: string = "another_description";
                    
                    nixt()
                        .stdout(Success.releaseFile(release1, appName, deploymentNameStaging))
                        .run(Command.release(appName, release1, binaryVersion1))
                        .end(() => {
                            nixt()
                                .stdout(Success.promote(appName, deploymentNameStaging, deploymentNameProduction))
                                .run(Command.promote(appName, deploymentNameStaging, deploymentNameProduction, { description: newDescription }))
                                .end(verifyDeploymentPackageMatches(done, deploymentNameProduction, { appVersion: binaryVersion1, label: "v1", rollout: rolloutFull, description: newDescription }));
                        });
                });
                
                it("when there are multiple packages", (done: MochaDone) => {
                    var newDescription: string = "another_description";
                    
                    nixt()
                        .stdout(Success.releaseFile(release1, appName, deploymentNameStaging))
                        .run(Command.release(appName, release1, binaryVersion1))
                        .end(() => {
                            nixt()
                                .stdout(Success.releaseFile(release2, appName, deploymentNameStaging))
                                .run(Command.release(appName, release2, binaryVersion1))
                                .end(() => {
                                    nixt()
                                        .stdout(Success.promote(appName, deploymentNameStaging, deploymentNameProduction))
                                        .run(Command.promote(appName, deploymentNameStaging, deploymentNameProduction, { description: newDescription }))
                                        .end(verifyDeploymentPackageMatches(done, deploymentNameProduction, { appVersion: binaryVersion1, label: "v1", rollout: rolloutFull, description: newDescription }));
                                });
                        });
                });
        
                it("regardless of binary version", (done: MochaDone) => {
                    var newDescription: string = "another_description";
                    
                    nixt()
                        .stdout(Success.releaseFile(release1, appName, deploymentNameStaging))
                        .run(Command.release(appName, release1, binaryVersion3))
                        .end(() => {
                            nixt()
                                .stdout(Success.releaseFile(release2, appName, deploymentNameStaging))
                                .run(Command.release(appName, release2, binaryVersion1))
                                .end(() => {
                                    nixt()
                                        .stdout(Success.releaseFile(release3, appName, deploymentNameStaging))
                                        .run(Command.release(appName, release3, binaryVersion2))
                                        .end(() => {
                                            nixt()
                                                .stdout(Success.promote(appName, deploymentNameStaging, deploymentNameProduction))
                                                .run(Command.promote(appName, deploymentNameStaging, deploymentNameProduction, { description: newDescription }))
                                                .end(verifyDeploymentPackageMatches(done, deploymentNameProduction, { appVersion: binaryVersion2, label: "v1", rollout: rolloutFull, description: newDescription }));
                                        });
                                });
                        });
                });
            });
        });
        
        describe("disabled", () => {
            var packageInfo: CodePush.PackageInfo;
            
            beforeEach((done: MochaDone) => {
                packageInfo = { appVersion: binaryVersion1, label: "v1", rollout: rolloutFull };
                
                nixt()
                    .stdout(Success.releaseFile(release1, appName, deploymentNameStaging))
                    .run(Command.release(appName, release1, binaryVersion1))
                    .end(done);
            });
            
            it("succeeds", (done: MochaDone) => {
                packageInfo.isDisabled = true;
                
                nixt()
                    .stdout(Success.promote(appName, deploymentNameStaging, deploymentNameProduction))
                    .run(Command.promote(appName, deploymentNameStaging, deploymentNameProduction, { disabled: true }))
                    .end(verifyDeploymentPackageMatches(done, deploymentNameProduction, packageInfo));
            });
            
            it("fails on invalid boolean", (done: MochaDone) => {
                nixt()
                    .stderr(Error.promoteUsage())
                    .run(Command.promote(appName, deploymentNameStaging, deploymentNameProduction, <any>{ disabled: "not_a_boolean" }))
                    .end(verifyDeploymentNoPackage(done, deploymentNameProduction));
            });
        });
        
        describe("mandatory", () => {
            var packageInfo: CodePush.PackageInfo;
            
            beforeEach((done: MochaDone) => {
                packageInfo = { appVersion: binaryVersion1, label: "v1", rollout: rolloutFull };
                
                nixt()
                    .stdout(Success.releaseFile(release1, appName, deploymentNameStaging))
                    .run(Command.release(appName, release1, binaryVersion1))
                    .end(done);
            });
            
            it("succeeds", (done: MochaDone) => {
                packageInfo.isMandatory = true;
                
                nixt()
                    .stdout(Success.promote(appName, deploymentNameStaging, deploymentNameProduction))
                    .run(Command.promote(appName, deploymentNameStaging, deploymentNameProduction, { mandatory: true }))
                    .end(verifyDeploymentPackageMatches(done, deploymentNameProduction, packageInfo));
            });
            
            it("fails on invalid boolean", (done: MochaDone) => {
                nixt()
                    .stderr(Error.promoteUsage())
                    .run(Command.promote(appName, deploymentNameStaging, deploymentNameProduction, <any>{ mandatory: "not_a_boolean" }))
                    .end(verifyDeploymentNoPackage(done, deploymentNameProduction));
            });
        });
        
        describe("rollout", () => {
            it("succeeds when promoting full rollout to partial rollout", (done: MochaDone) => {
                nixt()
                    .stdout(Success.releaseFile(release1, appName, deploymentNameStaging))
                    .run(Command.release(appName, release1, binaryVersion1))
                    .end(() => {
                        nixt()
                            .stdout(Success.promote(appName, deploymentNameStaging, deploymentNameProduction))
                            .run(Command.promote(appName, deploymentNameStaging, deploymentNameProduction, { rollout: rolloutPartial }))
                            .end(done);
                    });
            });
            
            it("fails on invalid input", (done: MochaDone) => {
                nixt()
                    .stdout(Success.releaseFile(release1, appName, deploymentNameStaging))
                    .run(Command.release(appName, release1, binaryVersion1, { rollout: rolloutPartial }))
                    .end(() => {
                        nixt()
                            .stderr(Error.promoteUsage())
                            .run(Command.promote(appName, deploymentNameStaging, deploymentNameProduction, { rollout: 0 }))
                            .end(() => {
                                nixt()
                                    .stderr(Error.promoteUsage())
                                    .run(Command.promote(appName, deploymentNameStaging, deploymentNameProduction, { rollout: -50 }))
                                    .end(() => {
                                        nixt()
                                            .stderr(Error.promoteUsage())
                                            .run(Command.promote(appName, deploymentNameStaging, deploymentNameProduction, { rollout: 150 }))
                                            .end(done);
                                    });
                            });
                    });
            });
        });
        
        describe("target binary version", () => {
            var packageInfo: CodePush.PackageInfo;
            
            beforeEach((done: MochaDone) => {
                packageInfo = { appVersion: binaryVersion1, label: "v1", rollout: rolloutFull };
                
                nixt()
                    .stdout(Success.releaseFile(release1, appName, deploymentNameStaging))
                    .run(Command.release(appName, release1, binaryVersion1))
                    .end(done);
            });
            
            it("succeeds", (done: MochaDone) => {
                packageInfo.appVersion = "5.0.0";
                
                nixt()
                    .stdout(Success.promote(appName, deploymentNameStaging, deploymentNameProduction))
                    .run(Command.promote(appName, deploymentNameStaging, deploymentNameProduction, { targetBinaryVersion: packageInfo.appVersion }))
                    .end(verifyDeploymentPackageMatches(done, deploymentNameProduction, packageInfo));
            });
            
            it("fails on invalid semver", (done: MochaDone) => {
                nixt()
                    .stderr(Error.promoteUsage())
                    .run(Command.promote(appName, deploymentNameStaging, deploymentNameProduction, { targetBinaryVersion: "not_valid_semver" }))
                    .end(verifyDeploymentNoPackage(done, deploymentNameProduction));
            });
        });
    });
    
    describe("rollback", () => {
        
        it("fails when deployment does not have a package", (done: MochaDone) => {
            nixt()
                .stderr(Error.rollbackNoReleases())
                .run(Command.rollback(appName, deploymentNameStaging))
                .on(Command.PROMPT_ARE_YOU_SURE).respond(Command.RESPONSE_ACCEPT)
                .end(done);
        });
        
        it("fails with only one package", (done: MochaDone) => {
            nixt()
                .stdout(Success.releaseFile(release1, appName, deploymentNameStaging))
                .run(Command.release(appName, release1, binaryVersion1))
                .end(() => {
                    nixt()
                        .stderr(Error.rollbackNoPriorReleases())
                        .run(Command.rollback(appName, deploymentNameStaging))
                        .on(Command.PROMPT_ARE_YOU_SURE).respond(Command.RESPONSE_ACCEPT)
                        .end(done);
                });
        });
        
        it("fails when targeting last package", (done: MochaDone) => {
            var latestRelease: string = "v1";
            
            nixt()
                .stdout(Success.releaseFile(release1, appName, deploymentNameStaging))
                .run(Command.release(appName, release1, binaryVersion1))
                .end(() => {
                    nixt()
                        .stderr(Error.rollbackAlreadyLatest(latestRelease))
                        .run(Command.rollback(appName, deploymentNameStaging, { targetRelease: latestRelease }))
                        .on(Command.PROMPT_ARE_YOU_SURE).respond(Command.RESPONSE_ACCEPT)
                        .end(done);
                });
        });
        
        it("fails when label not found", (done: MochaDone) => {
            var fakeLabel: string = "v1000";
            
            nixt()
                .stdout(Success.releaseFile(release1, appName, deploymentNameStaging))
                .run(Command.release(appName, release1, binaryVersion1))
                .end(() => {
                    nixt()
                        .stderr(Error.rollbackLabelNotFound(fakeLabel))
                        .run(Command.rollback(appName, deploymentNameStaging, { targetRelease: fakeLabel }))
                        .on(Command.PROMPT_ARE_YOU_SURE).respond(Command.RESPONSE_ACCEPT)
                        .end(done);
                });
        });
        
        describe("defaults to the second latest package", () => {
            
            it("when there are only two packages", (done: MochaDone) => {
                var markerDescription: string = "rollback_to_me!";
                
                nixt()
                    .stdout(Success.releaseFile(release1, appName, deploymentNameStaging))
                    .run(Command.release(appName, release1, binaryVersion1, { description: markerDescription }))
                    .end(() => {
                        nixt()
                            .stdout(Success.releaseFile(release2, appName, deploymentNameStaging))
                            .run(Command.release(appName, release2, binaryVersion1))
                            .end(() => {
                                nixt()
                                    .stdout(Success.rollback(appName, deploymentNameStaging))
                                    .run(Command.rollback(appName, deploymentNameStaging))
                                    .on(Command.PROMPT_ARE_YOU_SURE).respond(Command.RESPONSE_ACCEPT)
                                    .end(verifyDeploymentPackageMatches(done, deploymentNameStaging, { appVersion: binaryVersion1, label: "v3", description: markerDescription }, releaseMethodRollback));
                            });
                    });
            });
            
            it("when there are at least 3 packages", (done: MochaDone) => {
                var markerDescription: string = "rollback_to_me!";
                
                nixt()
                    .stdout(Success.releaseFile(release1, appName, deploymentNameStaging))
                    .run(Command.release(appName, release1, binaryVersion1))
                    .end(() => {
                        nixt()
                            .stdout(Success.releaseFile(release2, appName, deploymentNameStaging))
                            .run(Command.release(appName, release2, binaryVersion1, { description: markerDescription }))
                            .end(() => {
                                nixt()
                                    .stdout(Success.releaseFile(release3, appName, deploymentNameStaging))
                                    .run(Command.release(appName, release3, binaryVersion1))
                                    .end(() => {
                                        nixt()
                                            .stdout(Success.rollback(appName, deploymentNameStaging))
                                            .run(Command.rollback(appName, deploymentNameStaging))
                                            .on(Command.PROMPT_ARE_YOU_SURE).respond(Command.RESPONSE_ACCEPT)
                                            .end(verifyDeploymentPackageMatches(done, deploymentNameStaging, { appVersion: binaryVersion1, label: "v4", description: markerDescription }));
                                    });
                            });
                    });
            });
        });
            
        it("carries over data from target release", (done: MochaDone) => {
            var description: string = "rollback_to_me!";
            var disabled: boolean = true;
            var mandatory: boolean = true;
            
            nixt()
                .stdout(Success.releaseFile(release1, appName, deploymentNameStaging))
                .run(Command.release(appName, release1, binaryVersion1, { description: description, disabled: disabled, mandatory: mandatory }))
                .end(() => {
                    nixt()
                        .stdout(Success.releaseFile(release2, appName, deploymentNameStaging))
                        .run(Command.release(appName, release2, binaryVersion1))
                        .end(() => {
                            nixt()
                                .stdout(Success.rollback(appName, deploymentNameStaging))
                                .run(Command.rollback(appName, deploymentNameStaging))
                                .on(Command.PROMPT_ARE_YOU_SURE).respond(Command.RESPONSE_ACCEPT)
                                .end(verifyDeploymentPackageMatches(done, deploymentNameStaging, { appVersion: binaryVersion1, label: "v3", description: description, isDisabled: disabled, isMandatory: mandatory }, releaseMethodRollback));
                        });
                });
        });
        
        describe("allows specifying a package", () => {
            var newDescription: string = "another_description";
            
            var packageHistory: CodePush.PackageInfo[];
            
            beforeEach((done: MochaDone) => {
                packageHistory = [
                    { appVersion: binaryVersion3, label: "v1", rollout: rolloutFull },
                    { appVersion: binaryVersion1, label: "v2", rollout: rolloutFull },
                    { appVersion: binaryVersion2, label: "v3", rollout: rolloutFull }
                ];
                
                nixt()
                    .stdout(Success.releaseFile(release1, appName, deploymentNameStaging))
                    .run(Command.release(appName, release1, binaryVersion3))
                    .end(() => {
                        nixt()
                            .stdout(Success.releaseFile(release2, appName, deploymentNameStaging))
                            .run(Command.release(appName, release2, binaryVersion1))
                            .end(() => {
                                nixt()
                                    .stdout(Success.releaseFile(release3, appName, deploymentNameStaging))
                                    .run(Command.release(appName, release3, binaryVersion2))
                                    .end(done);
                            });
                    });
            });
            
            it("that is first", (done: MochaDone) => {
                packageHistory.push({ appVersion: binaryVersion3, label: "v4", rollout: rolloutFull });
                
                nixt()
                    .stdout(Success.rollback(appName, deploymentNameStaging))
                    .run(Command.rollback(appName, deploymentNameStaging, { targetRelease: "v1" }))
                    .on(Command.PROMPT_ARE_YOU_SURE).respond(Command.RESPONSE_ACCEPT)
                    .end(verifyPackageHistory(done, deploymentNameStaging, packageHistory));
            });
            
            it("that is in the middle", (done: MochaDone) => {
                packageHistory.push({ appVersion: binaryVersion1, label: "v4", rollout: rolloutFull });
                
                nixt()
                    .stdout(Success.rollback(appName, deploymentNameStaging))
                    .run(Command.rollback(appName, deploymentNameStaging, { targetRelease: "v2" }))
                    .on(Command.PROMPT_ARE_YOU_SURE).respond(Command.RESPONSE_ACCEPT)
                    .end(verifyPackageHistory(done, deploymentNameStaging, packageHistory));
            });
        });
    });
}
