import * as assert from "assert";

import * as acquisitionSdk from "../script/acquisition-sdk";
import * as acquisitionRestMock from "./acquisition-rest-mock";
import * as types from "../script/types";
import { CodePushPackageError } from "../script/code-push-error"
import { updateMockUrl } from "./acquisition-rest-mock";

const mockApi = acquisitionRestMock;
var latestPackage: types.UpdateCheckResponse = clone(mockApi.latestPackage);

var configuration: acquisitionSdk.Configuration = {
    appVersion: "1.5.0",
    clientUniqueId: "My iPhone",
    deploymentKey: mockApi.validDeploymentKey,
    serverUrl: mockApi.serverUrl,
}

var templateCurrentPackage: acquisitionSdk.Package = {
    deploymentKey: mockApi.validDeploymentKey,
    description: "Standard description",
    label: "v1",
    appVersion: latestPackage.target_binary_range,
    packageHash: "hash001",
    isMandatory: false,
    packageSize: 100
};

var scriptUpdateResult: acquisitionSdk.RemotePackage = {
    deploymentKey: mockApi.validDeploymentKey,
    description: latestPackage.description,
    downloadUrl: latestPackage.download_url,
    label: latestPackage.label,
    appVersion: latestPackage.target_binary_range,
    isMandatory: latestPackage.is_mandatory,
    packageHash: latestPackage.package_hash,
    packageSize: latestPackage.package_size
};

var nativeUpdateResult: acquisitionSdk.NativeUpdateNotification = {
    updateAppVersion: true,
    appVersion: latestPackage.target_binary_range
};

describe("Acquisition SDK", () => {
    beforeEach(() => {
        mockApi.latestPackage = clone(latestPackage);
        mockApi.serverUrl = "http://myurl.com";
        updateMockUrl();
    });

    it("Package with lower label and different package hash gives update", (done: Mocha.Done) => {
        var acquisition = new acquisitionSdk.AcquisitionManager(new mockApi.HttpRequester(), configuration);
        acquisition.queryUpdateWithCurrentPackage(templateCurrentPackage, (error: Error, returnPackage: acquisitionSdk.RemotePackage | acquisitionSdk.NativeUpdateNotification) => {
            assert.equal(null, error);
            assert.deepEqual(scriptUpdateResult, returnPackage);
            done();
        });
    });

    it("Package with equal package hash gives no update", (done: Mocha.Done) => {
        var equalVersionPackage: acquisitionSdk.Package = clone(templateCurrentPackage);
        equalVersionPackage.packageHash = latestPackage.package_hash;

        var acquisition = new acquisitionSdk.AcquisitionManager(new mockApi.HttpRequester(), configuration);
        acquisition.queryUpdateWithCurrentPackage(equalVersionPackage, (error: Error, returnPackage: acquisitionSdk.RemotePackage | acquisitionSdk.NativeUpdateNotification) => {
            assert.equal(null, error);
            assert.equal(null, returnPackage);
            done();
        });
    });

    it("Package with higher different hash and higher label version gives update", (done: Mocha.Done) => {
        var higherVersionPackage: acquisitionSdk.Package = clone(templateCurrentPackage);
        higherVersionPackage.packageHash = "hash990";

        var acquisition = new acquisitionSdk.AcquisitionManager(new mockApi.HttpRequester(), configuration);
        acquisition.queryUpdateWithCurrentPackage(higherVersionPackage, (error: Error, returnPackage: acquisitionSdk.RemotePackage | acquisitionSdk.NativeUpdateNotification) => {
            assert.equal(null, error);
            assert.deepEqual(scriptUpdateResult, returnPackage);
            done();
        });
    });

    it("Package with lower native version gives update notification", (done: Mocha.Done) => {
        var lowerAppVersionPackage: acquisitionSdk.Package = clone(templateCurrentPackage);
        lowerAppVersionPackage.appVersion = "0.0.1";

        var acquisition = new acquisitionSdk.AcquisitionManager(new mockApi.HttpRequester(), configuration);
        acquisition.queryUpdateWithCurrentPackage(lowerAppVersionPackage, (error: Error, returnPackage: acquisitionSdk.RemotePackage | acquisitionSdk.NativeUpdateNotification) => {
            assert.equal(null, error);
            assert.deepEqual(nativeUpdateResult, returnPackage);
            done();
        });
    });

    it("Package with higher native version gives no update", (done: Mocha.Done) => {
        var higherAppVersionPackage: acquisitionSdk.Package = clone(templateCurrentPackage);
        higherAppVersionPackage.appVersion = "9.9.0";

        var acquisition = new acquisitionSdk.AcquisitionManager(new mockApi.HttpRequester(), configuration);
        acquisition.queryUpdateWithCurrentPackage(higherAppVersionPackage, (error: Error, returnPackage: acquisitionSdk.RemotePackage | acquisitionSdk.NativeUpdateNotification) => {
            assert.equal(null, error);
            assert.deepEqual(null, returnPackage);
            done();
        });
    });

    it("An empty response gives no update", (done: Mocha.Done) => {
        var lowerAppVersionPackage: acquisitionSdk.Package = clone(templateCurrentPackage);
        lowerAppVersionPackage.appVersion = "0.0.1";

        var emptyResponse: acquisitionSdk.Http.Response = {
            statusCode: 200,
            body: JSON.stringify({})
        };

        var acquisition = new acquisitionSdk.AcquisitionManager(new mockApi.CustomResponseHttpRequester(emptyResponse), configuration);
        acquisition.queryUpdateWithCurrentPackage(lowerAppVersionPackage, (error: Error, returnPackage: acquisitionSdk.RemotePackage | acquisitionSdk.NativeUpdateNotification) => {
            assert.equal(null, error);
            done();
        });
    });

    it("An unexpected (but valid) JSON response gives no update", (done: Mocha.Done) => {
        var lowerAppVersionPackage: acquisitionSdk.Package = clone(templateCurrentPackage);
        lowerAppVersionPackage.appVersion = "0.0.1";

        var unexpectedResponse: acquisitionSdk.Http.Response = {
            statusCode: 200,
            body: JSON.stringify({ unexpected: "response" })
        };

        var acquisition = new acquisitionSdk.AcquisitionManager(new mockApi.CustomResponseHttpRequester(unexpectedResponse), configuration);
        acquisition.queryUpdateWithCurrentPackage(lowerAppVersionPackage, (error: Error, returnPackage: acquisitionSdk.RemotePackage | acquisitionSdk.NativeUpdateNotification) => {
            assert.equal(null, error);
            done();
        });
    });

    it("Package for companion app ignores high native version and gives update", (done: Mocha.Done) => {
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

    it("If latest package is mandatory, returned package is mandatory", (done: Mocha.Done) => {
        mockApi.latestPackage.is_mandatory = true;
        var acquisition = new acquisitionSdk.AcquisitionManager(new mockApi.HttpRequester(), configuration);
        acquisition.queryUpdateWithCurrentPackage(templateCurrentPackage, (error: Error, returnPackage: acquisitionSdk.RemotePackage) => {
            assert.equal(null, error);
            assert.equal(true, returnPackage.isMandatory);
            done();
        });
    });

    it("If invalid arguments are provided, an error is raised", (done: Mocha.Done) => {
        var invalidPackage: acquisitionSdk.Package = clone(templateCurrentPackage);
        invalidPackage.appVersion = null;
        var expectedError = new CodePushPackageError("Calling common acquisition SDK with incorrect package")

        var acquisition = new acquisitionSdk.AcquisitionManager(new mockApi.HttpRequester(), configuration);
        try {
            acquisition.queryUpdateWithCurrentPackage(invalidPackage, (error: Error, returnPackage: acquisitionSdk.RemotePackage | acquisitionSdk.NativeUpdateNotification) => {
                assert.fail("Should throw an error if the native implementation gave an incorrect package");
                done();
            });
        } catch (error) {
            assert.deepEqual(error, expectedError);
            assert.equal(error instanceof CodePushPackageError, true)
            done();
        }
    });

    it("If an invalid JSON response is returned by the server, an error is raised", (done: Mocha.Done) => {
        var lowerAppVersionPackage: acquisitionSdk.Package = clone(templateCurrentPackage);
        lowerAppVersionPackage.appVersion = "0.0.1";

        var invalidJsonResponse: acquisitionSdk.Http.Response = {
            statusCode: 200,
            body: "invalid {{ json"
        };

        var acquisition = new acquisitionSdk.AcquisitionManager(new mockApi.CustomResponseHttpRequester(invalidJsonResponse), configuration);
        acquisition.queryUpdateWithCurrentPackage(lowerAppVersionPackage, (error: Error, returnPackage: acquisitionSdk.RemotePackage | acquisitionSdk.NativeUpdateNotification) => {
            assert.notEqual(null, error);
            done();
        });
    });

    it("If deploymentKey is not valid...", (done: Mocha.Done) => {
        // TODO: behavior is not defined
        done();
    });

    it("reportStatusDeploy(...) signals completion", (done: Mocha.Done): void => {
        var acquisition = new acquisitionSdk.AcquisitionManager(new mockApi.HttpRequester(), configuration);

        acquisition.reportStatusDeploy(templateCurrentPackage, acquisitionSdk.AcquisitionStatus.DeploymentFailed, "1.5.0", mockApi.validDeploymentKey, ((error: Error, parameter: void): void => {
            if (error) {
                throw error;
            }

            assert.equal(parameter, /*expected*/ null);

            done();
        }));
    });

    it("reportStatusDownload(...) signals completion", (done: Mocha.Done): void => {
        var acquisition = new acquisitionSdk.AcquisitionManager(new mockApi.HttpRequester(), configuration);

        acquisition.reportStatusDownload(templateCurrentPackage, ((error: Error, parameter: void): void => {
            if (error) {
                throw error;
            }

            assert.equal(parameter, /*expected*/ null);

            done();
        }));
    });

    it("disables api calls on unsuccessful response", (done: Mocha.Done): void => {
        var invalidJsonResponse: acquisitionSdk.Http.Response = {
            statusCode: 404,
            body: "Not found"
        };

        mockApi.serverUrl = "https://codepush.appcenter.ms";
        updateMockUrl();
        configuration = { ...configuration, serverUrl: "https://codepush.appcenter.ms" };

        var acquisition = new acquisitionSdk.AcquisitionManager(new mockApi.CustomResponseHttpRequester(invalidJsonResponse), configuration);
        acquisition.queryUpdateWithCurrentPackage(templateCurrentPackage, (error: Error, returnPackage: acquisitionSdk.RemotePackage | acquisitionSdk.NativeUpdateNotification) => {
            assert.strictEqual((acquisitionSdk.AcquisitionManager as any)._apiCallsDisabled, true);
            (acquisitionSdk.AcquisitionManager as any)._apiCallsDisabled = false;
        });

        acquisition.queryUpdateWithCurrentPackage(templateCurrentPackage, (error: Error, returnPackage: acquisitionSdk.RemotePackage | acquisitionSdk.NativeUpdateNotification) => {
            assert.strictEqual(returnPackage, null);
            acquisition = new acquisitionSdk.AcquisitionManager(new mockApi.HttpRequester(404), configuration);
            (acquisitionSdk.AcquisitionManager as any)._apiCallsDisabled = false;
        });

        acquisition.reportStatusDeploy(templateCurrentPackage, acquisitionSdk.AcquisitionStatus.DeploymentSucceeded, "1.5.0", mockApi.validDeploymentKey, ((error: Error, parameter: void): void => {
            assert.strictEqual((acquisitionSdk.AcquisitionManager as any)._apiCallsDisabled, true);
            acquisition = new acquisitionSdk.AcquisitionManager(new mockApi.HttpRequester(404), configuration);
            (acquisitionSdk.AcquisitionManager as any)._apiCallsDisabled = false;
        }));

        acquisition.reportStatusDownload(templateCurrentPackage, ((error: Error, parameter: void): void => {
            assert.strictEqual((acquisitionSdk.AcquisitionManager as any)._apiCallsDisabled, true);
            acquisition = acquisition = new acquisitionSdk.AcquisitionManager(new mockApi.CustomResponseHttpRequester(invalidJsonResponse), configuration);
            (acquisitionSdk.AcquisitionManager as any)._apiCallsDisabled = false;
        }));

        done();
    })

    it("doesn't disable api calls on successful response", (done: Mocha.Done): void => {
        var acquisition = new acquisitionSdk.AcquisitionManager(new mockApi.HttpRequester(), configuration);
        mockApi.serverUrl = "https://codepush.appcenter.ms";
        updateMockUrl();

        acquisition.queryUpdateWithCurrentPackage(templateCurrentPackage, (error: Error, returnPackage: acquisitionSdk.RemotePackage | acquisitionSdk.NativeUpdateNotification) => {
            assert.strictEqual((acquisitionSdk.AcquisitionManager as any)._apiCallsDisabled, false);
        });

        acquisition.queryUpdateWithCurrentPackage(templateCurrentPackage, (error: Error, returnPackage: acquisitionSdk.RemotePackage | acquisitionSdk.NativeUpdateNotification) => {
            assert.notStrictEqual(returnPackage, null);
        });

        acquisition.reportStatusDeploy(templateCurrentPackage, acquisitionSdk.AcquisitionStatus.DeploymentSucceeded, "1.5.0", mockApi.validDeploymentKey, ((error: Error, parameter: void): void => {
            assert.strictEqual((acquisitionSdk.AcquisitionManager as any)._apiCallsDisabled, false);
        }));

        acquisition.reportStatusDownload(templateCurrentPackage, ((error: Error, parameter: void): void => {
            assert.strictEqual((acquisitionSdk.AcquisitionManager as any)._apiCallsDisabled, false);
        }));

        done();
    })

});

function clone<T>(initialObject: T): T {
    return JSON.parse(JSON.stringify(initialObject));
}
