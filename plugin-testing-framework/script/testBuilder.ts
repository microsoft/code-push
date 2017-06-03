"use strict";

// IMPORTS

import Platform = require("./platform");
import { ProjectManager } from "./projectManager";
import ServerUtil = require("./serverUtil");
import TestConfig = require("./testConfig");

//////////////////////////////////////////////////////////////////////////////////////////
// Use this class to create and structure the tests.

// Usage is almost identical to Mocha, but with the addition of the optional "scenarioPath" in describe() and the required "isCoreTest" in it().

export class TestBuilder {
    public static describe = getDescribe();
    public static it = getIt();
}

//////////////////////////////////////////////////////////////////////////////////////////
// Mocha mimicry

/** Singleton class for TestBuilder.describe to use internally to define the context. */
export class TestContext {
    public static projectManager: ProjectManager;
    public static targetPlatform: Platform.IPlatform;
}

export interface ITestBuilderContextDefintion {
    (description: string, spec: () => void, scenarioPath?: string): void;
    only(description: string, spec: () => void, scenarioPath?: string): void;
    skip(description: string, spec: () => void, scenarioPath?: string): void;
}

function describeInternal(func: (description: string, spec: () => void) => Mocha.ISuite | void, description: string, spec: () => void, scenarioPath?: string): Mocha.ISuite | void {
    if (!TestContext.projectManager || !TestContext.targetPlatform) {
        throw new Error("TestContext.projectManager or TestContext.targetPlatform are not defined! Did you call TestBuilder.describe outside of a function you passed to PluginTestingFramework.initializeTests?");
    }

    return func(description, () => {
        afterEach(() => {
            console.log("Cleaning up!");
            ServerUtil.updateResponse = undefined;
            ServerUtil.testMessageCallback = undefined;
            ServerUtil.updateCheckCallback = undefined;
            ServerUtil.testMessageResponse = undefined;
        });

        beforeEach(() => {
            return TestContext.targetPlatform.getEmulatorManager().prepareEmulatorForTest(TestConfig.TestNamespace)
                .catch(() => { /* Sometimes this may fail, particularly if we do it twice in a row, which is possible if you nest TestBuilder.describe, so ignore! */ });
        });

        if (scenarioPath) {
            before(() => {
                return TestContext.projectManager.setupScenario(TestConfig.testRunDirectory, TestConfig.TestNamespace, TestConfig.templatePath, scenarioPath, TestContext.targetPlatform);
            });
        }

        spec();
    });
}

/**
 * Returns a hybrid type that mimics mocha's describe object.
 */
function getDescribe(): ITestBuilderContextDefintion {
    var describer = <ITestBuilderContextDefintion>function(description: string, spec: () => void, scenarioPath?: string): void {
        describeInternal(describe, description, spec, scenarioPath);
    };
    describer.only = function(description: string, spec: () => void, scenarioPath?: string): void {
        describeInternal(describe.only, description, spec, scenarioPath);
    };
    describer.skip = function(description: string, spec: () => void, scenarioPath?: string): void {
        describeInternal(describe.skip, description, spec, scenarioPath);
    };
    return describer;
}

export interface ITestBuilderTestDefinition {
    (expectation: string, isCoreTest: boolean, assertion: (done: MochaDone) => void): void;
    only(expectation: string, isCoreTest: boolean, assertion: (done: MochaDone) => void): void;
    skip(expectation: string, isCoreTest: boolean, assertion: (done: MochaDone) => void): void;
}

function itInternal(func: (expectation: string, assertion: (done: MochaDone) => void) => Mocha.ITest | void, expectation: string, isCoreTest: boolean, assertion: (done: MochaDone) => void): Mocha.ITest {
    if ((!TestConfig.onlyRunCoreTests || isCoreTest)) {
        // Create a wrapper around the assertion to set the timeout on the test to 10 minutes.
        var assertionWithTimeout = function(done: MochaDone) {
            this.timeout(10 * 60 * 1000);
            assertion(done);
        }
        return it(expectation, assertionWithTimeout);
    }
    return null;
}

/**
 * Returns a hybrid type that mimics mocha's it object.
 */
function getIt(): ITestBuilderTestDefinition {
    var itr = <ITestBuilderTestDefinition>function(expectation: string, isCoreTest: boolean, assertion: (done: MochaDone) => void): void {
        itInternal(it, expectation, isCoreTest, assertion);
    };
    itr.only = function(expectation: string, isCoreTest: boolean, assertion: (done: MochaDone) => void): void {
        itInternal(it.only, expectation, isCoreTest, assertion);
    };
    itr.skip = function(expectation: string, isCoreTest: boolean, assertion: (done: MochaDone) => void): void {
        itInternal(it.skip, expectation, isCoreTest, assertion);
    };
    return itr;
}