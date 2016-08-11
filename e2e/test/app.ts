import * as assert from "assert";
import * as CodePush from "rest-definitions";
import * as Q from "q";
import { Command } from "./utils/command";
import { Error } from "./utils/error";
import { makeRandomString } from "./utils/misc";
import { Success } from "./utils/success";
import { Validate } from "./utils/validate";
var nixt = require("nixt");
var tryJSON = require("try-json");

export function appTests() {
    
    // To keep the account clean of excessive apps, we must remember what apps we create and destroy them after the tests!
    
    var appNamesAddedDuringTests: string[] = [];
    
    function addAndDone(done: MochaDone, appNameAdded: string): (error: any) => void {
        return (error: any) => {
            appNamesAddedDuringTests.push(appNameAdded);
            done(error);
        }
    }
    
    function removeAndDone(done: MochaDone, appNameRemoved: string): (error: any) => void {
        return (error: any) => {
            appNamesAddedDuringTests.splice(appNamesAddedDuringTests.indexOf(appNameRemoved), 1);
            done(error);
        }
    }
    
    function renameAndDone(done: MochaDone, oldAppName: string, newAppName: string): (error: any) => void {
        return (error: any) => {
            removeAndDone(() => {}, oldAppName)(undefined);
            addAndDone(done, newAppName)(error);
        }
    }
    
    after((done: MochaDone) => {
        Q.all(appNamesAddedDuringTests.map((appNameAdded: string) => {
            var deferred = Q.defer<void>();
            
            nixt()
                .stdout(Success.appRm(appNameAdded))
                .run(Command.appRm(appNameAdded))
                .on(Command.PROMPT_ARE_YOU_SURE).respond(Command.RESPONSE_ACCEPT)
                .end(deferred.resolve);
                
            return deferred.promise;
        }))
            .then(() => {
                done();
            });
    });
    
    describe("app ls", () => {
        it("succeeds", (done: MochaDone) => {
            nixt()
                .expect(Validate.Apps())
                .run(Command.appLs())
                .end(done);
        });
        
        it("fails with invalid format", (done: MochaDone) => {
            nixt()
                .stderr(Error.invalidFormat())
                .run(Command.invalidFormat(Command.appLs()))
                .end(done);
        });
    });
    
    describe("app add", () => {
        var appName: string;
        beforeEach((done: MochaDone) => {
            appName = makeRandomString();
            
            nixt()
                .stdout(Success.appAdd(appName))
                .run(Command.appAdd(appName))
                .end(addAndDone(done, appName));
        });
        
        it("succeeds", (done: MochaDone) => {
            nixt()
                .expect(Validate.Apps.checkFor(appName, Validate.existsInContainer))
                .run(Command.appLs())
                .end(done);
        });
        
        it("fails if app conflict", (done: MochaDone) => {
            nixt()
                .stderr(Error.appConflict(appName))
                .run(Command.appAdd(appName))
                .end(done);
        });
    });
    
    describe("app rm", () => {
        var appName: string;
        beforeEach((done: MochaDone) => {
            appName = makeRandomString();
            
            nixt()
                .stdout(Success.appAdd(appName))
                .run(Command.appAdd(appName))
                .end(addAndDone(done, appName));
        });
        
        it("succeeds with Y", (done: MochaDone) => {
            nixt()
                .stdout(Success.appRm(appName))
                .run(Command.appRm(appName))
                .on(Command.PROMPT_ARE_YOU_SURE).respond(Command.RESPONSE_ACCEPT)
                .end(() => {
                    nixt()
                        .expect(Validate.Apps.checkFor(appName, Validate.doesNotExistInContainer))
                        .run(Command.appLs())
                        .end(removeAndDone(done, appName));
                });
        });
        
        it("fails with n", (done: MochaDone) => {
            nixt()
                .stdout("App removal cancelled.")
                .run(Command.appRm(appName))
                .on(Command.PROMPT_ARE_YOU_SURE).respond(Command.RESPONSE_REJECT)
                .end(() => {
                    nixt()
                        .expect(Validate.Apps.checkFor(appName, Validate.existsInContainer))
                        .run(Command.appLs())
                        .end(done);
                });
        });
        
        it("fails if app not found", (done: MochaDone) => {
            var fakeAppName: string = "not_a_real_app";
            
            nixt()
                .stderr(Error.appNotFound(fakeAppName))
                .run(Command.appRm(fakeAppName))
                .on(Command.PROMPT_ARE_YOU_SURE).respond(Command.RESPONSE_ACCEPT)
                .end(done);
        });
    });
    
    describe("app rename", () => {
        var oldAppName: string;
        var newAppName: string;
        beforeEach((done: MochaDone) => {
            oldAppName = makeRandomString();
            newAppName = makeRandomString();
            
            nixt()
                .stdout(Success.appAdd(oldAppName))
                .run(Command.appAdd(oldAppName))
                .end(addAndDone(done, oldAppName));
        });
        
        it("succeeds", (done: MochaDone) => {
            nixt()
                .stdout(Success.appRename(oldAppName, newAppName))
                .run(Command.appRename(oldAppName, newAppName))
                .end(() => {
                    nixt()
                        .expect(Validate.Apps.checkForMany({ [oldAppName]: Validate.doesNotExistInContainer, [newAppName]: Validate.existsInContainer }))
                        .run(Command.appLs())
                        .end(renameAndDone(done, oldAppName, newAppName));
                });
        });
        
        it("fails if app not found", (done: MochaDone) => {
            var fakeAppName: string = "not_a_real_app";
            
            nixt()
                .stderr(Error.appNotFound(fakeAppName))
                .run(Command.appRename(fakeAppName, newAppName))
                .end(done);
        });
        
        it("fails if app conflict", (done: MochaDone) => {
            nixt()
                .code(201)
                .run(Command.appAdd(newAppName))
                .end(() => {
                    nixt()
                        .stderr(Error.appConflict(newAppName))
                        .run(Command.appRename(oldAppName, newAppName))
                        .end(addAndDone(done, newAppName));
                });
        });
    });
    
    // TODO: TRANSFER APP TESTS
}
