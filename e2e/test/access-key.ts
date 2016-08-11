import * as assert from "assert";
import * as CodePush from "rest-definitions";
import { Command } from "./utils/command";
import { Error } from "./utils/error";
import { makeRandomString } from "./utils/misc";
import { Success } from "./utils/success";
import { Validate } from "./utils/validate";
var nixt = require("nixt");
var tryJSON = require("try-json");

function validateAccessKey(result: any): void {
    var apps: CodePush.App[] = tryJSON(result.stdout);
    assert(apps);
}

export function accessKeyTests() {
    before((done: MochaDone) =>  {
        done();
    });

    after((done: MochaDone) =>  {
        done();
    });

    it("app ls", (done: any) => {
        nixt()
            .expect(validateAccessKey)
            .run(Command.appLs())
            .end(done);
    });
}
