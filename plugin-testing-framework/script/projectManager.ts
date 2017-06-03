"use strict";

import Q = require("q");
import platform = require("./platform");
import TestConfig = require("./testConfig");

/**
 * In charge of project related operations.
 */
export class ProjectManager {
    public static DEFAULT_APP_VERSION: string = "Store version";
    
    private static NOT_IMPLEMENTED_ERROR_MSG: string = "This method is unimplemented! Please extend ProjectManager and overwrite it!";
    
    //// ABSTRACT METHODS
    // (not actually abstract because there are some issues with our dts generator that causes it to incorrectly generate abstract classes)
    
    /**
     * Returns the name of the plugin being tested, for example Cordova or React-Native.
     * 
     * Overwrite this in your implementation!
     */
    public getPluginName(): string { throw ProjectManager.NOT_IMPLEMENTED_ERROR_MSG; }

    /**
     * Creates a new test application at the specified path, and configures it
     * with the given server URL, android and ios deployment keys.
     * 
     * Overwrite this in your implementation!
     */
    public setupProject(projectDirectory: string, templatePath: string, appName: string, appNamespace: string, version: string = ProjectManager.DEFAULT_APP_VERSION): Q.Promise<void> { throw ProjectManager.NOT_IMPLEMENTED_ERROR_MSG; }
    
    /**
     * Sets up the scenario for a test in an already existing project.
     * 
     * Overwrite this in your implementation!
     */
    public setupScenario(projectDirectory: string, appId: string, templatePath: string, jsPath: string, targetPlatform: platform.IPlatform, version: string = ProjectManager.DEFAULT_APP_VERSION): Q.Promise<void> { throw ProjectManager.NOT_IMPLEMENTED_ERROR_MSG; }

    /**
     * Creates a CodePush update package zip for a project.
     * 
     * Overwrite this in your implementation!
     */
    public createUpdateArchive(projectDirectory: string, targetPlatform: platform.IPlatform, isDiff?: boolean): Q.Promise<string> { throw ProjectManager.NOT_IMPLEMENTED_ERROR_MSG; }
    
    /**
     * Prepares a specific platform for tests.
     * 
     * Overwrite this in your implementation!
     */
    public preparePlatform(projectDirectory: string, targetPlatform: platform.IPlatform): Q.Promise<void> { throw ProjectManager.NOT_IMPLEMENTED_ERROR_MSG; }
    
    /**
     * Cleans up a specific platform after tests.
     * 
     * Overwrite this in your implementation!
     */
    public cleanupAfterPlatform(projectDirectory: string, targetPlatform: platform.IPlatform): Q.Promise<void> { throw ProjectManager.NOT_IMPLEMENTED_ERROR_MSG; }

    /**
     * Runs the test app on the given target / platform.
     * 
     * Overwrite this in your implementation!
     */
    public runApplication(projectDirectory: string, targetPlatform: platform.IPlatform): Q.Promise<void> { throw ProjectManager.NOT_IMPLEMENTED_ERROR_MSG; }
}

//////////////////////////////////////////////////////////////////////////////////////////
// Wrapper functions for simpler code in test cases.

/**
 * Wrapper for ProjectManager.setupScenario in the TestRun directory.
 */
export function setupTestRunScenario(projectManager: ProjectManager, targetPlatform: platform.IPlatform, scenarioJsPath: string, version?: string): Q.Promise<void> {
    return projectManager.setupScenario(TestConfig.testRunDirectory, TestConfig.TestNamespace, TestConfig.templatePath, scenarioJsPath, targetPlatform, version);
}

/**
 * Creates an update and zip for the test app using the specified scenario and version.
 */
export function setupUpdateScenario(projectManager: ProjectManager, targetPlatform: platform.IPlatform, scenarioJsPath: string, version: string): Q.Promise<string> {
    return projectManager.setupScenario(TestConfig.updatesDirectory, TestConfig.TestNamespace, TestConfig.templatePath, scenarioJsPath, targetPlatform, version)
        .then<string>(projectManager.createUpdateArchive.bind(projectManager, TestConfig.updatesDirectory, targetPlatform));
}