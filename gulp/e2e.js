"use strict";

var argv = require("yargs").argv;
var file = require("gulp-file");
var gulp = require("gulp");
var install = require("gulp-install");
var path = require("path");
var plugins = require("gulp-load-plugins")();
var runSequence = require("run-sequence");
var spawn = require("child_process").spawn;
var which = require("which");

function getOptions(cwd) {
    return {
        cwd: __dirname + "/../" + cwd,
        base: __dirname + "/../" + cwd
    };
}

gulp.task("codepush-install", function(done) {
    var codePushVersion = argv.version || "latest";
    console.log("Installing code-push-cli@" + codePushVersion);
    var options = getOptions("e2e");

    which("npm", function(err, resolvedPath) {
        if (err) return callback(err);

        var args = ["install", "code-push-cli@" + codePushVersion];

        var codePushInstall = spawn(resolvedPath, args, {cwd: options.cwd});
        codePushInstall.stdout.pipe(process.stdout);
        codePushInstall.stderr.pipe(process.stderr);
        codePushInstall.on("close", done);
    });
});

gulp.task("e2e", function(done) {
    runSequence("codepush-install", "test-e2e", done);
});

gulp.task("e2e-fast", function(done) {
    runSequence("test-e2e", done);
});