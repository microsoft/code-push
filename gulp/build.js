"use strict";

var gulp = require("gulp");

gulp.task("build-sdk", ["content-sdk", "scripts-sdk"]);

gulp.task("build-cli", ["content-cli", "scripts-cli"]);

gulp.task("build-plugin", ["content-plugin", "scripts-plugin"]);

gulp.task("build", ["build-sdk", "build-cli", "build-plugin"]);
