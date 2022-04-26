import fs from 'fs';
import path from 'path';
import xml2js from 'xml2js';
import { out } from '../util/interaction';
import { isValidVersion, isLowVersion } from './validation-utils';
import { fileDoesNotExistOrIsDirectory } from './file-utils';
import chalk from 'chalk';
import * as cli from '../definitions/cli';

const plist = require('plist');
const g2js = require('gradle-to-js/lib/parser');
const properties = require('properties');
const childProcess = require('child_process');

export const spawn = childProcess.spawn;

export function getReactNativeProjectAppVersion(
    command: cli.IReleaseReactCommand,
    projectName: string,
): Promise<string> {
    const fileExists = (file: string): boolean => {
        try {
            return fs.statSync(file).isFile();
        } catch (e) {
            return false;
        }
    };

    out.text(chalk.cyan(`Detecting ${command.platform} app version:\n`));

    if (command.platform === 'ios') {
        let resolvedPlistFile: string = command.plistFile;
        if (resolvedPlistFile) {
            // If a plist file path is explicitly provided, then we don't
            // need to attempt to "resolve" it within the well-known locations.
            if (!fileExists(resolvedPlistFile)) {
                throw new Error(
                    "The specified plist file doesn't exist. Please check that the provided path is correct.",
                );
            }
        } else {
            // Allow the plist prefix to be specified with or without a trailing
            // separator character, but prescribe the use of a hyphen when omitted,
            // since this is the most commonly used convetion for plist files.
            if (command.plistFilePrefix && /.+[^-.]$/.test(command.plistFilePrefix)) {
                command.plistFilePrefix += '-';
            }

            const iOSDirectory: string = 'ios';
            const plistFileName = `${command.plistFilePrefix || ''}Info.plist`;

            const knownLocations = [
                path.join(iOSDirectory, projectName, plistFileName),
                path.join(iOSDirectory, plistFileName),
            ];

            resolvedPlistFile = (<any>knownLocations).find(fileExists);

            if (!resolvedPlistFile) {
                throw new Error(
                    `Unable to find either of the following plist files in order to infer your app's binary version: "${knownLocations.join(
                        '", "',
                    )}". If your plist has a different name, or is located in a different directory, consider using either the "--plistFile" or "--plistFilePrefix" parameters to help inform the CLI how to find it.`,
                );
            }
        }

        const plistContents = fs.readFileSync(resolvedPlistFile).toString();

        try {
            var parsedPlist = plist.parse(plistContents);
        } catch (e) {
            throw new Error(
                `Unable to parse "${resolvedPlistFile}". Please ensure it is a well-formed plist file.`,
            );
        }

        if (parsedPlist && parsedPlist.CFBundleShortVersionString) {
            if (isValidVersion(parsedPlist.CFBundleShortVersionString)) {
                out.text(
                    `Using the target binary version value "${parsedPlist.CFBundleShortVersionString}" from "${resolvedPlistFile}".\n`,
                );
                return Promise.resolve(parsedPlist.CFBundleShortVersionString);
            } else {
                throw new Error(
                    `The "CFBundleShortVersionString" key in the "${resolvedPlistFile}" file needs to specify a valid semver string, containing both a major and minor version (e.g. 1.3.2, 1.1).`,
                );
            }
        } else {
            throw new Error(
                `The "CFBundleShortVersionString" key doesn't exist within the "${resolvedPlistFile}" file.`,
            );
        }
    } else if (command.platform === 'android') {
        let buildGradlePath: string = path.join('android', 'app');
        if (command.gradleFile) {
            buildGradlePath = command.gradleFile;
        }
        if (fs.lstatSync(buildGradlePath).isDirectory()) {
            buildGradlePath = path.join(buildGradlePath, 'build.gradle');
        }

        if (fileDoesNotExistOrIsDirectory(buildGradlePath)) {
            throw new Error(`Unable to find gradle file "${buildGradlePath}".`);
        }

        return g2js
            .parseFile(buildGradlePath)
            .catch(() => {
                throw new Error(
                    `Unable to parse the "${buildGradlePath}" file. Please ensure it is a well-formed Gradle file.`,
                );
            })
            .then((buildGradle: any) => {
                let versionName: string = null;

                if (
                    buildGradle.android &&
                    buildGradle.android.defaultConfig &&
                    buildGradle.android.defaultConfig.versionName
                ) {
                    versionName = buildGradle.android.defaultConfig.versionName;
                } else {
                    throw new Error(
                        `The "${buildGradlePath}" file doesn't specify a value for the "android.defaultConfig.versionName" property.`,
                    );
                }

                if (typeof versionName !== 'string') {
                    throw new Error(
                        `The "android.defaultConfig.versionName" property value in "${buildGradlePath}" is not a valid string. If this is expected, consider using the --targetBinaryVersion option to specify the value manually.`,
                    );
                }

                let appVersion: string = versionName.replace(/"/g, '').trim();

                if (isValidVersion(appVersion)) {
                    // The versionName property is a valid semver string,
                    // so we can safely use that and move on.
                    out.text(
                        `Using the target binary version value "${appVersion}" from "${buildGradlePath}".\n`,
                    );
                    return appVersion;
                } else if (/^\d.*/.test(appVersion)) {
                    // The versionName property isn't a valid semver string,
                    // but it starts with a number, and therefore, it can't
                    // be a valid Gradle property reference.
                    throw new Error(
                        `The "android.defaultConfig.versionName" property in the "${buildGradlePath}" file needs to specify a valid semver string, containing both a major and minor version (e.g. 1.3.2, 1.1).`,
                    );
                }

                // The version property isn't a valid semver string
                // so we assume it is a reference to a property variable.
                const propertyName = appVersion.replace('project.', '');
                const propertiesFileName = 'gradle.properties';

                const knownLocations = [
                    path.join('android', 'app', propertiesFileName),
                    path.join('android', propertiesFileName),
                ];

                // Search for gradle properties across all `gradle.properties` files
                var propertiesFile: string = null;
                for (var i = 0; i < knownLocations.length; i++) {
                    propertiesFile = knownLocations[i];
                    if (fileExists(propertiesFile)) {
                        const propertiesContent: string = fs
                            .readFileSync(propertiesFile)
                            .toString();
                        try {
                            const parsedProperties: any = properties.parse(propertiesContent);
                            appVersion = parsedProperties[propertyName];
                            if (appVersion) {
                                break;
                            }
                        } catch (e) {
                            throw new Error(
                                `Unable to parse "${propertiesFile}". Please ensure it is a well-formed properties file.`,
                            );
                        }
                    }
                }

                if (!appVersion) {
                    throw new Error(
                        `No property named "${propertyName}" exists in the "${propertiesFile}" file.`,
                    );
                }

                if (!isValidVersion(appVersion)) {
                    throw new Error(
                        `The "${propertyName}" property in the "${propertiesFile}" file needs to specify a valid semver string, containing both a major and minor version (e.g. 1.3.2, 1.1).`,
                    );
                }

                out.text(
                    `Using the target binary version value "${appVersion}" from the "${propertyName}" key in the "${propertiesFile}" file.\n`,
                );
                return appVersion.toString();
            });
    } else {
        var appxManifestFileName: string = 'Package.appxmanifest';
        try {
            var appxManifestContainingFolder: string = path.join('windows', projectName);
            var appxManifestContents: string = fs
                .readFileSync(path.join(appxManifestContainingFolder, 'Package.appxmanifest'))
                .toString();
        } catch (err) {
            throw new Error(
                `Unable to find or read "${appxManifestFileName}" in the "${path.join(
                    'windows',
                    projectName,
                )}" folder.`,
            );
        }
        return new Promise<string>((resolve, reject) => {
            xml2js.parseString(appxManifestContents, (err: Error, parsedAppxManifest: any) => {
                if (err) {
                    reject(
                        new Error(
                            `Unable to parse the "${path.join(
                                appxManifestContainingFolder,
                                appxManifestFileName,
                            )}" file, it could be malformed.`,
                        ),
                    );
                    return;
                }
                try {
                    const appVersion: string =
                        parsedAppxManifest.Package.Identity[0]['$'].Version.match(
                            /^\d+\.\d+\.\d+/,
                        )[0];
                    out.text(
                        `Using the target binary version value "${appVersion}" from the "Identity" key in the "${appxManifestFileName}" file.\n`,
                    );
                    return resolve(appVersion);
                } catch (e) {
                    reject(
                        new Error(
                            `Unable to parse the package version from the "${path.join(
                                appxManifestContainingFolder,
                                appxManifestFileName,
                            )}" file.`,
                        ),
                    );
                    return;
                }
            });
        });
    }
}

// https://github.com/microsoft/appcenter-cli/blob/master/src/commands/codepush/release-react.ts#L201
// https://github.com/microsoft/appcenter-cli/blob/13495af812558bd952d8aeb9dc01b5be089cd1fc/src/commands/codepush/lib/react-native-utils.ts#L277
function getCliPath(): string {
    if (process.platform === 'win32') {
        return path.join('node_modules', 'react-native', 'local-cli', 'cli.js');
    }

    return path.join('node_modules', '.bin', 'react-native');
}

export function runReactNativeBundleCommand(
    bundleName: string,
    development: boolean,
    entryFile: string,
    outputFolder: string,
    platform: string,
    sourcemapOutput: string,
    config: string,
    extraBundlerOptions?: string[],
): Promise<void> {
    let reactNativeBundleArgs: string[] = [];
    let envNodeArgs: string = process.env.CODE_PUSH_NODE_ARGS;

    if (typeof envNodeArgs !== 'undefined') {
        Array.prototype.push.apply(reactNativeBundleArgs, envNodeArgs.trim().split(/\s+/));
    }

    Array.prototype.push.apply(reactNativeBundleArgs, [
        getCliPath(),
        'bundle',
        '--assets-dest',
        outputFolder,
        '--bundle-output',
        path.join(outputFolder, bundleName),
        '--dev',
        development,
        '--entry-file',
        entryFile,
        '--platform',
        platform,
        ...extraBundlerOptions,
    ]);

    if (sourcemapOutput) {
        reactNativeBundleArgs.push('--sourcemap-output', sourcemapOutput);
    }

    if (config) {
        reactNativeBundleArgs.push('--config', config);
    }

    out.text(chalk.cyan('Running "react-native bundle" command:\n'));
    var reactNativeBundleProcess = spawn('node', reactNativeBundleArgs);
    out.text(`node ${reactNativeBundleArgs.join(' ')}`);

    return new Promise<void>((resolve, reject) => {
        reactNativeBundleProcess.stdout.on('data', (data: Buffer) => {
            out.text(data.toString().trim());
        });

        reactNativeBundleProcess.stderr.on('data', (data: Buffer) => {
            console.error(data.toString().trim());
        });

        reactNativeBundleProcess.on('close', (exitCode: number) => {
            if (exitCode) {
                reject(new Error(`"react-native bundle" command exited with code ${exitCode}.`));
            }

            resolve(<void>null);
        });
    });
}

export function runHermesEmitBinaryCommand(
    bundleName: string,
    outputFolder: string,
    sourcemapOutput: string,
    extraHermesFlags: string[],
): Promise<void> {
    const hermesArgs: string[] = [];
    const envNodeArgs: string = process.env.CODE_PUSH_NODE_ARGS;

    if (typeof envNodeArgs !== 'undefined') {
        Array.prototype.push.apply(hermesArgs, envNodeArgs.trim().split(/\s+/));
    }

    Array.prototype.push.apply(hermesArgs, [
        '-emit-binary',
        '-out',
        path.join(outputFolder, bundleName + '.hbc'),
        path.join(outputFolder, bundleName),
        ...extraHermesFlags,
    ]);

    if (sourcemapOutput) {
        hermesArgs.push('-output-source-map');
    }

    /*
    if (!isDebug()) {
      hermesArgs.push("-w");
    }
    */

    out.text(chalk.cyan('Converting JS bundle to byte code via Hermes, running command:\n'));

    const hermesCommand = getHermesCommand();
    const hermesProcess = spawn(hermesCommand, hermesArgs);
    out.text(`${hermesCommand} ${hermesArgs.join(' ')}`);

    return new Promise<void>((resolve, reject) => {
        hermesProcess.stdout.on('data', (data: Buffer) => {
            out.text(data.toString().trim());
        });

        hermesProcess.stderr.on('data', (data: Buffer) => {
            console.error(data.toString().trim());
        });

        hermesProcess.on('close', (exitCode: number) => {
            if (exitCode) {
                reject(new Error(`"hermes" command exited with code ${exitCode}.`));
            }

            // Copy HBC bundle to overwrite JS bundle
            const source = path.join(outputFolder, bundleName + '.hbc');
            const destination = path.join(outputFolder, bundleName);

            fs.copyFile(source, destination, (err) => {
                if (err) {
                    console.error(err);
                    reject(
                        new Error(
                            `Copying file ${source} to ${destination} failed. "hermes" previously exited with code ${exitCode}.`,
                        ),
                    );
                }
                fs.unlink(source, (err) => {
                    if (err) {
                        console.error(err);
                        reject(err);
                    }

                    resolve(null as void);
                });
            });
        });
    }).then(() => {
        if (!sourcemapOutput) {
            // skip source map compose if source map is not enabled
            return;
        }

        const composeSourceMapsPath = getComposeSourceMapsPath();
        if (!composeSourceMapsPath) {
            throw new Error('react-native compose-source-maps.js scripts is not found');
        }

        const jsCompilerSourceMapFile = path.join(outputFolder, bundleName + '.hbc' + '.map');
        if (!fs.existsSync(jsCompilerSourceMapFile)) {
            throw new Error(`sourcemap file ${jsCompilerSourceMapFile} is not found`);
        }

        return new Promise((resolve, reject) => {
            const composeSourceMapsArgs = [
                sourcemapOutput,
                jsCompilerSourceMapFile,
                '-o',
                sourcemapOutput,
            ];

            // https://github.com/facebook/react-native/blob/master/react.gradle#L211
            // index.android.bundle.packager.map + index.android.bundle.compiler.map = index.android.bundle.map
            const composeSourceMapsProcess = spawn(composeSourceMapsPath, composeSourceMapsArgs);
            out.text(`${composeSourceMapsPath} ${composeSourceMapsArgs.join(' ')}`);

            composeSourceMapsProcess.stdout.on('data', (data: Buffer) => {
                out.text(data.toString().trim());
            });

            composeSourceMapsProcess.stderr.on('data', (data: Buffer) => {
                console.error(data.toString().trim());
            });

            composeSourceMapsProcess.on('close', (exitCode: number) => {
                if (exitCode) {
                    reject(
                        new Error(`"compose-source-maps" command exited with code ${exitCode}.`),
                    );
                }

                // Delete the HBC sourceMap, otherwise it will be included in 'code-push' bundle as well
                fs.unlink(jsCompilerSourceMapFile, (err) => {
                    if (err) {
                        console.error(err);
                        reject(err);
                    }

                    resolve(null);
                });
            });
        });
    });
}

export function getHermesEnabled(gradleFile?: string): Promise<boolean> {
    let buildGradlePath: string = path.join('android', 'app');
    if (gradleFile) {
        buildGradlePath = gradleFile;
    }
    if (fs.lstatSync(buildGradlePath).isDirectory()) {
        buildGradlePath = path.join(buildGradlePath, 'build.gradle');
    }

    if (fileDoesNotExistOrIsDirectory(buildGradlePath)) {
        throw new Error(`Unable to find gradle file "${buildGradlePath}".`);
    }

    return g2js
        .parseFile(buildGradlePath)
        .catch(() => {
            throw new Error(
                `Unable to parse the "${buildGradlePath}" file. Please ensure it is a well-formed Gradle file.`,
            );
        })
        .then((buildGradle: any) => {
            return Array.from(buildGradle['project.ext.react']).includes('enableHermes: true');
        });
}

export function getiOSHermesEnabled(podFile: string): Promise<boolean> {
    let podPath = path.join('ios', 'Podfile');
    if (podFile) {
        podPath = podFile;
    }
    if (fileDoesNotExistOrIsDirectory(podPath)) {
        throw new Error(`Unable to find Podfile file "${podPath}".`);
    }

    return new Promise((resolve, reject) => {
        fs.readFile(podPath, { encoding: 'utf8' }, (error, res) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(/:hermes_enabled(\s+|\n+)?=>(\s+|\n+)?true/.test(res));
        });
    });
}

function getHermesOSBin(): string {
    switch (process.platform) {
        case 'win32':
            return 'win64-bin';
        case 'darwin':
            return 'osx-bin';
        case 'freebsd':
        case 'linux':
        case 'sunos':
        default:
            return 'linux64-bin';
    }
}

function getHermesOSExe(): string {
    const hermesExecutableName = isLowVersion(getReactNativeVersion(), '0.63.0')
        ? 'hermes'
        : 'hermesc';
    switch (process.platform) {
        case 'win32':
            return hermesExecutableName + '.exe';
        default:
            return hermesExecutableName;
    }
}

function getHermesCommand(): string {
    const fileExists = (file: string): boolean => {
        try {
            return fs.statSync(file).isFile();
        } catch (e) {
            return false;
        }
    };
    // assume if hermes-engine exists it should be used instead of hermesvm
    const hermesEngine = path.join(
        'node_modules',
        'hermes-engine',
        getHermesOSBin(),
        getHermesOSExe(),
    );
    if (fileExists(hermesEngine)) {
        return hermesEngine;
    }
    return path.join('node_modules', 'hermesvm', getHermesOSBin(), 'hermes');
}

function getComposeSourceMapsPath(): string {
    // detect if compose-source-maps.js script exists
    const composeSourceMaps = path.join(
        'node_modules',
        'react-native',
        'scripts',
        'compose-source-maps.js',
    );
    if (fs.existsSync(composeSourceMaps)) {
        return composeSourceMaps;
    }
    return null;
}

export function getReactNativeVersion(): string {
    try {
        // eslint-disable-next-line security/detect-non-literal-require
        const projectPackageJson: any = require(path.join(process.cwd(), 'package.json'));
        const projectName: string = projectPackageJson.name;
        if (!projectName) {
            throw new Error(
                `The "package.json" file in the CWD does not have the "name" field set.`,
            );
        }

        return (
            projectPackageJson.dependencies['react-native'] ||
            (projectPackageJson.devDependencies &&
                projectPackageJson.devDependencies['react-native'])
        );
    } catch (error) {
        throw new Error(
            `Unable to find or read "package.json" in the CWD. The "release-react" command must be executed in a React Native project folder.`,
        );
    }
}
