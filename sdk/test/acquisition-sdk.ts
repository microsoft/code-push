/// <reference path="../definitions/harness.d.ts" />

import * as assert from "assert";
import * as express from "express";
import * as http from "http";

import * as acquisitionSdk from "../script/acquisition-sdk";
import * as mockApi from "./acquisition-rest-mock";
import * as rest from "rest-definitions";

var latestPackage: rest.UpdateCheckResponse = clone(mockApi.latestPackage);

var configuration: acquisitionSdk.Configuration = {
    appVersion: "1.5.0",
    clientUniqueId: "My iPhone",
    deploymentKey: mockApi.validDeploymentKey,
    serverUrl: mockApi.serverUrl,
}

var templateCurrentPackage: acquisitionSdk.Package = {
    deploymentKey: mockApi.validDeploymentKey,
    description: "sdfsdf",
    label: "v1",
    appVersion: latestPackage.appVersion,
    packageHash: "hash001",
    isMandatory: false,
    packageSize: 100
};

var scriptUpdateResult: acquisitionSdk.RemotePackage = {
    deploymentKey: mockApi.validDeploymentKey,
    description: latestPackage.description,
    downloadUrl: latestPackage.downloadURL,
    label: latestPackage.label,
    appVersion: latestPackage.appVersion,
    isMandatory: latestPackage.isMandatory,
    packageHash: latestPackage.packageHash,
    packageSize: latestPackage.packageSize
};

var nativeUpdateResult: acquisitionSdk.NativeUpdateNotification = {
    updateAppVersion: true,
    appVersion: latestPackage.appVersion
};

describe("Acquisition SDK", () => {
    beforeEach(() => {
        mockApi.latestPackage = clone(latestPackage);
    });

    it("Package with lower label and different package hash gives update", (done: MochaDone) => {
        var acquisition = new acquisitionSdk.AcquisitionManager(new mockApi.HttpRequester(), configuration);
        acquisition.queryUpdateWithCurrentPackage(templateCurrentPackage, (error: Error, returnPackage: acquisitionSdk.RemotePackage | acquisitionSdk.NativeUpdateNotification) => {
            assert.equal(null, error);
            assert.deepEqual(scriptUpdateResult, returnPackage);
            done();
        });
    });

    it("Package with equal package hash gives no update", (done: MochaDone) => {
        var equalVersionPackage: acquisitionSdk.Package = clone(templateCurrentPackage);
        equalVersionPackage.packageHash = latestPackage.packageHash;

        var acquisition = new acquisitionSdk.AcquisitionManager(new mockApi.HttpRequester(), configuration);
        acquisition.queryUpdateWithCurrentPackage(equalVersionPackage, (error: Error, returnPackage: acquisitionSdk.RemotePackage | acquisitionSdk.NativeUpdateNotification) => {
            assert.equal(null, error);
            assert.equal(null, returnPackage);
            done();
        });
    });

    it("Package with higher different hash and higher label version gives update", (done: MochaDone) => {
        var higherVersionPackage: acquisitionSdk.Package = clone(templateCurrentPackage);
        higherVersionPackage.packageHash = "hash990";

        var acquisition = new acquisitionSdk.AcquisitionManager(new mockApi.HttpRequester(), configuration);
        acquisition.queryUpdateWithCurrentPackage(higherVersionPackage, (error: Error, returnPackage: acquisitionSdk.RemotePackage | acquisitionSdk.NativeUpdateNotification) => {
            assert.equal(null, error);
            assert.deepEqual(scriptUpdateResult, returnPackage);
            done();
        });
    });

    it("Package with lower native version gives update notification", (done: MochaDone) => {
        var lowerAppVersionPackage: acquisitionSdk.Package = clone(templateCurrentPackage);
        lowerAppVersionPackage.appVersion = "0.0.1";

        var acquisition = new acquisitionSdk.AcquisitionManager(new mockApi.HttpRequester(), configuration);
        acquisition.queryUpdateWithCurrentPackage(lowerAppVersionPackage, (error: Error, returnPackage: acquisitionSdk.RemotePackage | acquisitionSdk.NativeUpdateNotification) => {
            assert.equal(null, error);
            assert.deepEqual(nativeUpdateResult, returnPackage);
            done();
        });
    });

    it("SDK forwards shouldRunBinaryVersion notification", (done: MochaDone) => {
        mockApi.latestPackage.shouldRunBinaryVersion = true;
        
        var acquisition = new acquisitionSdk.AcquisitionManager(new mockApi.HttpRequester(), configuration);
        acquisition.queryUpdateWithCurrentPackage(clone(templateCurrentPackage), (error: Error, returnPackage: acquisitionSdk.RemotePackage | acquisitionSdk.NativeUpdateNotification) => {
            assert.equal(null, error);
            assert.deepEqual({ shouldRunBinaryVersion: true }, returnPackage);
            done();
        });
    });

    it("Package with lower native version gives update notification together with shouldRunBinaryVersion notification", (done: MochaDone) => {
        mockApi.latestPackage.shouldRunBinaryVersion = true;
        var lowerAppVersionPackage: acquisitionSdk.Package = clone(templateCurrentPackage);
        lowerAppVersionPackage.appVersion = "0.0.1";

        var acquisition = new acquisitionSdk.AcquisitionManager(new mockApi.HttpRequester(), configuration);
        acquisition.queryUpdateWithCurrentPackage(lowerAppVersionPackage, (error: Error, returnPackage: acquisitionSdk.RemotePackage | acquisitionSdk.NativeUpdateNotification) => {
            assert.equal(null, error);
            assert.deepEqual(nativeUpdateResult, returnPackage);
            done();
        });
    });

    it("Package with higher native version gives no update", (done: MochaDone) => {
        var higherAppVersionPackage: acquisitionSdk.Package = clone(templateCurrentPackage);
        higherAppVersionPackage.appVersion = "9.9.0";

        var acquisition = new acquisitionSdk.AcquisitionManager(new mockApi.HttpRequester(), configuration);
        acquisition.queryUpdateWithCurrentPackage(higherAppVersionPackage, (error: Error, returnPackage: acquisitionSdk.RemotePackage | acquisitionSdk.NativeUpdateNotification) => {
            assert.equal(null, error);
            assert.deepEqual(null, returnPackage);
            done();
        });
    });

    it("An empty response gives no update", (done: MochaDone) => {
        var lowerAppVersionPackage: acquisitionSdk.Package = clone(templateCurrentPackage);
        lowerAppVersionPackage.appVersion = "0.0.1";

        var emptyReponse: acquisitionSdk.Http.Response = {
            statusCode: 200,
            body: JSON.stringify({})
        };

        var acquisition = new acquisitionSdk.AcquisitionManager(new mockApi.CustomResponseHttpRequester(emptyReponse), configuration);
        acquisition.queryUpdateWithCurrentPackage(lowerAppVersionPackage, (error: Error, returnPackage: acquisitionSdk.RemotePackage|acquisitionSdk.NativeUpdateNotification) => {
            assert.equal(null, error);
            done();
        });
    });

    it("An unexpected (but valid) JSON response gives no update", (done: MochaDone) => {
        var lowerAppVersionPackage: acquisitionSdk.Package = clone(templateCurrentPackage);
        lowerAppVersionPackage.appVersion = "0.0.1";

        var unexpectedResponse: acquisitionSdk.Http.Response = {
            statusCode: 200,
            body: JSON.stringify({ unexpected: "response" })
        };

        var acquisition = new acquisitionSdk.AcquisitionManager(new mockApi.CustomResponseHttpRequester(unexpectedResponse), configuration);
        acquisition.queryUpdateWithCurrentPackage(lowerAppVersionPackage, (error: Error, returnPackage: acquisitionSdk.RemotePackage|acquisitionSdk.NativeUpdateNotification) => {
            assert.equal(null, error);
            done();
        });
    });

    it("Package for companion app ignores high native version and gives update", (done: MochaDone) => {
        var higherAppVersionCompanionPackage: acquisitionSdk.Package = clone(templateCurrentPackage);
        higherAppVersionCompanionPackage.appVersion = "9.9.0";

        var companionAppConfiguration = clone(configuration);
        configuration.ignoreAppVersion = true;

        var acquisition = new acquisitionSdk.AcquisitionManager(new mockApi.HttpRequester(), configuration);
        acquisition.queryUpdateWithCurrentPackage(higherAppVersionCompanionPackage, (error: Error, returnPackage: acquisitionSdk.RemotePackage | acquisitionSdk.NativeUpdateNotification) => {
            assert.equal(null, error);
            assert.deepEqual(scriptUpdateResult, returnPackage);
            done();
        });
    });

    it("If latest package is mandatory, returned package is mandatory", (done: MochaDone) => {
        mockApi.latestPackage.isMandatory = true;

        var acquisition = new acquisitionSdk.AcquisitionManager(new mockApi.HttpRequester(), configuration);
        acquisition.queryUpdateWithCurrentPackage(templateCurrentPackage, (error: Error, returnPackage: acquisitionSdk.RemotePackage) => {
            assert.equal(null, error);
            assert.equal(true, returnPackage.isMandatory);
            done();
        });
    });

    it("If invalid arguments are provided, an error is raised", (done: MochaDone) => {
        var invalidPackage: acquisitionSdk.Package = clone(templateCurrentPackage);
        invalidPackage.appVersion = null;

        var acquisition = new acquisitionSdk.AcquisitionManager(new mockApi.HttpRequester(), configuration);
        try {
            acquisition.queryUpdateWithCurrentPackage(invalidPackage, (error: Error, returnPackage: acquisitionSdk.RemotePackage | acquisitionSdk.NativeUpdateNotification) => {
                assert.fail("Should throw an error if the native implementation gave an incorrect package");
                done();
            });
        } catch (error) {
            done();
        }
    });

    it("If an invalid JSON response is returned by the server, an error is raised", (done: MochaDone) => {
        var lowerAppVersionPackage: acquisitionSdk.Package = clone(templateCurrentPackage);
        lowerAppVersionPackage.appVersion = "0.0.1";

        var invalidJsonReponse: acquisitionSdk.Http.Response = {
            statusCode: 200,
            body: "invalid {{ json"
        };

        var acquisition = new acquisitionSdk.AcquisitionManager(new mockApi.CustomResponseHttpRequester(invalidJsonReponse), configuration);
        acquisition.queryUpdateWithCurrentPackage(lowerAppVersionPackage, (error: Error, returnPackage: acquisitionSdk.RemotePackage|acquisitionSdk.NativeUpdateNotification) => {
            assert.notEqual(null, error);
            done();
        });
    });

    it("If deploymentKey is not valid...", (done: MochaDone) => {
        // TODO: behaviour is not defined
        done();
    });

    it("reportStatusDeploy(...) signals completion", (done: MochaDone): void => {
        var acquisition = new acquisitionSdk.AcquisitionManager(new mockApi.HttpRequester(), configuration);

        acquisition.reportStatusDeploy(templateCurrentPackage, acquisitionSdk.AcquisitionStatus.DeploymentFailed, "1.5.0", mockApi.validDeploymentKey, ((error: Error, parameter: void): void => {
            if (error) {
                throw error;
            }

            assert.equal(parameter, /*expected*/ null);

            done();
        }));
    });
    
    it("reportStatusDownload(...) signals completion", (done: MochaDone): void => {
        var acquisition = new acquisitionSdk.AcquisitionManager(new mockApi.HttpRequester(), configuration);

        acquisition.reportStatusDownload(templateCurrentPackage, ((error: Error, parameter: void): void => {
            if (error) {
                throw error;
            }

            assert.equal(parameter, /*expected*/ null);

            done();
        }));
    });
});

function clone<T>(initialObject: T): T {
    return JSON.parse(JSON.stringify(initialObject));
}
