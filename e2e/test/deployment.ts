import * as assert from "assert";
import * as CodePush from "rest-definitions";
import { Command } from "./utils/command";
import { Error } from "./utils/error";
import { makeRandomString } from "./utils/misc";
import { Success } from "./utils/success";
import { Validate } from "./utils/validate";
var nixt = require("nixt");
var tryJSON = require("try-json");

export function deploymentTests() {
    var appName: string = makeRandomString();
    before((done: MochaDone) => {
        nixt()
            .stdout(Success.appAdd(appName))
            .run(Command.appAdd(appName))
            .end(done);
    });
    
    after((done: MochaDone) => {
        nixt()
            .stdout(Success.appRm(appName))
            .run(Command.appRm(appName))
            .on(Command.PROMPT_ARE_YOU_SURE).respond(Command.RESPONSE_ACCEPT)
            .end(done);
    });
    
    describe("deployment ls", () => {
        it("succeeds", (done: MochaDone) => {
            nixt()
                .expect(Validate.Deployments())
                .run(Command.deploymentLs(appName))
                .end(done);
        });
        
        it("fails if app not found", (done: MochaDone) => {
            var fakeAppName: string = "not_a_real_app";
            
            nixt()
                .stderr(Error.appNotFound(fakeAppName))
                .run(Command.deploymentLs(fakeAppName))
                .end(done);
        });
        
        it("fails with invalid format", (done: MochaDone) => {
            nixt()
                .stderr(Error.invalidFormat())
                .run(Command.invalidFormat(Command.deploymentLs(appName)))
                .end(done);
        });
    });
    
    describe("deployment add", () => {
        var deploymentName: string;
        beforeEach((done: MochaDone) => {
            deploymentName = makeRandomString();
            
            nixt()
                .stdout(Success.deploymentAdd(appName, deploymentName))
                .run(Command.deploymentAdd(appName, deploymentName))
                .end(done);
        });
        
        it("succeeds", (done: MochaDone) => {
            nixt()
                .expect(Validate.Deployments.checkFor(deploymentName, Validate.existsInContainer))
                .run(Command.deploymentLs(appName))
                .end(done);
        });
        
        it("fails if deployment conflict", (done: MochaDone) => {
            nixt()
                .stderr(Error.deploymentConflict(deploymentName))
                .run(Command.deploymentAdd(appName, deploymentName))
                .end(done);
        });
        
        it("fails if app not found", (done: MochaDone) => {
            var fakeAppName: string = "not_a_real_app";
            
            nixt()
                .stderr(Error.appNotFound(fakeAppName))
                .run(Command.deploymentAdd(fakeAppName, deploymentName))
                .end(done);
        });
    });
    
    describe("deployment rm", () => {
        var deploymentName: string;
        beforeEach((done: MochaDone) => {
            deploymentName = makeRandomString();
            
            nixt()
                .stdout(Success.deploymentAdd(appName, deploymentName))
                .run(Command.deploymentAdd(appName, deploymentName))
                .end(done);
        });
        
        it("succeeds with Y", (done: MochaDone) => {
            nixt()
                .stdout(Success.deploymentRm(appName, deploymentName))
                .run(Command.deploymentRm(appName, deploymentName))
                .on(Command.PROMPT_ARE_YOU_SURE).respond(Command.RESPONSE_ACCEPT)
                .end(() => {
                    nixt()
                        .expect(Validate.Deployments.checkFor(deploymentName, Validate.doesNotExistInContainer))
                        .run(Command.deploymentLs(appName))
                        .end(done);
                });
        });
        
        it("fails with n", (done: MochaDone) => {
            nixt()
                .stdout("Deployment removal cancelled.")
                .run(Command.deploymentRm(appName, deploymentName))
                .on(Command.PROMPT_ARE_YOU_SURE).respond(Command.RESPONSE_REJECT)
                .end(() => {
                    nixt()
                        .expect(Validate.Deployments.checkFor(deploymentName, Validate.existsInContainer))
                        .run(Command.deploymentLs(appName))
                        .end(done);
                });
        });
        
        it("fails if app not found", (done: MochaDone) => {
            var fakeAppName: string = "not_a_real_app";
            
            nixt()
                .stderr(Error.appNotFound(fakeAppName))
                .run(Command.deploymentRm(fakeAppName, deploymentName))
                .on(Command.PROMPT_ARE_YOU_SURE).respond(Command.RESPONSE_ACCEPT)
                .end(done);
        });
        
        it("fails if deployment not found", (done: MochaDone) => {
            var fakeDeploymentName: string = "not_a_real_deployment";
            
            nixt()
                .stderr(Error.deploymentNotFound(fakeDeploymentName))
                .run(Command.deploymentRm(appName, fakeDeploymentName))
                .on(Command.PROMPT_ARE_YOU_SURE).respond(Command.RESPONSE_ACCEPT)
                .end(done);
        });
    });
    
    describe("deployment rename", () => {
        var oldDeploymentName: string;
        var newDeploymentName: string;
        beforeEach((done: MochaDone) => {
            oldDeploymentName = makeRandomString();
            newDeploymentName = makeRandomString();
            
            nixt()
                .stdout(Success.deploymentAdd(appName, oldDeploymentName))
                .run(Command.deploymentAdd(appName, oldDeploymentName))
                .end(done);
        });
        
        it("succeeds", (done: MochaDone) => {
            nixt()
                .stdout(Success.deploymentRename(appName, oldDeploymentName, newDeploymentName))
                .run(Command.deploymentRename(appName, oldDeploymentName, newDeploymentName))
                .end(() => {
                    nixt()
                        .expect(Validate.Deployments.checkForMany({ [oldDeploymentName]: Validate.doesNotExistInContainer, [newDeploymentName]: Validate.existsInContainer }))
                        .run(Command.deploymentLs(appName))
                        .end(done);
                });
        });
        
        it("fails if app not found", (done: MochaDone) => {
            var fakeAppName: string = "not_a_real_app";
            
            nixt()
                .stderr(Error.appNotFound(fakeAppName))
                .run(Command.deploymentRename(fakeAppName, oldDeploymentName, newDeploymentName))
                .end(done);
        });
        
        it("fails if deployment not found", (done: MochaDone) => {
            var fakeDeploymentName: string = "not_a_real_deployment";
            
            nixt()
                .stderr(Error.deploymentNotFound(fakeDeploymentName))
                .run(Command.deploymentRename(appName, fakeDeploymentName, newDeploymentName))
                .end(done);
        });
        
        it("fails if deployment conflict", (done: MochaDone) => {
            nixt()
                .stdout(Success.deploymentAdd(appName, newDeploymentName))
                .run(Command.deploymentAdd(appName, newDeploymentName))
                .end(() => {
                    nixt()
                        .stderr(Error.deploymentConflict(newDeploymentName))
                        .run(Command.deploymentRename(appName, oldDeploymentName, newDeploymentName))
                        .end(done);
                });
        });
    });
    
}
