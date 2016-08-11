import * as assert from "assert";
import * as CodePush from "rest-definitions";
var tryJSON = require("try-json");

export module Validate {
    
    // Types
    
    /** Throws if the nixt response provided is invalid. */
    export type responseValidatorFunction = (result: any) => void;
    
    /** Throws if the object (app, deployment, etc) provided is invalid. */
    export type objectValidatorFunction = (object: any) => void;
    
    /** 
     * Returns a function that throws if the container object being validated does not contain the member in the correct state.
     * If the ObjectValidatorFunction passed is undefined, the associated member is expected not to exist in the container.
     * 
     * Logically, this is equivalent to `assert(assertForMember(member))`
     */
    export type memberValidatorFunction = (member: string, assertForMember: objectValidatorFunction) => objectValidatorFunction;
    
    /**
     * Returns a function that throws if the container object being validated does not contain the members in the correct states.
     * If the ObjectValidatorFunction passed is undefined, the associated member is expected not to exist in the container.
     * 
     * Logically, this is equivalent to `for (var member in membersToCheck) { assert(assertForMember(member)) }`
     */
    export type groupValidatorFunction = (membersToCheck: { [member: string]: objectValidatorFunction }) => objectValidatorFunction;
    
    export interface Validator {
        (): responseValidatorFunction;
        
        internal: objectValidatorFunction;
    }
    
    export interface ContainerValidator extends Validator {
        checkFor: memberValidatorFunction;
        checkForMany: groupValidatorFunction;
    }
    
    export function existsInContainer(object: any): void {
        assert(object, "Object does not exist in container.");
    }
    
    export const doesNotExistInContainer: any = undefined;
    
    // Validators
    
    export const App: Validator = getValidator(validateApp);
    
    export const Apps: ContainerValidator = getContainerValidator(validateApps, checkForApps);
    
    export const CollaboratorMap: ContainerValidator = getContainerValidator(validateCollaboratorMap, checkForCollaboratorMap);
    
    export const Deployments: ContainerValidator = getContainerValidator(validateDeployments, checkForDeployments);
    
    export const Package: Validator = getValidator(validatePackage);
    
    export const Packages: ContainerValidator = getContainerValidator(validatePackages, checkForPackages)
    
    ////////////////////////////////////////////////////////////////////
    // Implementation Details
    
    function getValidator(internal: (object: any) => void): Validator {
        var validator = <Validator>function(): (result: any) => void {
            return validateResponse(internal);
        }
        validator.internal = internal;
        return validator;
    }
    
    function getContainerValidator(internal: responseValidatorFunction, checkForMembers: groupValidatorFunction): ContainerValidator {
        var containerValidator = <ContainerValidator>getValidator(internal);
        containerValidator.checkForMany = (result: any) => { return validateResponse(checkForMembers); };
        containerValidator.checkFor = function(memberName: string, assertForMember: objectValidatorFunction): responseValidatorFunction {
            return validateResponse(checkForMembers({ [memberName]: assertForMember }));
        };
        return containerValidator;
    }
    
    function validateResponse(validateResponseFunction: objectValidatorFunction): responseValidatorFunction {
        return (result: any) => {
            assert(result);
            assert(result.stdout);
            validateResponseFunction(tryJSON(result.stdout));
        };
    }
    
    // utility
    
    function assertValueAndRemoveFromTuple<T>(value: T, index: string, tuplesToCheck: { [index: string]: objectValidatorFunction }): void {
        // The value must either be not in the tuples to check or have a validator function associated with it.
        if ((index in tuplesToCheck)) {
            assert(!!tuplesToCheck[index], index + " was not expected to be found in the container.")
            tuplesToCheck[index](value);
            delete tuplesToCheck[index];
        }
    }
    
    // App validation functions
    
    function validateApp(app: CodePush.App): void {
        assert(app);

        assert(app.name, "App does not have a name.");

        validateCollaboratorMap(app.collaborators);
    }
    
    function validateApps(apps: CodePush.App[]): void {
        assert(apps);

        var doesNameExist: { [name: string]: boolean } = {};

        apps.forEach((app: CodePush.App) => {
            assert(!doesNameExist[app.name], "User has two apps of the same name.");
            doesNameExist[app.name] = true;
            
            validateApp(app);
        });
    }

    function checkForApps(appTuplesToCheck: { [appName: string]: objectValidatorFunction }): objectValidatorFunction {
        return (apps: CodePush.App[]) => {
            validateApps(apps);
            
            apps.forEach((app: CodePush.App) => {
                assertValueAndRemoveFromTuple(app, app.name, appTuplesToCheck);
            });
            
            for (var appName in appTuplesToCheck) {
                assert(!appTuplesToCheck[appName], "An app was expected to be in the list of apps but was not found!");
            }
        };
    }
    
    // Collaborator validation functions
    
    function validateCollaboratorMap(collaboratorMap: CodePush.CollaboratorMap): void {
        assert(collaboratorMap);

        // An app must have exactly one owner and an infinite amount of collaborators in its collaborator list.
        var hasOwner: boolean = false;
        // An app must have exactly one collaborator marked as the current account.
        var hasCurrentAccount: boolean = false;

        // No two collaborators can share the same email.
        var doesEmailExist: { [email: string]: boolean } = {};

        for (var email in collaboratorMap) {
            assert(!doesEmailExist[email], "Two collaborators share the same email!");
            doesEmailExist[email] = true;

            var collaboratorProperties: CodePush.CollaboratorProperties = collaboratorMap[email];

            var isOwner: boolean = collaboratorProperties.permission === "Owner";
            assert(!(isOwner && hasOwner), "Two collaborators are owners!");
            hasOwner = isOwner;

            var isCurrentAccount: boolean = collaboratorProperties.isCurrentAccount;
            assert(!(isCurrentAccount && hasCurrentAccount), "Two collaborators are the current account!");
            hasCurrentAccount = isCurrentAccount;
        }

        assert(hasOwner, "No collaborator is an owner.");
        assert(hasCurrentAccount, "No collaborator is the current account!");
    }

    function checkForCollaboratorMap(collaboratorTuplesToCheck: { [email: string]: objectValidatorFunction }): (collaboratorMap: CodePush.CollaboratorMap) => void {
        return (collaboratorMap: CodePush.CollaboratorMap) => {
            validateCollaboratorMap(collaboratorMap);
            
            for (var email in collaboratorMap) {
                assertValueAndRemoveFromTuple(collaboratorMap[email], email, collaboratorTuplesToCheck);
            }
            
            for (var email in collaboratorTuplesToCheck) {
                assert(!collaboratorTuplesToCheck[email], "A collaborator was expected to be in the collaborator map but was not found!");
            }
        };
    }
    
    // Deployment validation functions
    
    function validateDeployments(deployments: CodePush.Deployment[]): void {
        assert(deployments);
        
        // No two deployments for a single app can share the same name or key.
        var doesNameExist: { [name: string]: boolean } = {};
        var doesKeyExist: { [key: string]: boolean } = {};
        
        deployments.forEach((deployment: CodePush.Deployment) => {
            assert(!doesNameExist[deployment.name], "Two deployments have the same name!");
            doesNameExist[deployment.name] = true;
            
            assert(!doesKeyExist[deployment.key], "Two deployments have the same key!");
            doesKeyExist[deployment.key] = true;
            
            !!deployment.package && validatePackage(deployment.package);
        });
    }

    function checkForDeployments(deploymentTuplesToCheck: { [deploymentName: string]: objectValidatorFunction }): objectValidatorFunction {
        return (deployments: CodePush.Deployment[]) => {
            validateDeployments(deployments);
            
            deployments.forEach((deployment: CodePush.Deployment) => {
                assertValueAndRemoveFromTuple(deployment, deployment.name, deploymentTuplesToCheck);
            });
            
            for (var deploymentName in deploymentTuplesToCheck) {
                assert(!deploymentTuplesToCheck[deploymentName], "A deployment was expected to be in the list of deployments but was not found!");
            }
        };
    }
    
    // Package validation functions
    
    function validatePackage(codePushPackage: CodePush.Package): void {
        assert(codePushPackage);
        
        assert(codePushPackage.appVersion, "Package does not have an app version.");
        assert(codePushPackage.label, "Package does not have a label.");
        assert(codePushPackage.packageHash, "Package does not have a hash.");
        
        if (codePushPackage.rollout != undefined && codePushPackage.rollout != null) {
            assert(codePushPackage.rollout > 0, "Package has a negative or zero rollout. (" + codePushPackage.rollout + ")");
            assert(codePushPackage.rollout <= 100, "Package has a rollout greater than 100. (" + codePushPackage.rollout + ")");
        }
        
        assert(codePushPackage.size > 0, "Package has a negative or zero size. (" + codePushPackage.size + ")");
        assert(codePushPackage.uploadTime > 0, "Package has a negative or zero uploadTime. (" + codePushPackage.uploadTime + ")");
    }
    
    function validatePackages(packages: CodePush.Package[]): void {
        assert(packages);
        
        function convertLabelStringToNumber(label: string): number {
            return Number(label.substr(1, label.length - 1));
        }
        
        // Labels must be increasing (v1, v2, v3, ...) and may not repeat.
        var lastLabelNumber: number;
        // If a rollout for a package is less than 100, there cannot no package afterwards can share its app version.
        var appVersionRollout: { [appVersion: string]: boolean } = {};
        
        for (var i: number = 0; i < packages.length; i++) {
            var codePushPackage: CodePush.Package = packages[i];
            var currentNumber = convertLabelStringToNumber(codePushPackage.label);
            if (!!lastLabelNumber) assert(currentNumber <= lastLabelNumber, "Package history contains multiple packages of the same label or is incorrectly ordered.");
            lastLabelNumber = currentNumber;
            
            assert(!appVersionRollout[codePushPackage.appVersion], "Package history contains a package after an incomplete rollout.");
            appVersionRollout[codePushPackage.appVersion] = codePushPackage.rollout < 100;
        }
    }

    function checkForPackages(packageTuplesToCheck: { [label: string]: objectValidatorFunction }): objectValidatorFunction {
        return (packages: CodePush.Package[]) => {
            validatePackages(packages);
            
            packages.forEach((codePushPackage: CodePush.Package) => {
                assertValueAndRemoveFromTuple(codePushPackage, codePushPackage.label, packageTuplesToCheck);
            });
            
            for (var label in packageTuplesToCheck) {
                assert(!packageTuplesToCheck[label], "A package was expected to be in the package history but was not found!");
            }
        };
    }
}