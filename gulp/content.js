"use strict";

var gulp = require("gulp");
var merge = require("merge2");
var plugins = require("gulp-load-plugins")();

function contentTask(cwd) {
    var options = {
        cwd: cwd,
        base: "./" + cwd
    };

    return gulp.src([
        "{script,test}/**/*.{css,ejs,html,js,json,png,xml}",
        "test/resources/**/*",
        "*.{public,private}",
        "package.json",
        "plugin.xml",
        "server.js",
        "web.config",
        ".npmignore",
        "README.md"
    ], options)
    .pipe(gulp.dest("bin", options));
}

gulp.task("content-sdk", function() { return contentTask("sdk"); });
gulp.task("content-cli", function() { return contentTask("cli"); });
gulp.task("content-plugin", function() { return contentTask("plugin-testing-framework"); });