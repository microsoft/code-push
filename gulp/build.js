"use strict";

var gulp = require("gulp");

gulp.task("build-sdk", ["content-sdk", "scripts-sdk"]);

gulp.task("build-cli", ["content-cli", "scripts-cli"]);

gulp.task("build-e2e", ["content-e2e", "scripts-e2e"]);

gulp.task("build", ["build-sdk", "build-cli"]);
