/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 150:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const core = __nccwpck_require__(418);
const github = __nccwpck_require__(846);

class Config {
  constructor() {
    this.input = {
      prompt: core.getInput("prompt"),
      prerun: core.getInput("prerun"),
      branch: core.getInput("branch") || "main",
      key: core.getInput("key"),
      os: core.getInput("os") || "windows",
      version: core.getInput("version") || "latest",
    };

    // the values of github.context.repo.owner and github.context.repo.repo are taken from
    // the environment variable GITHUB_REPOSITORY specified in "owner/repo" format and
    // provided by the GitHub Action on the runtime
    this.githubContext = {
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      issueNumber: github.context.issue.number,
      branch: github.context.ref,
    };
  }
}

try {
  module.exports = new Config();
} catch (error) {
  core.error(error);
  core.setFailed(error.message);
}


/***/ }),

/***/ 418:
/***/ ((module) => {

module.exports = eval("require")("@actions/core");


/***/ }),

/***/ 846:
/***/ ((module) => {

module.exports = eval("require")("@actions/github");


/***/ }),

/***/ 774:
/***/ ((module) => {

module.exports = eval("require")("axios");


/***/ }),

/***/ 922:
/***/ ((module) => {

module.exports = eval("require")("chalk");


/***/ }),

/***/ 900:
/***/ ((module) => {

module.exports = eval("require")("dotenv");


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __nccwpck_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId](module, module.exports, __nccwpck_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = __dirname + "/";
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
const core = __nccwpck_require__(418);
const config = __nccwpck_require__(150);
const axios = __nccwpck_require__(774);
const chalk = __nccwpck_require__(922);

(__nccwpck_require__(900).config)();

const pgkVersion = "1.0.0";

function extractLink(markdownString) {
  const regex = /\[!\[.*?\]\(.*?\)\]\((.*?)\)/;
  const match = markdownString.match(regex);
  if (match?.length) {
    return match[1];
  } else {
    return null;
  }
}

const waitFor = (ms) => new Promise((r) => setTimeout(r, ms));

(async function () {
  const baseUrl =
    (process.env.IS_DEV
      ? "http://localhost:1337"
      : "https://replayable-api-production.herokuapp.com") + "/api/v1";

  const repo = process.env.IS_DEV
    ? "replayableio/testdriver-action"
    : config.githubContext.owner + "/" + config.githubContext.repo;
  const branch = process.env.IS_DEV ? "main" : config.githubContext.branch;

  let prerun = config.input.prerun;
  let testdriverBranch = config.input.branch;
  let key = config.input.key;
  let os = config.input.os;
  let testdriveraiVersion = config.input.version;

  console.log(`testdriver@${pgkVersion}`);
  console.log(`testdriver-action@${testdriverBranch}`);

  console.log(chalk.green("TestDriver:"), '"Looking into it..."');
  console.log(chalk.green("TestDriver:"), '"I can help ya test that!"');

  let prompt = process.env.IS_DEV
    ? "open youtube"
    : config.input.prompt.replace(/(\r\n|\n)/g, function (match) {
      return match === "\n" ? "\\n" : "\\r\\n";
    });

  console.log("inputs", { repo, branch, prompt, os });
  const personalAccessToken = process.env.GITHUB_TOKEN;

  console.log(chalk.green("TestDriver:"), '"Starting my engine..."');

  const {
    data: { dispatchId },
  } = await axios.post(
    `${baseUrl}/testdriver-dispatch`,
    {
      repo,
      branch,
      prompt,
      os,
      prerun,
      version: testdriverBranch,
      key,
      os,
      personalAccessToken,
      testdriveraiVersion,
    },
    {
      Accept: "application/json",
      "Content-Type": "application/json",
    }
  );

  console.log(chalk.green("TestDriver:"), '"3. 2. 1..."');

  const checkWorkflow = async () => {
    console.log(chalk.green("TestDriver:"), '"Launching..."');

    const {
      data: { workflowId },
    } = await axios.post(
      `${baseUrl}/testdriver-workflow`,
      {
        dispatchId,
        branch: testdriverBranch,
      },
      {
        Accept: "application/json",
        "Content-Type": "application/json",
      }
    );

    return workflowId;
  };

  const waitUntilWorkflowAvailable = async () => {
    let workflowId;
    while (!workflowId) {
      await waitFor(1000 * 60);
      workflowId = await checkWorkflow();
    }

    return workflowId;
  };

  const workflowId = await waitUntilWorkflowAvailable();

  const checkStatus = async () => {
    let response = await axios.post(
      `${baseUrl}/testdriver-status-check`,
      { workflowId },
      {
        Accept: "application/json",
        "Content-Type": "application/json",
      }
    );

    let status = response.data.status;
    let conclusion = response.data.conclusion;

    return { status, conclusion };
  };

  console.log(chalk.green("TestDriver:"), '"Let\'s Go!!!"');

  const waitUntilComplete = async () => {
    let { status, conclusion } = await checkStatus();

    while (status !== "completed") {
      await waitFor(1000 * 60 * 1);
      console.log(chalk.green("TestDriver:"), '"Testing..."');
      const resp = await checkStatus();
      status = resp.status;
      conclusion = resp.conclusion;
    }

    return conclusion;
  };

  let conc = await waitUntilComplete();

  console.log(chalk.green("TestDriver:"), chalk.green('"Done!"'));
  console.log(chalk.green("TestDriver:"), "Writing my report...");

  const {
    data: { shareLink, oiResult, exitcode },
  } = await axios.post(
    `${baseUrl}/testdriver-artifacts`,
    { workflowId },
    {
      Accept: "application/json",
      "Content-Type": "application/json",
    }
  );

  console.log(chalk.green("TestDriver:"), "Interpreting results...");

  console.log("");
  console.log("Test Report:");
  if (conc === "failure") {
    console.log(chalk.yellow("Workflow:"), chalk.red("Fail"));
  } else {
    console.log(chalk.yellow("Workflow:"), chalk.green("Pass"));
  }

  const isPassed = parseInt(exitcode) === 0;

  if (!isPassed) {
    core.setFailed(oiResult);
  }

  if (isPassed) {
    console.log(chalk.yellow("Test:"), chalk.green("Pass"));
  } else {
    console.log(chalk.yellow("Test:"), chalk.red("Fail"));
  }

  console.log("share link before extraction", shareLink);

  let extractedFromMarkdown = extractLink(shareLink);

  console.log("");
  console.log(chalk.yellow("View Test Result on Dashcam.io:"));

  if (extractedFromMarkdown) {
    console.log(extractedFromMarkdown);
  } else {
    console.log(chalk.red("Something went wrong with Dashcam"));
    console.log(shareLink);
  }

  console.log("");
  console.log(chalk.yellow("TestDriver.ai Summary"));
  console.log(oiResult);

  core.setOutput("summary", oiResult);
  core.setOutput("link", extractedFromMarkdown);
  core.setOutput("markdown", shareLink);
  core.setOutput("success", isPassed);

  await core.summary
    .addHeading("TestDriver.ai Results")
    .addLink("View Dashcam.io Recording!", extractedFromMarkdown)
    .addHeading("Summary")
    .addRaw(oiResult)
    .addEOL()
    .addRaw(shareLink)
    .addEOL()
    .write();
})();

})();

module.exports = __webpack_exports__;
/******/ })()
;