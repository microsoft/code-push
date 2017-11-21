/// <reference path="../definitions/harness.d.ts" />

import * as assert from "assert";
import * as Q from "q";

import AccountManager = require("../script/management-sdk");

var request = require("superagent");

var manager: AccountManager;
describe("Management SDK", () => {

    beforeEach(() => {
        manager = new AccountManager(/*accessKey=*/ "dummyAccessKey", /*customHeaders=*/ null, /*serverUrl=*/ "http://localhost");
    });

    after(() => {
        // Prevent an exception that occurs due to how superagent-mock overwrites methods
        request.Request.prototype._callback = function() { };
    });

    it("methods reject the promise with status code info when an error occurs", (done: MochaDone) => {
        mockReturn("Text", 404);

        var methodsWithErrorHandling: any[] = [
            manager.addApp.bind(manager, "appName", "appOs", "appPlatform"),
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

        var result = Q<void>(null);
        methodsWithErrorHandling.forEach(function(f) {
            result = result.then(() => {
                return testErrors(f);
            });
        });

        result.done(() => {
            done();
        });

        // Test that the proper error code and text is passed through on a server error
        function testErrors(method: any): Q.Promise<void> {
            return Q.Promise<void>((resolve: any, reject: any, notify: any) => {
                method().done(() => {
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

    it("isAuthenticated handles successful auth", (done: MochaDone) => {
        mockReturn(JSON.stringify({ authenticated: true }), 200, {});
        manager.isAuthenticated()
            .done((authenticated: boolean) => {
                assert(authenticated, "Should be authenticated");
                done();
            });
    });

    it("isAuthenticated handles unsuccessful auth", (done: MochaDone) => {
        mockReturn("Unauthorized", 401, {});
        manager.isAuthenticated()
            .done((authenticated: boolean) => {
                assert(!authenticated, "Should not be authenticated");
                done();
            });
    });

    it("isAuthenticated handles unsuccessful auth with promise rejection", (done: MochaDone) => {
        mockReturn("Unauthorized", 401, {});

        // use optional parameter to ask for rejection of the promise if not authenticated
        manager.isAuthenticated(true)
            .done((authenticated: boolean) => {
                assert.fail("isAuthenticated should have rejected the promise");
                done();
            }, (err) => {
                assert.equal(err.message, "Unauthorized", "Error message should be 'Unauthorized'");
                done();
            });
    });

    it("isAuthenticated handles unexpected status codes", (done: MochaDone) => {
        mockReturn("Not Found", 404, {});
        manager.isAuthenticated()
            .done((authenticated: boolean) => {
                assert.fail("isAuthenticated should have rejected the promise");
                done();
            }, (err) => {
                assert.equal(err.message, "Not Found", "Error message should be 'Not Found'");
                done();
            });
    });

    it("addApp handles successful response", (done: MochaDone) => {
        mockReturn(JSON.stringify({ success: true }), 201, { location: "/appName" });
        manager.addApp("appName", "iOS", "React-Native")
            .done((obj) => {
                assert.ok(obj);
                done();
            }, rejectHandler);
    });

    it("addApp handles error response", (done: MochaDone) => {
        mockReturn(JSON.stringify({ success: false }), 404, {});
        manager.addApp("appName", "iOS", "React-Native")
            .done((obj) => {
                throw new Error("Call should not complete successfully");
            }, (error: Error) => done());
    });

    it("getApp handles JSON response", (done: MochaDone) => {
        mockReturn(JSON.stringify({ app: {} }), 200, {});

        manager.getApp("appName")
            .done((obj: any) => {
                assert.ok(obj);
                done();
            }, rejectHandler);
    });

    it("updateApp handles success response", (done: MochaDone) => {
        mockReturn(JSON.stringify({ apps: [] }), 200, {});

        manager.renameApp("appName", "newAppName")
            .done((obj: any) => {
                assert.ok(!obj);
                done();
            }, rejectHandler);
    });

    it("removeApp handles success response", (done: MochaDone) => {
        mockReturn("", 200, {});

        manager.removeApp("appName")
            .done((obj: any) => {
                assert.ok(!obj);
                done();
            }, rejectHandler);
    });

    it("transferApp handles successful response", (done: MochaDone) => {
        mockReturn("", 201);
        manager.transferApp("appName", "email1")
            .done((obj) => {
                assert.ok(!obj);
                done();
            }, rejectHandler);
    });

    it("addDeployment handles success response", (done: MochaDone) => {
        mockReturn(JSON.stringify({ deployment: { name: "name", key: "key" } }), 201, { location: "/deploymentName" });

        manager.addDeployment("appName", "deploymentName")
            .done((obj: any) => {
                assert.ok(obj);
                done();
            }, rejectHandler);
    });

    it("getDeployment handles JSON response", (done: MochaDone) => {
        mockReturn(JSON.stringify({ deployment: {} }), 200, {});

        manager.getDeployment("appName", "deploymentName")
            .done((obj: any) => {
                assert.ok(obj);
                done();
            }, rejectHandler);
    });

    it("getDeployments handles JSON response", (done: MochaDone) => {
        mockReturn(JSON.stringify({ deployments: [] }), 200, {});

        manager.getDeployments("appName")
            .done((obj: any) => {
                assert.ok(obj);
                done();
            }, rejectHandler);
    });

    it("renameDeployment handles success response", (done: MochaDone) => {
        mockReturn(JSON.stringify({ apps: [] }), 200, {});

        manager.renameDeployment("appName", "deploymentName", "newDeploymentName")
            .done((obj: any) => {
                assert.ok(!obj);
                done();
            }, rejectHandler);
    });

    it("removeDeployment handles success response", (done: MochaDone) => {
        mockReturn("", 200, {});

        manager.removeDeployment("appName", "deploymentName")
            .done((obj: any) => {
                assert.ok(!obj);
                done();
            }, rejectHandler);
    });

    it("getDeploymentHistory handles success response with no packages", (done: MochaDone) => {
        mockReturn(JSON.stringify({ history: [] }), 200);

        manager.getDeploymentHistory("appName", "deploymentName")
            .done((obj: any) => {
                assert.ok(obj);
                assert.equal(obj.length, 0);
                done();
            }, rejectHandler);
    });

    it("getDeploymentHistory handles success response with two packages", (done: MochaDone) => {
        mockReturn(JSON.stringify({ history: [{ label: "v1" }, { label: "v2" }] }), 200);

        manager.getDeploymentHistory("appName", "deploymentName")
            .done((obj: any) => {
                assert.ok(obj);
                assert.equal(obj.length, 2);
                assert.equal(obj[0].label, "v1");
                assert.equal(obj[1].label, "v2");
                done();
            }, rejectHandler);
    });

    it("getDeploymentHistory handles error response", (done: MochaDone) => {
        mockReturn("", 404);

        manager.getDeploymentHistory("appName", "deploymentName")
            .done((obj: any) => {
                throw new Error("Call should not complete successfully");
            }, (error: Error) => done());
    });

    it("clearDeploymentHistory handles success response", (done: MochaDone) => {
        mockReturn("", 204);

        manager.clearDeploymentHistory("appName", "deploymentName")
            .done((obj: any) => {
                assert.ok(!obj);
                done();
            }, rejectHandler);
    });

    it("clearDeploymentHistory handles error response", (done: MochaDone) => {
        mockReturn("", 404);

        manager.clearDeploymentHistory("appName", "deploymentName")
            .done((obj: any) => {
                throw new Error("Call should not complete successfully");
            }, (error: Error) => done());
    });

    it("addCollaborator handles successful response", (done: MochaDone) => {
        mockReturn("", 201, { location: "/collaborators" });
        manager.addCollaborator("appName", "email1")
            .done((obj) => {
                assert.ok(!obj);
                done();
            }, rejectHandler);
    });

    it("addCollaborator handles error response", (done: MochaDone) => {
        mockReturn("", 404, {});
        manager.addCollaborator("appName", "email1")
            .done((obj) => {
                throw new Error("Call should not complete successfully");
            }, (error: Error) => done());
    });

    it("getCollaborators handles success response with no collaborators", (done: MochaDone) => {
        mockReturn(JSON.stringify({ collaborators: {} }), 200);

        manager.getCollaborators("appName")
            .done((obj: any) => {
                assert.ok(obj);
                assert.equal(Object.keys(obj).length, 0);
                done();
            }, rejectHandler);
    });

    it("getCollaborators handles success response with multiple collaborators", (done: MochaDone) => {
        mockReturn(JSON.stringify({
            collaborators: {
                "email1": { permission: "Owner", isCurrentAccount: true },
                "email2": { permission: "Collaborator", isCurrentAccount: false }
            }
        }), 200);

        manager.getCollaborators("appName")
            .done((obj: any) => {
                assert.ok(obj);
                assert.equal(obj["email1"].permission, "Owner");
                assert.equal(obj["email2"].permission, "Collaborator");
                done();
            }, rejectHandler);
    });

    it("removeCollaborator handles success response", (done: MochaDone) => {
        mockReturn("", 200, {});

        manager.removeCollaborator("appName", "email1")
            .done((obj: any) => {
                assert.ok(!obj);
                done();
            }, rejectHandler);
    });

    it("patchRelease handles success response", (done: MochaDone) => {
        mockReturn(JSON.stringify({ package: { description: "newDescription" } }), 200);

        manager.patchRelease("appName", "deploymentName", "label", { description: "newDescription" })
            .done((obj: any) => {
                assert.ok(!obj);
                done();
            }, rejectHandler);
    });

    it("patchRelease handles error response", (done: MochaDone) => {
        mockReturn("", 400);

        manager.patchRelease("appName", "deploymentName", "label", {})
            .done((obj: any) => {
                throw new Error("Call should not complete successfully");
            }, (error: Error) => done());
    });

    it("promote handles success response", (done: MochaDone) => {
        mockReturn(JSON.stringify({ package: { description: "newDescription" } }), 200);

        manager.promote("appName", "deploymentName", "newDeploymentName", { description: "newDescription" })
            .done((obj: any) => {
                assert.ok(obj);
                assert.equal(obj.description, "newDescription")
                done();
            }, rejectHandler);
    });

    it("promote handles error response", (done: MochaDone) => {
        mockReturn("", 400);

        manager.promote("appName", "deploymentName", "newDeploymentName", { rollout: 123 })
            .done((obj: any) => {
                throw new Error("Call should not complete successfully");
            }, (error: Error) => done());
    });

    it("rollback handles success response", (done: MochaDone) => {
        mockReturn(JSON.stringify({ package: { label: "v1" } }), 200);

        manager.rollback("appName", "deploymentName", "v1")
            .done((obj: any) => {
                assert.ok(!obj);
                done();
            }, rejectHandler);
    });

    it("rollback handles error response", (done: MochaDone) => {
        mockReturn("", 400);

        manager.rollback("appName", "deploymentName", "v1")
            .done((obj: any) => {
                throw new Error("Call should not complete successfully");
            }, (error: Error) => done());
    });
});

// Helper method that is used everywhere that an assert.fail() is needed in a promise handler
function rejectHandler(val: any): void {
    assert.fail();
}

// Wrapper for superagent-mock that abstracts away information not needed for SDK tests
function mockReturn(bodyText: string, statusCode: number, header = {}): void {
    require("superagent-mock")(request, [{
        pattern: "http://localhost/(\\w+)/?",
        fixtures: function(match: any, params: any): any {
            var isOk = statusCode >= 200 && statusCode < 300;
            if (!isOk) {
                var err: any = new Error(bodyText);
                err.status = statusCode;
                throw err;
            }
            return { text: bodyText, status: statusCode, ok: isOk, header: header, headers: {} };
        },
        callback: function(match: any, data: any): any { return data; }
    }]);
}
