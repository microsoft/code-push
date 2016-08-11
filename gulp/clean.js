"use strict";

var gulp = require("gulp");
var del = require("del");

function deleteTask(glob, next) {
    del(glob, null, next);
}

var cliCleanList = ["cli/bin/**/*", "!cli/bin/.*"];
var sdkCleanList = ["sdk/bin/**/*", "!sdk/bin/.*"];
var e2eCleanList = ["e2e/bin/**/*", "!e2e/bin/.*"];

gulp.task("clean-cli", function(next) { deleteTask(cliCleanList, next); });
gulp.task("clean-sdk", function(next) { deleteTask(sdkCleanList, next); });
gulp.task("clean-e2e", function(next) { deleteTask(e2eCleanList, next); });

gulp.task("clean", ["clean-cli", "clean-sdk"]);
