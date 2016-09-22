import * as cli from "../../definitions/cli";
import * as crypto from "crypto";
import * as fs from "fs";
import * as hashUtils from "../hash-utils";
import * as jwt from "jsonwebtoken";
import * as os from "os";
import * as path from "path";
import * as q from "q";
var rimraf = require("rimraf");

var CURRENT_CLAIM_VERSION: string = "1.0.0";
var METADATA_FILE_NAME: string = ".codepushrelease"

interface CodeSigningClaims {
    claimVersion: string;
    contentHash: string;
}

export default function sign(command: cli.IReleaseCommand): q.Promise<cli.IReleaseCommand> {
    if (!command.signingKeyPath) {
        return q(command);
    }

    var signingKey: Buffer;
    var signatureFilePath: string;

    return q(<void>null)
        .then(() => {
            try {
                signingKey = fs.readFileSync(command.signingKeyPath);
            } catch (err) {
                return q.reject(new Error(`The path specified for the signing key ("${command.signingKeyPath}") was not valid`));
            }

            if (!fs.lstatSync(command.path).isDirectory()) {
                // If releasing a single file, copy the file to a temporary 'CodePush' directory in which to publish the release
                var outputFolderPath: string = path.join(os.tmpdir(), "CodePush");
                rimraf.sync(outputFolderPath);
                fs.mkdirSync(outputFolderPath);

                var outputFilePath: string = path.join(outputFolderPath, path.basename(command.path));
                fs.writeFileSync(outputFilePath, fs.readFileSync(command.path));

                command.path = outputFolderPath;
            }

            signatureFilePath = path.join(command.path, METADATA_FILE_NAME);
            try {
                fs.accessSync(signatureFilePath, fs.F_OK);
                console.log(`Deleting previous release signature at ${signatureFilePath}`);
                rimraf.sync(signatureFilePath);
            } catch (err) {
            }

            return hashUtils.generatePackageHashFromDirectory(command.path, path.join(command.path, ".."));
        })
        .then((hash: string) => {
            var claims: CodeSigningClaims = {
                claimVersion: CURRENT_CLAIM_VERSION,
                contentHash: hash
            };

            return q.nfcall<string>(jwt.sign, claims, signingKey, { algorithm: "RS256" })
                .catch((err: Error) => {
                    return q.reject<string>(new Error("The specified signing key file was not valid"));
                });
        })
        .then((signedJwt: string) => {
            var deferred = q.defer<void>();

            fs.writeFile(signatureFilePath, signedJwt, (err: Error) => {
                if (err) {
                    deferred.reject(err);
                } else {
                    console.log(`Generated a release signature and wrote it to ${signatureFilePath}`);
                    deferred.resolve(<void>null);
                }
            });

            return deferred.promise;
        })
        .then(() => command)
        .catch((err: Error) => {
            err.message = `Could not sign package: ${err.message}`;
            return q.reject<cli.IReleaseCommand>(err);
        });
}