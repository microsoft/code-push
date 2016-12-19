import * as childProcess from "child_process";
import * as cli from "../../definitions/cli";
import * as moment from "moment";
import * as path from "path";
import * as Q from "q";

const simctl = require("simctl");
const which = require("which");

interface IDebugPlatform {
    getLogProcess(): any;
    normalizeLogMessage(message: string): string;
}

class AndroidDebugPlatform implements IDebugPlatform {
    public getLogProcess(): any {
        try {
            which.sync("adb");
        } catch (e) {
            throw new Error("ADB command not found. Please ensure it is installed and available on your path.");
        }

        const numberOfAvailableDevices = this.getNumberOfAvailableDevices();
        if (numberOfAvailableDevices === 0) {
            throw new Error("No Android devices found. Re-run this command after starting one.");
        }

        // For now there is no ability to specify device for debug like:
        // code-push debug android "192.168.121.102:5555"
        // So we have to throw an error in case more than 1 android device was attached 
        // otherwise we will very likely run into an exception while trying to read ‘adb logcat’ from device which codepushified app is not running on.
        if (numberOfAvailableDevices > 1) { 
            throw new Error(`Found "${numberOfAvailableDevices}" android devices. Please leave only one device you need to debug.`);
        }

        return childProcess.spawn("adb", ["logcat"]);
    }

    // The following is an example of what the output looks
    // like when running the "adb devices" command.
    //
    // List of devices attached
    // emulator-5554    device
    // 192.168.121.102:5555    device
    private getNumberOfAvailableDevices(): number {
        const output = childProcess.execSync("adb devices").toString();
        const matches = output.match(/\b(device)\b/mig);
        if (matches != null) {
            return matches.length;
        }
        return 0;
    }

    public normalizeLogMessage(message: string): string {
        // Check to see whether the message includes the source URL
        // suffix, and if so, strip it. This can occur in Android Cordova apps.
        const sourceURLIndex: number = message.indexOf("\", source: file:///");
        if (~sourceURLIndex) {
            return message.substring(0, sourceURLIndex);
        } else {
            return message;
        }
    }
}

class iOSDebugPlatform implements IDebugPlatform {
    private getSimulatorID(): string {
        const output: any = simctl.list({ devices: true, silent: true });
        const simulators: string[] = output.json.devices
                                        .map((platform: any) => platform.devices)
                                        .reduce((prev: any, next: any) => prev.concat(next))
                                        .filter((device: any) => device.state === "Booted")
                                        .map((device: any) => device.id);

        return simulators[0];
    }

    public getLogProcess(): any {
        if (process.platform !== "darwin") {
            throw new Error("iOS debug logs can only be viewed on OS X.");
        }

        const simulatorID: string = this.getSimulatorID();
        if (!simulatorID) {
            throw new Error("No iOS simulators found. Re-run this command after starting one."); 
        }

        const logFilePath: string = path.join(process.env.HOME, "Library/Logs/CoreSimulator", simulatorID, "system.log");
        return childProcess.spawn("tail", ["-f", logFilePath]);
    }

    public normalizeLogMessage(message: string): string {
        return message;
    }
}

const logMessagePrefix = "[CodePush] ";
function processLogData(logData: Buffer) {
    const content = logData.toString()
    content.split("\n")
        .filter((line: string) => line.indexOf(logMessagePrefix) > -1)
        .map((line: string) => {
            // Allow the current platform
            // to normalize the message first.
            line = this.normalizeLogMessage(line);

            // Strip the CodePush-specific, platform agnostic
            // log message prefix that is added to each entry.
            const message = line.substring(line.indexOf(logMessagePrefix) + logMessagePrefix.length);
            
            const timeStamp = moment().format("hh:mm:ss");
            return `[${timeStamp}] ${message}`;
        })
        .forEach((line: string) => console.log(line));
}

const debugPlatforms: any = {
    android: new AndroidDebugPlatform(),
    ios: new iOSDebugPlatform()
};

export default function (command: cli.IDebugCommand): Q.Promise<void> {
    return Q.Promise<void>((resolve, reject) => {
        const platform: string = command.platform.toLowerCase();
        const debugPlatform: IDebugPlatform = debugPlatforms[platform];

        if (!debugPlatform) {
            const availablePlatforms = Object.getOwnPropertyNames(debugPlatforms);
            return reject(new Error(`"${platform}" is an unsupported platform. Available options are ${availablePlatforms.join(", ")}.`));
        }

        try {
            const logProcess = debugPlatform.getLogProcess();
            console.log(`Listening for ${platform} debug logs (Press CTRL+C to exit)`);

            logProcess.stdout.on("data", processLogData.bind(debugPlatform));
            logProcess.stderr.on("data", reject);

            logProcess.on("close", resolve); 
        } catch (e) {
            reject(e);
        }
    }); 
};