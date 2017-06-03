"use strict";

// IMPORTS //

import os = require("os");
import path = require("path");
import Platform = require("./platform");
import Q = require("q");
import { ProjectManager } from "./projectManager";
import ServerUtil = require("./serverUtil");
import { TestBuilder, TestContext } from "./testBuilder";
import TestConfig = require("./testConfig");
import { TestUtil } from "./testUtil";

//////////////////////////////////////////////////////////////////////////////////////////
/**
 * Call this function to initialize the automated tests.
 */
export function initializeTests(projectManager: ProjectManager, supportedTargetPlatforms: Platform.IPlatform[], describeTests: (projectManager: ProjectManager, targetPlatform: Platform.IPlatform) => void): void {
    
    // DETERMINE PLATFORMS TO TEST //
    
    /** The platforms to test on. */
    var targetPlatforms: Platform.IPlatform[] = [];
    
    supportedTargetPlatforms.forEach(supportedPlatform => {
        if (TestUtil.readMochaCommandLineFlag(supportedPlatform.getCommandLineFlagName())) targetPlatforms.push(supportedPlatform);
    });
    
    // Log current configuration
    
    console.log("Initializing tests for " + TestUtil.getPluginName());
    console.log(TestConfig.TestAppName + "\n" + TestConfig.TestNamespace);
    console.log("Testing " + TestConfig.thisPluginPath + ".");
    targetPlatforms.forEach(platform => {
        console.log("On " + platform.getName());
    });
    console.log("test run directory = " + TestConfig.testRunDirectory);
    console.log("updates directory = " + TestConfig.updatesDirectory);
    if (TestConfig.onlyRunCoreTests) console.log("--only running core tests--");
    if (TestConfig.shouldSetup) console.log("--setting up--");
    if (TestConfig.restartEmulators) console.log("--restarting emulators--");
    
    // FUNCTIONS //

    function cleanupTest(): void {
        console.log("Cleaning up!");
        ServerUtil.updateResponse = undefined;
        ServerUtil.testMessageCallback = undefined;
        ServerUtil.updateCheckCallback = undefined;
        ServerUtil.testMessageResponse = undefined;
    }

    /**
     * Sets up tests for each platform.
     * Creates the test project directory and the test update directory.
     * Starts required emulators.
     */
    function setupTests(): void {
        it("sets up tests correctly", (done) => {
            var promises: Q.Promise<void>[] = [];
            
            targetPlatforms.forEach(platform => {
                promises.push(platform.getEmulatorManager().bootEmulator(TestConfig.restartEmulators));
            });
            
            console.log("Building test project.");
            // create the test project
            promises.push(createTestProject(TestConfig.testRunDirectory)
                .then(() => {
                    console.log("Building update project.");
                    // create the update project
                    return createTestProject(TestConfig.updatesDirectory);
                }).then(() => { return null; }));
                
            Q.all<void>(promises).then(() => { done(); }, (error) => { done(error); });
        });
    }

    /**
     * Creates a test project directory at the given path.
     */
    function createTestProject(directory: string): Q.Promise<void> {
        return projectManager.setupProject(directory, TestConfig.templatePath, TestConfig.TestAppName, TestConfig.TestNamespace);
    }

    /**
     * Creates and runs the tests from the projectManager and TestBuilderDescribe objects passed to initializeTests.
     */
    function createAndRunTests(targetPlatform: Platform.IPlatform): void {
        describe("CodePush", function() {
            before(() => {
                ServerUtil.setupServer(targetPlatform);
                return targetPlatform.getEmulatorManager().uninstallApplication(TestConfig.TestNamespace)
                    .then(projectManager.preparePlatform.bind(projectManager, TestConfig.testRunDirectory, targetPlatform))
                    .then(projectManager.preparePlatform.bind(projectManager, TestConfig.updatesDirectory, targetPlatform));
            });
            
            after(() => {
                ServerUtil.cleanupServer();
                return projectManager.cleanupAfterPlatform(TestConfig.testRunDirectory, targetPlatform).then(projectManager.cleanupAfterPlatform.bind(projectManager, TestConfig.updatesDirectory, targetPlatform));
            });

            TestContext.projectManager = projectManager;
            TestContext.targetPlatform = targetPlatform;

            // Build the tests.
            describeTests(projectManager, targetPlatform);
        });
    }

    // BEGIN TESTING //

    describe("CodePush " + projectManager.getPluginName() + " Plugin", function () {
        this.timeout(100 * 60 * 1000);
        
        if (TestConfig.shouldSetup) describe("Setting Up For Tests", () => setupTests());
        else {
            targetPlatforms.forEach(platform => {
                var prefix: string = (TestConfig.onlyRunCoreTests ? "Core Tests " : "Tests ") + TestConfig.thisPluginPath + " on ";
                describe(prefix + platform.getName(), () => createAndRunTests(platform));
            });
        }
    });
}