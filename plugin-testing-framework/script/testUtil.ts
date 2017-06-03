"use strict";

var archiver = require("archiver");
import child_process = require("child_process");
var del = require("del");
import fs = require("fs");
import os = require("os");
import path = require("path");
var replace = require("replace");
import Q = require("q");

export class TestUtil {
    //// Placeholders
    // Used in the template to represent data that needs to be added by the testing framework at runtime.
    
    public static ANDROID_KEY_PLACEHOLDER: string = "CODE_PUSH_ANDROID_DEPLOYMENT_KEY";
    public static IOS_KEY_PLACEHOLDER: string = "CODE_PUSH_IOS_DEPLOYMENT_KEY";
    public static SERVER_URL_PLACEHOLDER: string = "CODE_PUSH_SERVER_URL";
    public static INDEX_JS_PLACEHOLDER: string = "CODE_PUSH_INDEX_JS_PATH";
    public static CODE_PUSH_APP_VERSION_PLACEHOLDER: string = "CODE_PUSH_APP_VERSION";
    public static CODE_PUSH_TEST_APP_NAME_PLACEHOLDER: string = "CODE_PUSH_TEST_APP_NAME";
    public static CODE_PUSH_APP_ID_PLACEHOLDER: string = "CODE_PUSH_TEST_APPLICATION_ID";
    public static PLUGIN_VERSION_PLACEHOLDER: string = "CODE_PUSH_PLUGIN_VERSION";
    
    //// Command Line Input Functions
    
	/**
	 * Reads a command line option passed to mocha and returns a default if unspecified.
	 */
    public static readMochaCommandLineOption(optionName: string, defaultValue?: string): string {
        var optionValue: string = undefined;

        for (var i = 0; i < process.argv.length; i++) {
            if (process.argv[i] === optionName) {
                if (i + 1 < process.argv.length) {
                    optionValue = process.argv[i + 1];
                }
                break;
            }
        }
        
        if (!optionValue) optionValue = defaultValue;
        
        return optionValue;
    }

	/**
	 * Reads command line options passed to mocha.
	 */
    public static readMochaCommandLineFlag(optionName: string): boolean {
        for (var i = 0; i < process.argv.length; i++) {
            if (process.argv[i] === optionName) {
                return true;
            }
        }
        return false;
    }
    
    //// Utility Functions
    
    /**
     * Executes a child process and returns a promise that resolves with its output or rejects with its error.
     */
    public static getProcessOutput(command: string, options?: {
            cwd?: string;
            stdio?: any;
            customFds?: any;
            env?: any;
            encoding?: string;
            timeout?: number;
            maxBuffer?: number;
            killSignal?: string;
            noLogCommand?: boolean;
            noLogStdOut?: boolean;
            noLogStdErr?: boolean;
        }): Q.Promise<string> {
        
        var deferred = Q.defer<string>();

        options = options || {};
        
        // set default options
        if (options.maxBuffer === undefined) options.maxBuffer = 1024 * 500;
        if (options.timeout === undefined) options.timeout = 10 * 60 * 1000;

        if (!options.noLogCommand) console.log("Running command: " + command);

        var execProcess = child_process.exec(command, options, (error: Error, stdout: Buffer, stderr: Buffer) => {
            if (error) {
                if (!options.noLogStdErr) console.error("" + error);
                deferred.reject(error);
            } else {
                deferred.resolve(stdout.toString());
            }
        });
        
        if (!options.noLogStdOut) execProcess.stdout.pipe(process.stdout);
        if (!options.noLogStdErr) execProcess.stderr.pipe(process.stderr);
        
        execProcess.on('error', function (error: any) {
            if (!options.noLogStdErr) console.error("" + error);
            deferred.reject(error);
        })

        return deferred.promise;
    }
    
    /**
     * Returns the name of the plugin that is being tested.
     */
    public static getPluginName(): string {
        var packageFile = eval("(" + fs.readFileSync("./package.json", "utf8") + ")");
        return packageFile.name;
    }

	/**
	 * Replaces a regex in a file with a given string.
	 */
    public static replaceString(filePath: string, regex: string, replacement: string): void {
        console.log("replacing \"" + regex + "\" with \"" + replacement + "\" in " + filePath);
        replace({ regex: regex, replacement: replacement, recursive: false, silent: true, paths: [filePath] });
    }

    /**
     * Copies a file from a given location to another.
     */
    public static copyFile(source: string, destination: string, overwrite: boolean): Q.Promise<void> {
        var deferred = Q.defer<void>();

        try {
            var errorHandler = (error: any) => {
                deferred.reject(error);
            };

            if (overwrite && fs.existsSync(destination)) {
                fs.unlinkSync(destination);
            }

            var readStream: fs.ReadStream = fs.createReadStream(source);
            readStream.on("error", errorHandler);

            var writeStream: fs.WriteStream = fs.createWriteStream(destination);
            writeStream.on("error", errorHandler);
            writeStream.on("close", deferred.resolve.bind(undefined, undefined));
            readStream.pipe(writeStream);
        } catch (e) {
            deferred.reject(e);
        }

        return deferred.promise;
    }
    
    /**
     * Archives the contents of sourceFolder and puts it in an archive at archivePath in targetFolder.
     */
    public static archiveFolder(sourceFolder: string, targetFolder: string, archivePath: string, isDiff: boolean): Q.Promise<string> {
        var deferred = Q.defer<string>();
        var archive = archiver.create("zip", {});
        
        console.log("Creating an update archive at: " + archivePath);

        if (fs.existsSync(archivePath)) {
            fs.unlinkSync(archivePath);
        }
        var writeStream = fs.createWriteStream(archivePath);

        writeStream.on("close", function() {
            deferred.resolve(archivePath);
        });

        archive.on("error", function(e: Error) {
            deferred.reject(e);
        });

        if (isDiff) {
            archive.append(`{"deletedFiles":[]}`, { name: "hotcodepush.json" });
        }
        
        archive.directory(sourceFolder, targetFolder);
        archive.pipe(writeStream);
        archive.finalize();

        return deferred.promise;
    }
}