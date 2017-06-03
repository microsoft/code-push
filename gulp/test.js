"use strict";

var gulp = require("gulp");
var plugins = require("gulp-load-plugins")();

var mochaConfig = {
    reporter: process.env.REPORTER || "spec",
    timeout: parseInt(process.env.TIMEOUT) || 5000
};

// don't include plugin in projects here because there are no tests on the testing framework
var projects = {
    "sdk": ["build-sdk"],
    "cli": ["build-cli"]
};

var projectNames = Object.keys(projects);

var testPaths = projectNames.map(testPathFromName);
var sourcesPaths = projectNames.map(sourcePathFromName);

function testPathFromName(name) {
    return name + "/bin/test/**/*.js"
}

function sourcePathFromName(name) {
    return name + "/bin/script/**/*.js"
}

function runTests(sources, tests, done) {
    require("dotenv").config({ path: ".test.env", silent: true });
    gulp.src(sources)
        .pipe(plugins.istanbul({includeUntested: true}))
        .pipe(plugins.istanbul.hookRequire())
        .on("finish", function() {
            gulp.src(tests, { read: false })
                .pipe(plugins.if(process.env.WATCHING, plugins.plumber()))
                .pipe(plugins.mocha(mochaConfig))
                .pipe(plugins.istanbul.writeReports())
                .on("end", done);
        });
}

function testTask(name, done) {
    runTests([sourcePathFromName(name)], [testPathFromName(name)], done);
}

projectNames.forEach(function(projectName) {
    var projectDeps = projects[projectName];

    gulp.task("test-" + projectName, projectDeps, function (done) { testTask(projectName, done); });
});

gulp.task("test", ["build"], function(done) {
    runTests(sourcesPaths, testPaths, done);
});
