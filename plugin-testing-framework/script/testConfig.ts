"use strict";

// IMPORTS //

import os = require("os");
import path = require("path");
import { TestUtil } from "./TestUtil";

//////////////////////////////////////////////////////////////////////////////////////////
// Configuration variables.
// What plugin to use, what project directories to use, etc.

// COMMAND LINE OPTION NAMES, FLAGS, AND DEFAULTS

const TEST_RUN_DIRECTORY_OPTION_NAME: string = "--test-directory";
const DEFAULT_TEST_RUN_DIRECTORY = path.join(os.tmpdir(), TestUtil.getPluginName(), "test-run");

const TEST_UPDATES_DIRECTORY_OPTION_NAME: string = "--updates-directory";
const DEFAULT_UPDATES_DIRECTORY = path.join(os.tmpdir(), TestUtil.getPluginName(), "updates");

const CORE_TESTS_ONLY_FLAG_NAME: string = "--core";

const PULL_FROM_NPM_FLAG_NAME: string = "--npm";

const DEFAULT_PLUGIN_PATH: string = path.join(__dirname, "../../..");
const NPM_PLUGIN_PATH: string = TestUtil.getPluginName();

const SETUP_FLAG_NAME: string = "--setup";
const RESTART_EMULATORS_FLAG_NAME: string = "--clean";

// CONST VARIABLES

export const TestAppName = "TestCodePush";
export const TestNamespace = "com.microsoft.codepush.test";
export const AcquisitionSDKPluginName = "code-push";

export const templatePath = path.join(__dirname, "../../../test/template");
export const thisPluginPath = TestUtil.readMochaCommandLineFlag(PULL_FROM_NPM_FLAG_NAME) ? NPM_PLUGIN_PATH : DEFAULT_PLUGIN_PATH;

export const testRunDirectory = TestUtil.readMochaCommandLineOption(TEST_RUN_DIRECTORY_OPTION_NAME, DEFAULT_TEST_RUN_DIRECTORY);
export const updatesDirectory = TestUtil.readMochaCommandLineOption(TEST_UPDATES_DIRECTORY_OPTION_NAME, DEFAULT_UPDATES_DIRECTORY);

export const onlyRunCoreTests = TestUtil.readMochaCommandLineFlag(CORE_TESTS_ONLY_FLAG_NAME);
export const shouldSetup: boolean = TestUtil.readMochaCommandLineFlag(SETUP_FLAG_NAME);
export const restartEmulators: boolean = TestUtil.readMochaCommandLineFlag(RESTART_EMULATORS_FLAG_NAME);