"use strict";

// IMPORTS

import assert = require("assert");
var bodyparser = require("body-parser");
var express = require("express");
import platform = require("./platform");
import Q = require("q");

//////////////////////////////////////////////////////////////////////////////////////////
/** The server to respond to requests from the app. */
export var server: any;

//////////////////////////////////////////////////////////////////////////////////////////
// Use these variables to control how the server responds to update checks, test messages, and downloads.

/** Response the server gives the next update check request */
export var updateResponse: any;

/** Response the server gives the next test message request */
export var testMessageResponse: any;

/** Called after the next test message request */
export var testMessageCallback: (requestBody: any) => void;

/** Called after the next update check request */
export var updateCheckCallback: (requestBody: any) => void;

/** Location of the update package given in the update check response */
export var updatePackagePath: string;

//////////////////////////////////////////////////////////////////////////////////////////
// Use these functions to set up and shut down the server.

/**
 * Sets up the server that the test app uses to send test messages and check for and download updates.
 */
export function setupServer(targetPlatform: platform.IPlatform) {
    console.log("Setting up server at " + targetPlatform.getServerUrl());
    
    var app = express();
    app.use(bodyparser.json());
    app.use(bodyparser.urlencoded({ extended: true }));
    
    app.use(function(req: any, res: any, next: any) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "*");
        res.setHeader("Access-Control-Allow-Headers", "origin, content-type, accept, X-CodePush-SDK-Version");
        next();
    });

    app.get("/updateCheck", function(req: any, res: any) {
        updateCheckCallback && updateCheckCallback(req);
        res.send(updateResponse);
        console.log("Update check called from the app.");
        console.log("Request: " + JSON.stringify(req.query));
        console.log("Response: " + JSON.stringify(updateResponse));
    });

    app.get("/download", function(req: any, res: any) {
        console.log("Application downloading the package.");
        
        res.download(updatePackagePath);
    });

    app.post("/reportTestMessage", function(req: any, res: any) {
        console.log("Application reported a test message.");
        console.log("Body: " + JSON.stringify(req.body));

        if (!testMessageResponse) {
            console.log("Sending OK");
            res.sendStatus(200);
        } else {
            console.log("Sending body: " + testMessageResponse);
            res.status(200).send(testMessageResponse);
        }

        testMessageCallback && testMessageCallback(req.body);
    });

    var serverPortRegEx = /:([0-9]+)/;
    server = app.listen(+targetPlatform.getServerUrl().match(serverPortRegEx)[1]);
}

/**
 * Closes the server.
 */
export function cleanupServer(): void {
    if (server) {
        server.close();
        server = undefined;
    }
}

//////////////////////////////////////////////////////////////////////////////////////////
// Classes and methods used for sending mock responses to the app.

/**
 * Class used to mock the codePush.checkForUpdate() response from the server.
 */
export class CheckForUpdateResponseMock {
    downloadURL: string;
    isAvailable: boolean;
    packageSize: number;
    updateAppVersion: boolean;
    appVersion: string;
    description: string;
    label: string;
    packageHash: string;
    isMandatory: boolean;
}

/**
 * The model class of the codePush.checkForUpdate() request to the server.
 */
export class UpdateCheckRequestMock {
    deploymentKey: string;
    appVersion: string;
    packageHash: string;
    isCompanion: boolean;
}

/**
 * Returns a default empty response to give to the app in a checkForUpdate request
 */
export function createDefaultResponse(): CheckForUpdateResponseMock {
    var defaultResponse = new CheckForUpdateResponseMock();

    defaultResponse.downloadURL = "";
    defaultResponse.description = "";
    defaultResponse.isAvailable = false;
    defaultResponse.isMandatory = false;
    defaultResponse.appVersion = "";
    defaultResponse.packageHash = "";
    defaultResponse.label = "";
    defaultResponse.packageSize = 0;
    defaultResponse.updateAppVersion = false;

    return defaultResponse;
}

/**
 * Returns a default update response to give to the app in a checkForUpdate request
 */
export function createUpdateResponse(mandatory: boolean = false, targetPlatform?: platform.IPlatform, randomHash: boolean = true): CheckForUpdateResponseMock {
    var updateResponse = new CheckForUpdateResponseMock();
    updateResponse.isAvailable = true;
    updateResponse.appVersion = "1.0.0";
    updateResponse.downloadURL = "mock.url/download";
    updateResponse.isMandatory = mandatory;
    updateResponse.label = "mock-update";
    updateResponse.packageHash = "12345-67890";
    updateResponse.packageSize = 12345;
    updateResponse.updateAppVersion = false;

    if (!!targetPlatform) updateResponse.downloadURL = targetPlatform.getServerUrl() + "/download";
    
    // We need unique hashes to avoid conflicts.
    if (randomHash) {
        updateResponse.packageHash = "randomHash-" + Math.floor(Math.random() * 10000);
    }
    
    return updateResponse;
}

/**
 * Returns a promise that waits for the next set of test messages sent by the app and resolves if that they are equal to the expected messages or rejects if they are not.
 */
export function expectTestMessages(expectedMessages: (string | AppMessage)[]): Q.Promise<void> {
    var deferred = Q.defer<void>();
    
    var messageIndex = 0;
    testMessageCallback = (requestBody: AppMessage) => {
        try {
            console.log("Message index: " + messageIndex);
            if (typeof expectedMessages[messageIndex] === "string") {
                assert.equal(requestBody.message, expectedMessages[messageIndex]);
            }
            else {
                assert(areEqual(requestBody, <AppMessage>expectedMessages[messageIndex]));
            }
            /* end of message array */
            if (++messageIndex === expectedMessages.length) {
                deferred.resolve(undefined);
            }
        } catch (e) {
            deferred.reject(e);
        }
    };
    
    return deferred.promise;
};

//////////////////////////////////////////////////////////////////////////////////////////
// Test messages used by the test app to send state information to the server.

/**
 * Contains all the messages sent from the application to the mock server during tests.
 */
export class TestMessage {
    public static CHECK_UP_TO_DATE = "CHECK_UP_TO_DATE";
    public static CHECK_UPDATE_AVAILABLE = "CHECK_UPDATE_AVAILABLE";
    public static CHECK_ERROR = "CHECK_ERROR";
    public static DOWNLOAD_SUCCEEDED = "DOWNLOAD_SUCCEEDED";
    public static DOWNLOAD_ERROR = "DOWNLOAD_ERROR";
    public static UPDATE_INSTALLED = "UPDATE_INSTALLED";
    public static INSTALL_ERROR = "INSTALL_ERROR";
    public static DEVICE_READY_AFTER_UPDATE = "DEVICE_READY_AFTER_UPDATE";
    public static UPDATE_FAILED_PREVIOUSLY = "UPDATE_FAILED_PREVIOUSLY";
    public static NOTIFY_APP_READY_SUCCESS = "NOTIFY_APP_READY_SUCCESS";
    public static NOTIFY_APP_READY_FAILURE = "NOTIFY_APP_READY_FAILURE";
    public static SKIPPED_NOTIFY_APPLICATION_READY = "SKIPPED_NOTIFY_APPLICATION_READY";
    public static SYNC_STATUS = "SYNC_STATUS";
    public static RESTART_SUCCEEDED = "RESTART_SUCCEEDED";
    public static RESTART_FAILED = "RESTART_FAILED";
    public static PENDING_PACKAGE = "PENDING_PACKAGE";
    public static CURRENT_PACKAGE = "CURRENT_PACKAGE";

    public static SYNC_UP_TO_DATE = 0;
    public static SYNC_UPDATE_INSTALLED = 1;
    public static SYNC_UPDATE_IGNORED = 2;
    public static SYNC_ERROR = 3;
    public static SYNC_IN_PROGRESS = 4;
    public static SYNC_CHECKING_FOR_UPDATE = 5;
    public static SYNC_AWAITING_USER_ACTION = 6;
    public static SYNC_DOWNLOADING_PACKAGE = 7;
    public static SYNC_INSTALLING_UPDATE = 8;
}

/**
 * Contains all the messages sent from the mock server back to the application during tests.
 */
export class TestMessageResponse {
    public static SKIP_NOTIFY_APPLICATION_READY = "SKIP_NOTIFY_APPLICATION_READY";
}

/**
 * Defines the messages sent from the application to the mock server during tests.
 */
export class AppMessage {
    message: string;
    args: any[];

    constructor(message: string, args: any[]) {
        this.message = message;
        this.args = args;
    }

    static fromString(message: string): AppMessage {
        return new AppMessage(message, undefined);
    }
}

/**
 * Checks if two messages are equal.
 */
export function areEqual(m1: AppMessage, m2: AppMessage): boolean {
    /* compare objects */
    if (m1 === m2) {
        return true;
    }

    /* compare messages */
    if (!m1 || !m2 || m1.message !== m2.message) {
        return false;
    }
    
    /* compare arguments */
    if (m1.args === m2.args) {
        return true;
    }

    if (!m1.args || !m2.args || m1.args.length !== m2.args.length) {
        return false;
    }

    for (var i = 0; i < m1.args.length; i++) {
        if (m1.args[i] !== m2.args[i]) {
            return false;
        }
    }

    return true;
}
