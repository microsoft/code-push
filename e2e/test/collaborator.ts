import * as assert from "assert";
import * as CodePush from "rest-definitions";
import { Command } from "./utils/command";
import { Error } from "./utils/error";
import { makeRandomString } from "./utils/misc";
import { Success } from "./utils/success";
var nixt = require("nixt");
var tryJSON = require("try-json");

export function collaboratorTests() {
    var appName: string = makeRandomString();
    before((done: MochaDone) => {
        nixt()
            .stdout(Success.appAdd(appName))
            .run(Command.appAdd(appName))
            .end(done);
    });
    
    
}
