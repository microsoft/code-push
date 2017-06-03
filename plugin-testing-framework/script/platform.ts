"use strict";

import path = require("path");
import Q = require("q");
import { TestUtil } from "./testUtil";

//////////////////////////////////////////////////////////////////////////////////////////
// BASE INTERFACES

/**
 * Defines a platform supported by CodePush.
 */
export interface IPlatform {
    /**
     * Gets the platform name. (e.g. "android" for the Android platform).
     */
    getName(): string;
    
    /**
     * The command line flag used to determine whether or not this platform should run.
     * Runs when the flag is present, doesn't run otherwise.
     */
    getCommandLineFlagName(): string;
    
    /**
     * Gets the server url used for testing.
     */
    getServerUrl(): string;
    
    /**
     * Gets an IEmulatorManager that is used to control the emulator during the tests.
     */
    getEmulatorManager(): IEmulatorManager;
    
    /**
     * Gets the default deployment key.
     */
    getDefaultDeploymentKey(): string;
}

/**
 * Manages the interaction with the emulator.
 */
export interface IEmulatorManager {
    /**
     * Returns the target emulator, which is specified through the command line.
     */
    getTargetEmulator(): Q.Promise<string>;
    
    /**
     * Boots the target emulator.
     */
    bootEmulator(restartEmulators: boolean): Q.Promise<void>;
    
    /**
     * Launches an already installed application by app id.
     */
    launchInstalledApplication(appId: string): Q.Promise<void>;
    
    /**
     * Ends a running application given its app id.
     */
    endRunningApplication(appId: string): Q.Promise<void>;
    
    /**
     * Restarts an already installed application by app id.
     */
    restartApplication(appId: string): Q.Promise<void>;
    
    /**
     * Navigates away from the current app, waits for a delay (defaults to 1 second), then navigates to the specified app.
     */
    resumeApplication(appId: string, delayBeforeResumingMs?: number): Q.Promise<void>;
    
    /**
     * Prepares the emulator for a test.
     */
    prepareEmulatorForTest(appId: string): Q.Promise<void>;
    
    /**
     * Uninstalls the app from the emulator.
     */
    uninstallApplication(appId: string): Q.Promise<void>;
}

//////////////////////////////////////////////////////////////////////////////////////////
// PLATFORMS

/**
 * Android implementations of IPlatform.
 */
export class Android implements IPlatform {
    private emulatorManager: IEmulatorManager;
    private serverUrl: string;
    
    constructor(emulatorManager: IEmulatorManager) {
        this.emulatorManager = emulatorManager;
    }

    /**
     * Gets the platform name. (e.g. "android" for the Android platform).
     */
    public getName(): string {
        return "android";
    }
    
    /**
     * The command line flag used to determine whether or not this platform should run.
     * Runs when the flag is present, doesn't run otherwise.
     */
    public getCommandLineFlagName(): string {
        return "--android";
    }

    private static ANDROID_SERVER_URL_OPTION_NAME: string = "--androidserver";
    private static DEFAULT_ANDROID_SERVER_URL: string = "http://10.0.2.2:3001";
    
    /**
     * Gets the server url used for testing.
     */
    public getServerUrl(): string {
        if (!this.serverUrl) this.serverUrl = TestUtil.readMochaCommandLineOption(Android.ANDROID_SERVER_URL_OPTION_NAME, Android.DEFAULT_ANDROID_SERVER_URL);
        return this.serverUrl;
    }

    /**
     * Gets an IEmulatorManager that is used to control the emulator during the tests.
     */
    public getEmulatorManager(): IEmulatorManager {
        return this.emulatorManager;
    }

    /**
     * Gets the default deployment key.
     */
    public getDefaultDeploymentKey(): string {
        return "mock-android-deployment-key";
    }
}

/**
 * IOS implementation of IPlatform.
 */
export class IOS implements IPlatform {
    private emulatorManager: IEmulatorManager;
    private serverUrl: string;

    constructor(emulatorManager: IEmulatorManager) {
        this.emulatorManager = emulatorManager;
    }
    
    /**
     * Gets the platform name. (e.g. "android" for the Android platform).
     */
    public getName(): string {
        return "ios";
    }
    
    /**
     * The command line flag used to determine whether or not this platform should run.
     * Runs when the flag is present, doesn't run otherwise.
     */
    public getCommandLineFlagName(): string {
        return "--ios";
    }
    
    private static IOS_SERVER_URL_OPTION_NAME: string = "--iosserver";
    private static DEFAULT_IOS_SERVER_URL: string = "http://127.0.0.1:3000";
    
    /**
     * Gets the server url used for testing.
     */
    public getServerUrl(): string {
        if (!this.serverUrl) this.serverUrl = TestUtil.readMochaCommandLineOption(IOS.IOS_SERVER_URL_OPTION_NAME, IOS.DEFAULT_IOS_SERVER_URL);
        return this.serverUrl;
    }

    /**
     * Gets an IEmulatorManager that is used to control the emulator during the tests.
     */
    public getEmulatorManager(): IEmulatorManager {
        return this.emulatorManager;
    }

    /**
     * Gets the default deployment key.
     */
    public getDefaultDeploymentKey(): string {
        return "mock-ios-deployment-key";
    }
}

//////////////////////////////////////////////////////////////////////////////////////////
// EMULATOR MANAGERS

// bootEmulatorInternal constants
const emulatorMaxReadyAttempts = 5;
const emulatorReadyCheckDelayMs = 30 * 1000;

/**
 * Helper function for EmulatorManager implementations to use to boot an emulator with a given platformName and check, start, and kill methods.
 */
function bootEmulatorInternal(platformName: string, restartEmulators: boolean, targetEmulator: string,
    checkEmulator: () => Q.Promise<void>, startEmulator: (targetEmulator: string) => Q.Promise<void>, killEmulator: () => Q.Promise<void>): Q.Promise<void> {
    var deferred = Q.defer<void>();
    console.log("Setting up " + platformName + " emulator.");
    
    function onEmulatorReady(): Q.Promise<void> {
        console.log(platformName + " emulator is ready!");
        deferred.resolve(undefined);
        return deferred.promise;
    }

    // Called to check if the emulator for the platform is initialized.
    function checkEmulatorReady(): Q.Promise<void> {
        var checkDeferred = Q.defer<void>();
        
        console.log("Checking if " + platformName + " emulator is ready yet...");
        // Dummy command that succeeds if emulator is ready and fails otherwise.
        checkEmulator()
            .then(() => {
                checkDeferred.resolve(undefined);
            }, (error) => {
                console.log(platformName + " emulator is not ready yet!");
                checkDeferred.reject(error);
            });
            
        return checkDeferred.promise;
    }
    
    var emulatorReadyAttempts = 0;
    // Loops checks to see if the emulator is ready and eventually fails after surpassing emulatorMaxReadyAttempts.
    function checkEmulatorReadyLooper(): Q.Promise<void> {
        var looperDeferred = Q.defer<void>();
        
        emulatorReadyAttempts++;
        if (emulatorReadyAttempts > emulatorMaxReadyAttempts) {
            console.log(platformName + " emulator is not ready after " + emulatorMaxReadyAttempts + " attempts, abort.");
            deferred.reject(platformName + " emulator failed to boot.");
            looperDeferred.resolve(undefined);
        }
        
        setTimeout(() => {
                checkEmulatorReady()
                    .then(() => {
                        looperDeferred.resolve(undefined);
                        onEmulatorReady();
                    }, () => {
                        return checkEmulatorReadyLooper().then(() => { looperDeferred.resolve(undefined); }, () => { looperDeferred.reject(undefined); });
                    });
            }, emulatorReadyCheckDelayMs);
            
        return looperDeferred.promise;
    }
    
    // Starts and loops the emulator.
    function startEmulatorAndLoop(): Q.Promise<void> {
        console.log("Booting " + platformName + " emulator named " + targetEmulator + ".");
        startEmulator(targetEmulator).catch((error) => { console.log(error); deferred.reject(error); });
        return checkEmulatorReadyLooper();
    }
    
    var promise: Q.Promise<void>;
    if (restartEmulators) {
        console.log("Killing " + platformName + " emulator.");
        promise = killEmulator().catch(() => { return null; }).then(startEmulatorAndLoop);
    } else {
        promise = checkEmulatorReady().then(onEmulatorReady, startEmulatorAndLoop);
    }
    
    return deferred.promise;
}

export class AndroidEmulatorManager implements IEmulatorManager {

    private static ANDROID_EMULATOR_OPTION_NAME: string = "--androidemu";
    private static DEFAULT_ANDROID_EMULATOR: string = "emulator";
    
    private targetEmulator: string;
    
    /**
     * Returns the target emulator, which is specified through the command line.
     */
    getTargetEmulator(): Q.Promise<string> {
        if (this.targetEmulator) return Q<string>(this.targetEmulator);
        else {
            this.targetEmulator = TestUtil.readMochaCommandLineOption(AndroidEmulatorManager.ANDROID_EMULATOR_OPTION_NAME, AndroidEmulatorManager.DEFAULT_ANDROID_EMULATOR);
            console.log("Using Android emulator named " + this.targetEmulator);
            return Q<string>(this.targetEmulator);
        }
    }
    
    /**
     * Boots the target emulator.
     */
    bootEmulator(restartEmulators: boolean): Q.Promise<void> {
        function checkAndroidEmulator(): Q.Promise<void> {
            // A command that does nothing but only succeeds if the emulator is running.
            // List all of the packages on the device.
            return TestUtil.getProcessOutput("adb shell pm list packages", { noLogCommand: true, noLogStdOut: true, noLogStdErr: true }).then(() => { return null; });
        }
        
        function startAndroidEmulator(androidEmulatorName: string): Q.Promise<void> {
            return TestUtil.getProcessOutput("emulator @" + androidEmulatorName).then(() => { return null; });
        }
        
        function killAndroidEmulator(): Q.Promise<void> {
            return TestUtil.getProcessOutput("adb emu kill").then(() => { return null; });
        }
        
        return this.getTargetEmulator()
            .then<void>((targetEmulator) => {
                return bootEmulatorInternal("Android", restartEmulators, targetEmulator, checkAndroidEmulator, startAndroidEmulator, killAndroidEmulator);
            });
    }
    
    /**
     * Launches an already installed application by app id.
     */
    launchInstalledApplication(appId: string): Q.Promise<void> {
        return TestUtil.getProcessOutput("adb shell monkey -p " + appId + " -c android.intent.category.LAUNCHER 1").then(() => { return null; });
    }
    
    /**
     * Ends a running application given its app id.
     */
    endRunningApplication(appId: string): Q.Promise<void> {
        return TestUtil.getProcessOutput("adb shell am force-stop " + appId).then(() => { return null; });
    }
    
    /**
     * Restarts an already installed application by app id.
     */
    restartApplication(appId: string): Q.Promise<void> {
        return this.endRunningApplication(appId)
            .then<void>(() => {
                // Wait for a second before restarting.
                return Q.delay(1000);
            })
            .then<void>(() => {
            return this.launchInstalledApplication(appId);
        });
    }
    
    /**
     * Navigates away from the current app, waits for a delay (defaults to 1 second), then navigates to the specified app.
     */
    resumeApplication(appId: string, delayBeforeResumingMs: number = 1000): Q.Promise<void> {
        // Open a default Android app (for example, settings).
        return this.launchInstalledApplication("com.android.settings")
            .then<void>(() => {
                console.log("Waiting for " + delayBeforeResumingMs + "ms before resuming the test application.");
                return Q.delay(delayBeforeResumingMs);
            })
            .then<void>(() => {
                // Reopen the app.
                return this.launchInstalledApplication(appId);
            });
    }
    
    /**
     * Prepares the emulator for a test.
     */
    prepareEmulatorForTest(appId: string): Q.Promise<void> {
        return this.endRunningApplication(appId)
            .then(() => { return TestUtil.getProcessOutput("adb shell pm clear " + appId); }).then(() => { return null; });
    }
    
    /**
     * Uninstalls the app from the emulator.
     */
    uninstallApplication(appId: string): Q.Promise<void> {
        return TestUtil.getProcessOutput("adb uninstall " + appId).then(() => { return null; });
    }
}

export class IOSEmulatorManager implements IEmulatorManager {
    
    private static IOS_EMULATOR_OPTION_NAME: string = "--iosemu";
    
    private targetEmulator: string;
    
    /**
     * Returns the target emulator, which is specified through the command line.
     */
    getTargetEmulator(): Q.Promise<string> {
        if (this.targetEmulator) return Q<string>(this.targetEmulator);
        else {
            var deferred = Q.defer<string>();
        
            var targetIOSEmulator: string = TestUtil.readMochaCommandLineOption(IOSEmulatorManager.IOS_EMULATOR_OPTION_NAME);
            
            if (!targetIOSEmulator) {
                // If no iOS simulator is specified, get the most recent iOS simulator to run tests on.
                TestUtil.getProcessOutput("xcrun simctl list", { noLogCommand: true, noLogStdOut: true, noLogStdErr: true })
                    .then<void>(
                        (listOfDevices: string) => {
                            var phoneDevice = /iPhone (\S* )*(\(([0-9A-Z-]*)\))/g;
                            var match = listOfDevices.match(phoneDevice);
                            deferred.resolve(match[match.length - 1]);
                        },
                        (error) => {
                            deferred.reject(error);
                        }
                    );
            } else {
                // Use the simulator specified on the command line.
                deferred.resolve(targetIOSEmulator);
            }
            
            return deferred.promise
                .then<string>((targetEmulator: string) => {
                    this.targetEmulator = targetEmulator;
                    console.log("Using iOS simulator named " + this.targetEmulator);
                    return this.targetEmulator;
                });
        }
    }
    
    /**
     * Boots the target emulator.
     */
    bootEmulator(restartEmulators: boolean): Q.Promise<void> {
        function checkIOSEmulator(): Q.Promise<void> {
            // A command that does nothing but only succeeds if the emulator is running.
            // Get the environment variable with the name "asdf" (return null, not an error, if not initialized).
            return TestUtil.getProcessOutput("xcrun simctl getenv booted asdf", { noLogCommand: true, noLogStdOut: true, noLogStdErr: true }).then(() => { return null; });
        }
        
        function startIOSEmulator(iOSEmulatorName: string): Q.Promise<void> {
            return TestUtil.getProcessOutput("xcrun instruments -w \"" + iOSEmulatorName + "\"", { noLogStdErr: true })
                .catch((error) => { return undefined; /* Always fails because we do not specify a template, which is not necessary to just start the emulator */ }).then(() => { return null; });
        }
        
        function killIOSEmulator(): Q.Promise<void> {
            return TestUtil.getProcessOutput("killall Simulator").then(() => { return null; });
        }
        
        return this.getTargetEmulator()
            .then<void>((targetEmulator) => {
                return bootEmulatorInternal("iOS", restartEmulators, targetEmulator, checkIOSEmulator, startIOSEmulator, killIOSEmulator);
            });
    }
    
    /**
     * Launches an already installed application by app id.
     */
    launchInstalledApplication(appId: string): Q.Promise<void> {
        return TestUtil.getProcessOutput("xcrun simctl launch booted " + appId, undefined).then(() => { return null; });
    }
    
    /**
     * Ends a running application given its app id.
     */
    endRunningApplication(appId: string): Q.Promise<void> {
        return TestUtil.getProcessOutput("xcrun simctl spawn booted launchctl list", { noLogCommand: true, noLogStdOut: true, noLogStdErr: true })
            .then<string>(processListOutput => {
                // Find the app's process.
                var regex = new RegExp("(\\S+" + appId + "\\S+)");
                var execResult: any[] = regex.exec(processListOutput);
                if (execResult) {
                    return execResult[0];
                }
                else {
                    return Q.reject("Could not get the running application label.");
                }
            })
            .then<void>(applicationLabel => {
                // Kill the app if we found the process.
                return TestUtil.getProcessOutput("xcrun simctl spawn booted launchctl stop " + applicationLabel, undefined).then(() => { return null; });
            }, (error) => {
                // We couldn't find the app's process so it must not be running.
                return Q.resolve(error);
            });
    }
    
    /**
     * Restarts an already installed application by app id.
     */
    restartApplication(appId: string): Q.Promise<void> {
        return this.endRunningApplication(appId)
            .then<void>(() => {
                // Wait for a second before restarting.
                return Q.delay(1000);
            })
            .then(() => this.launchInstalledApplication(appId));
    }
    
    /**
     * Navigates away from the current app, waits for a delay (defaults to 1 second), then navigates to the specified app.
     */
    resumeApplication(appId: string, delayBeforeResumingMs: number = 1000): Q.Promise<void> {
        // Open a default iOS app (for example, camera).
        return this.launchInstalledApplication("com.apple.camera")
            .then<void>(() => {
                console.log("Waiting for " + delayBeforeResumingMs + "ms before resuming the test application.");
                return Q.delay(delayBeforeResumingMs);
            })
            .then<void>(() => {
                // Reopen the app.
                return this.launchInstalledApplication(appId);
            });
    }
    
    /**
     * Prepares the emulator for a test.
     */
    prepareEmulatorForTest(appId: string): Q.Promise<void> {
        return this.endRunningApplication(appId);
    }
    
    /**
     * Uninstalls the app from the emulator.
     */
    uninstallApplication(appId: string): Q.Promise<void> {
        return TestUtil.getProcessOutput("xcrun simctl uninstall booted " + appId).then(() => { return null; });
    }
}