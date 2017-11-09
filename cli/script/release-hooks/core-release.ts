/// <reference path="../../../definitions/external/q/Q.d.ts" />
/// <reference path="../../../definitions/external/node/node.d.ts" />
/// <reference path="../../definitions/recursive-fs.d.ts" />
/// <reference path="../../definitions/slash.d.ts" />
/// <reference path="../definitions/slash.d.ts" />
/// <reference path="../../definitions/generated/code-push.d.ts" />

import * as fs from "fs";
import * as path from "path";
import * as recursiveFs from "recursive-fs";
import slash = require("slash");
import * as Q from "q";
import Promise = Q.Promise;
import * as yazl from "yazl";
var progress = require("progress");

import AccountManager = require("code-push");
import {Package, PackageInfo} from "code-push/script/types";
import {CommonUtils} from "../common-utils";
var log = CommonUtils.log;
import * as cli from "../../definitions/cli";
import ReleaseFile = cli.ReleaseFile;

var coreReleaseHook: cli.ReleaseHook = (currentCommand: cli.IReleaseCommand, originalCommand: cli.IReleaseCommand, sdk: AccountManager): Promise<cli.IReleaseCommand> => {
    return Q(<void>null)
        .then(() => {
            var releaseFiles: ReleaseFile[] = [];

            if (!fs.lstatSync(currentCommand.package).isDirectory()) {
                releaseFiles.push({
                    sourceLocation: currentCommand.package,
                    targetLocation: path.basename(currentCommand.package)  // Put the file in the root
                });
                return Q(releaseFiles);
            }

            var deferred = Q.defer<ReleaseFile[]>();
            var directoryPath: string = currentCommand.package;
            var baseDirectoryPath = path.join(directoryPath, "..");     // For legacy reasons, put the root directory in the zip

            recursiveFs.readdirr(currentCommand.package, (error?: any, directories?: string[], files?: string[]): void => {
                if (error) {
                    deferred.reject(error);
                    return;
                }

                files.forEach((filePath: string) => {
                    var relativePath: string = path.relative(baseDirectoryPath, filePath);
                    // yazl does not like backslash (\) in the metadata path.
                    relativePath = slash(relativePath);
                    releaseFiles.push({
                        sourceLocation: filePath,
                        targetLocation: relativePath
                    });
                });

                deferred.resolve(releaseFiles);
            });

            return deferred.promise;
        })
        .then((releaseFiles: ReleaseFile[]) => {
            return Promise<string>((resolve: (file: string) => void, reject: (reason: Error) => void): void => {

                var packagePath: string = path.join(process.cwd(), CommonUtils.generateRandomFilename(15) + ".zip");
                var zipFile = new yazl.ZipFile();
                var writeStream: fs.WriteStream = fs.createWriteStream(packagePath);

                zipFile.outputStream.pipe(writeStream)
                    .on("error", (error: Error): void => {
                        reject(error);
                    })
                    .on("close", (): void => {

                        resolve(packagePath);
                    });

                releaseFiles.forEach((releaseFile: ReleaseFile) => {
                    zipFile.addFile(releaseFile.sourceLocation, releaseFile.targetLocation);
                });

                zipFile.end();
            });

        })
        .then((packagePath: string): Promise<cli.IReleaseCommand> => {
            var lastTotalProgress = 0;
            var progressBar = new progress("Upload progress:[:bar] :percent :etas", {
                complete: "=",
                incomplete: " ",
                width: 50,
                total: 100
            });

            var uploadProgress = (currentProgress: number): void => {
                progressBar.tick(currentProgress - lastTotalProgress);
                lastTotalProgress = currentProgress;
            };

            var updateMetadata: PackageInfo = {
                description: currentCommand.description,
                isDisabled: currentCommand.disabled,
                isMandatory: currentCommand.mandatory,
                rollout: currentCommand.rollout
            };

            return sdk.isAuthenticated(true)
                .then((isAuth: boolean): Promise<Package> => {
                    return sdk.release(currentCommand.appName, currentCommand.deploymentName, packagePath, currentCommand.appStoreVersion, updateMetadata, uploadProgress);
                })
                .then((): void => {
                    log(`Successfully released an update containing the "${originalCommand.package}" `
                        + `${fs.lstatSync(originalCommand.package).isDirectory()  ? "directory" : "file"}`
                        + ` to the "${currentCommand.deploymentName}" deployment of the "${currentCommand.appName}" app.`);

                })
                .then(() => currentCommand)
                .finally(() => {
                    fs.unlinkSync(packagePath);
                });
        });
}

export = coreReleaseHook;