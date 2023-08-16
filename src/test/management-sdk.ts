import assert from "assert";

import AccountManager = require("../script/management-sdk");
import adapterTypes = require("../utils/adapter/adapter-types");

var request = require("superagent");

var manager: AccountManager;

const testUser: adapterTypes.UserProfile = {
    id: "testId",
    avatar_url: "testAvatarUrl",
    can_change_password: false,
    display_name: "testDisplayName",
    email: "testEmail",
    name: "testUserName",
    permissions: ["manager"],
}

const testDeployment: adapterTypes.Deployment = {
    createdTime: 123,
    name: "testDeployment1",
    key: "testKey1"
};

const testDeployment2: adapterTypes.Deployment = {
    createdTime: 123,
    name: "testDeployment2",
    key: "testKey2"
};
const testApp: adapterTypes.App = {
    name: "testAppName",
    owner: { ...testUser, type: "user" }
}

const codePushRelease: adapterTypes.CodePushRelease = {
    description: "testDescription",
    target_binary_range: "testTargetBinaryRange",
    upload_time: 123456789,
    blob_url: "testBlobUrl",
    size: 123456789
}

describe("Management SDK", () => {

    beforeEach(() => {
        manager = new AccountManager(/*accessKey=*/ "dummyAccessKey", /*customHeaders=*/ null, /*serverUrl=*/ "http://localhost");
    });

    after(() => {
        // Prevent an exception that occurs due to how superagent-mock overwrites methods
        request.Request.prototype._callback = function () { };
    });

    it("methods reject the promise with status code info when an error occurs", (done: Mocha.Done) => {
        mockReturn("Text", 404);

        var methodsWithErrorHandling: any[] = [
            manager.addApp.bind(manager, "appName", "iOS", "React-Native"),
            manager.getApp.bind(manager, "appName"),
            manager.renameApp.bind(manager, "appName", {}),
            manager.removeApp.bind(manager, "appName"),
            manager.transferApp.bind(manager, "appName", "email1"),

            manager.addDeployment.bind(manager, "appName", "deploymentName"),
            manager.getDeployment.bind(manager, "appName", "deploymentName"),
            manager.getDeployments.bind(manager, "appName"),
            manager.renameDeployment.bind(manager, "appName", "deploymentName", { name: "newDeploymentName" }),
            manager.removeDeployment.bind(manager, "appName", "deploymentName"),

            manager.addCollaborator.bind(manager, "appName", "email1"),
            manager.getCollaborators.bind(manager, "appName"),
            manager.removeCollaborator.bind(manager, "appName", "email1"),

            manager.patchRelease.bind(manager, "appName", "deploymentName", "label", { description: "newDescription" }),
            manager.promote.bind(manager, "appName", "deploymentName", "newDeploymentName", { description: "newDescription" }),
            manager.rollback.bind(manager, "appName", "deploymentName", "targetReleaseLabel")
        ];

        var result = Promise.resolve(null);
        methodsWithErrorHandling.forEach(function (f) {
            result = result.then(() => {
                return testErrors(f);
            });
        });

        result.then(() => {
            done();
        });

        // Test that the proper error code and text is passed through on a server error
        function testErrors(method: any): Promise<void> {
            return new Promise<void>((resolve: any, reject: any) => {
                method().then(() => {
                    assert.fail("Should have thrown an error");
                    reject();
                }, (error: any) => {
                    assert.equal(error.message, "Text");
                    assert(error.statusCode);
                    resolve();
                });
            });
        }
    });

    describe("isAuthenticated", () => {
        it("isAuthenticated handles successful auth", (done: Mocha.Done) => {
            mockReturn(JSON.stringify(testUser), 200);
            manager.isAuthenticated()
                .then((authenticated: boolean) => {
                    assert(authenticated, "Should be authenticated");
                    done();
                });
        });

        it("isAuthenticated handles unsuccessful auth", (done: Mocha.Done) => {
            mockReturn("Unauthorized", 401);
            manager.isAuthenticated()
                .then((authenticated: boolean) => {
                    assert(!authenticated, "Should not be authenticated");
                    done();
                });
        });

        it("isAuthenticated handles unsuccessful auth with promise rejection", (done: Mocha.Done) => {
            mockReturn("Unauthorized", 401);

            // use optional parameter to ask for rejection of the promise if not authenticated
            manager.isAuthenticated(true)
                .then((authenticated: boolean) => {
                    assert.fail("isAuthenticated should have rejected the promise");
                    done();
                }, (err) => {
                    assert.equal(err.message, "Unauthorized", "Error message should be 'Unauthorized'");
                    done();
                });
        });

        it("isAuthenticated handles unexpected status codes", (done: Mocha.Done) => {
            mockReturn("Not Found", 404);
            manager.isAuthenticated()
                .then((authenticated: boolean) => {
                    assert.fail("isAuthenticated should have rejected the promise");
                    done();
                }, (err) => {
                    assert.equal(err.message, "Not Found", "Error message should be 'Not Found'");
                    done();
                });
        });
    });

    describe("addApp", () => {
        it("addApp handles successful response", (done: Mocha.Done) => {
            mockReturn(JSON.stringify(testApp), 201, null, { location: "/appName" });
            manager.addApp("appName", "iOS", "React-Native")
                .then((obj) => {
                    assert.ok(obj);
                    done();
                }, rejectHandler);
        });

        it("addApp handles error response", (done: Mocha.Done) => {
            mockReturn(JSON.stringify({ success: false }), 404);
            manager.addApp("appName", "iOS", "React-Native")
                .then((obj) => {
                    throw new Error("Call should not complete successfully");
                }, (error: Error) => done());
        });
    });

    describe("getApp", () => {
        it("getApp handles JSON response", (done: Mocha.Done) => {
            mockReturn(JSON.stringify(testApp), 200);
            mockUser();
            mockReturn(JSON.stringify([testDeployment, testDeployment2]), 200, `/apps/${testUser.name}/${testApp.name}/deployments/`)

            manager.getApp("appName")
                .then((obj: any) => {
                    assert.ok(obj);
                    done();
                }, rejectHandler);
        });
    });

    describe("updateApp", () => {
        it("updateApp handles success response", (done: Mocha.Done) => {
            mockReturn(JSON.stringify(testApp), 200);

            manager.renameApp("appName", "newAppName")
                .then((obj: any) => {
                    assert.ok(!obj);
                    done();
                }, rejectHandler);
        });
    });

    describe("removeApp", () => {
        it("removeApp handles success response", (done: Mocha.Done) => {
            mockReturn("", 200);
            mockUser();

            manager.removeApp("appName")
                .then((obj: any) => {
                    assert.ok(!obj);
                    done();
                }, rejectHandler);
        });
    });

    describe("transferApp", () => {
        it("transferApp handles successful response", (done: Mocha.Done) => {
            mockReturn("", 201);
            mockUser();
            manager.transferApp("appName", "email1")
                .then(
                    () => done(),
                    rejectHandler
                );
        });
    });

    describe("addDeployment", () => {
        it("addDeployment handles success response", (done: Mocha.Done) => {
            const testDeploymentWithoutPackage: adapterTypes.Deployment = { ...testDeployment, latest_release: null }

            mockReturn(JSON.stringify(testDeploymentWithoutPackage), 201, null, { location: "/deploymentName" });

            manager.addDeployment("appName", "deploymentName")
                .then((obj: any) => {
                    assert.ok(obj);
                    done();
                }, rejectHandler);
        });
    });

    describe("getDeployment", () => {
        it("getDeployment handles JSON response", (done: Mocha.Done) => {
            mockReturn(JSON.stringify(testDeployment), 200);
            mockUser();

            manager.getDeployment("appName", "deploymentName")
                .then((obj: any) => {
                    assert.ok(obj);
                    done();
                }, rejectHandler);
        });
    });

    describe("getDeployments", () => {
        it("getDeployments handles JSON response", (done: Mocha.Done) => {
            mockReturn(JSON.stringify([testDeployment, testDeployment2]), 200);
            mockUser();

            manager.getDeployments("appName")
                .then((obj: any) => {
                    assert.ok(obj);
                    done();
                }, rejectHandler);
        });
    });

    describe("renameDeployment", () => {
        it("renameDeployment handles success response", (done: Mocha.Done) => {
            mockReturn(JSON.stringify(testApp), 200);

            manager.renameDeployment("appName", "deploymentName", "newDeploymentName")
                .then((obj: any) => {
                    assert.ok(!obj);
                    done();
                }, rejectHandler);
        });
    });

    describe("removeDeployment", () => {
        it("removeDeployment handles success response", (done: Mocha.Done) => {
            mockReturn("", 200);
            mockUser();

            manager.removeDeployment("appName", "deploymentName")
                .then((obj: any) => {
                    assert.ok(!obj);
                    done();
                }, rejectHandler);
        });
    });

    describe("getDeploymentHistory", () => {
        it("getDeploymentHistory handles success response with no packages", (done: Mocha.Done) => {
            mockReturn(JSON.stringify([]), 200);
            mockUser();

            manager.getDeploymentHistory("appName", "deploymentName")
                .then((obj: any) => {
                    assert.ok(obj);
                    assert.equal(obj.length, 0);
                    done();
                }, rejectHandler);
        });

        it("getDeploymentHistory handles success response with two packages", (done: Mocha.Done) => {
            const release: adapterTypes.CodePushRelease = { ...codePushRelease, label: "v1" };
            const release2: adapterTypes.CodePushRelease = { ...codePushRelease, label: "v2" };

            mockReturn(JSON.stringify([release, release2]), 200);
            mockUser();

            manager.getDeploymentHistory("appName", "deploymentName")
                .then((obj: any) => {
                    assert.ok(obj);
                    assert.equal(obj.length, 2);
                    assert.equal(obj[0].label, "v1");
                    assert.equal(obj[1].label, "v2");
                    done();
                }, rejectHandler);
        });

        it("getDeploymentHistory handles error response", (done: Mocha.Done) => {
            mockReturn("", 404);

            manager.getDeploymentHistory("appName", "deploymentName")
                .then((obj: any) => {
                    throw new Error("Call should not complete successfully");
                }, (error: Error) => done());
        });
    });

    describe("clearDeploymentHistory", () => {
        it("clearDeploymentHistory handles success response", (done: Mocha.Done) => {
            mockReturn("", 204);
            mockUser();

            manager.clearDeploymentHistory("appName", "deploymentName")
                .then((obj: any) => {
                    assert.ok(!obj);
                    done();
                }, rejectHandler);
        });

        it("clearDeploymentHistory handles error response", (done: Mocha.Done) => {
            mockReturn("", 404);

            manager.clearDeploymentHistory("appName", "deploymentName")
                .then((obj: any) => {
                    throw new Error("Call should not complete successfully");
                }, (error: Error) => done());
        });
    });

    describe("addCollaborator", () => {
        it("addCollaborator handles successful response", (done: Mocha.Done) => {
            mockReturn("", 201, null, { location: "/collaborators" });
            mockUser();
            manager.addCollaborator("appName", "email1")
                .then(
                    () => done(),
                    rejectHandler
                );
        });

        it("addCollaborator handles error response", (done: Mocha.Done) => {
            mockReturn("", 404);
            manager.addCollaborator("appName", "email1")
                .then(
                    () => { throw new Error("Call should not complete successfully") },
                    () => done()
                );
        });
    });

    describe("getCollaborators", () => {
        it("getCollaborators handles success response with no collaborators", (done: Mocha.Done) => {
            mockReturn(JSON.stringify([]), 200);
            mockUser();

            manager.getCollaborators("appName")
                .then((obj: any) => {
                    assert.ok(obj);
                    assert.equal(Object.keys(obj).length, 0);
                    done();
                }, rejectHandler);
        });

        it("getCollaborators handles success response with multiple collaborators", (done: Mocha.Done) => {
            const testUser2: adapterTypes.UserProfile = {
                ...testUser,
                email: "testEmail2",
                permissions: ["developer"]
            }

            mockReturn(JSON.stringify([testUser, testUser2]), 200);
            mockUser();

            manager.getCollaborators("appName")
                .then((obj: any) => {
                    assert.ok(obj);
                    assert.equal(obj[testUser.email].permission, "Owner");
                    assert.equal(obj[testUser2.email].permission, "Collaborator");
                    done();
                }, rejectHandler);
        });
    });

    describe("removeCollaborator", () => {
        it("removeCollaborator handles success response", (done: Mocha.Done) => {
            mockReturn("", 200);
            mockUser();

            manager.removeCollaborator("appName", "email1")
                .then((obj: any) => {
                    assert.ok(!obj);
                    done();
                }, rejectHandler);
        });
    });

    describe("patchRelease", () => {
        it("patchRelease handles success response", (done: Mocha.Done) => {
            const newReleasePackage: adapterTypes.CodePushRelease = { ...codePushRelease, description: "newDescription" };
            mockReturn(JSON.stringify(newReleasePackage), 200);

            manager.patchRelease("appName", "deploymentName", "label", { description: "newDescription" })
                .then((obj: any) => {
                    assert.ok(!obj);
                    done();
                }, rejectHandler);
        });

        it("patchRelease handles error response", (done: Mocha.Done) => {
            mockReturn("", 400);

            manager.patchRelease("appName", "deploymentName", "label", {})
                .then((obj: any) => {
                    throw new Error("Call should not complete successfully");
                }, (error: Error) => done());
        });
    });

    describe("promote", () => {
        it("promote handles success response", (done: Mocha.Done) => {
            const newReleasePackage: adapterTypes.CodePushRelease = { ...codePushRelease, description: "newDescription" };

            mockReturn(JSON.stringify(newReleasePackage), 200);

            manager.promote("appName", "deploymentName", "newDeploymentName", { description: "newDescription" })
                .then((obj: any) => {
                    assert.ok(obj);
                    assert.equal(obj.description, "newDescription")
                    done();
                }, rejectHandler);
        });

        it("promote handles error response", (done: Mocha.Done) => {
            mockReturn("", 400);

            manager.promote("appName", "deploymentName", "newDeploymentName", { rollout: 123 })
                .then((obj: any) => {
                    throw new Error("Call should not complete successfully");
                }, (error: Error) => done());
        });
    });

    describe("rollback", () => {
        it("rollback handles success response", (done: Mocha.Done) => {
            mockReturn(JSON.stringify(codePushRelease), 200);

            manager.rollback("appName", "deploymentName", "v1")
                .then((obj: any) => {
                    assert.ok(!obj);
                    done();
                }, rejectHandler);
        });

        it("rollback handles error response", (done: Mocha.Done) => {
            mockReturn("", 400);

            manager.rollback("appName", "deploymentName", "v1")
                .then((obj: any) => {
                    throw new Error("Call should not complete successfully");
                }, (error: Error) => done());
        });
    });
});

// Helper method that is used everywhere that an assert.fail() is needed in a promise handler
function rejectHandler(val: any): void {
    assert.fail();
}

function mockUser(): void {
    mockReturn(JSON.stringify(testUser), 200, "/user");
}

// Wrapper for superagent-mock that abstracts away information not needed for SDK tests
function mockReturn(bodyText: string, statusCode: number, pattern?: string, header = {}): void {
    require("superagent-mock")(request, [{
        pattern: "http://localhost" + (pattern ? pattern : "/(\\w+)/?"),
        fixtures: function (match: any, params: any): any {
            var isOk = statusCode >= 200 && statusCode < 300;
            if (!isOk) {
                var err: any = new Error(bodyText);
                err.status = statusCode;
                throw err;
            }
            return { text: bodyText, status: statusCode, ok: isOk, header: header, headers: {} };
        },
        callback: function (match: any, data: any): any { return data; }
    }]);
}
