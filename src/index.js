const core = require("@actions/core");
const config = require("./config");
const axios = require("axios");
const chalk = require("chalk");
const { getOctokit } = require("@actions/github");

require("dotenv").config();

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

// extract a gif from a markdown string
function extractGif(markdownString) {
  const regex = /!\[.*?\]\((.*?\.gif)\)/;
  const match = markdownString.match(regex);
  if (match?.length) {
    return match[1];
  }
  return null;
}

const waitFor = (ms) => new Promise((r) => setTimeout(r, ms));

axios.interceptors.response.use(
  response => response,
  error => {
    if (axios.isAxiosError(error)) {
      console.log(chalk.red('HTTP ERROR'))
      console.error(error.message);
      if (error.response) {
        console.error("Status:", error.response.status);
        console.error("Data:", error.response.data);
      }
    }
    // return Promise.reject(error); // Re-throw the error for individual handling
  }
);

(async function () {
  const baseUrl =
    (process.env.IS_DEV
      ? "http://localhost:1337"      
      : "https://api.testdriver.ai") + "/api/v1";

  const repo = process.env.IS_DEV
    ? "replayableio/testdriver-action"
    : config.githubContext.owner + "/" + config.githubContext.repo;
  const branch = process.env.IS_DEV ? "main" : config.githubContext.branch;

  let prerun = config.input.prerun;
  let testdriverBranch = config.input.branch;
  let key = config.input.key;
  let os = config.input.os;
  let testdriveraiVersion = config.input.version;
  let createPR = config.input.createPR;
  let prBranch = config.input.prBranch;
  let prBase = config.input.prBase;
  let prTitle = config.input.prTitle;
  let prTestFilename = config.input.prTestFilename;

  console.log(`testdriver@${pgkVersion}`);
  console.log(`testdriver-action@${testdriverBranch}`);

  let prompt = process.env.IS_DEV ? "open youtube" : config.input.prompt;

  console.log("");
  console.log(chalk.green("Inputs"));
  console.log(chalk.yellow("repo:"), repo);
  console.log(chalk.yellow("branch:"), branch);
  console.log(chalk.yellow("os:"), os);
  console.log(chalk.yellow("createPR:"), createPR);
  if (createPR) {
    if (prBranch) console.log(chalk.yellow("prBranch:"), prBranch);
    if (prBase) console.log(chalk.yellow("prBase:"), prBase);
    if (prTitle) console.log(chalk.yellow("prTitle:"), prTitle);
    if (prTestFilename)
      console.log(chalk.yellow("prTestFilename:"), prTestFilename);
  }
  console.log(chalk.yellow("prompt:"));
  console.log(prompt);
  console.log(chalk.yellow("prerun:"));
  console.log(prerun);
  console.log("");

  console.log(chalk.green("TestDriver:"), '"Looking into it..."');
  console.log(chalk.green("TestDriver:"), '"I can help ya test that!"');

  const personalAccessToken = process.env.GITHUB_TOKEN || config.githubContext.token || undefined;

  if (personalAccessToken) {
    console.log(chalk.green("TestDriver:"), '"Access Token Supplied..."');
  }

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
      createPR,
      prTitle,
      prBase,
      prBranch,
      prTestFilename,
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

  let extractedFromMarkdown = extractLink(shareLink);

  let gif = extractGif(shareLink); 
  console.log(gif)

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

  // create a github check for this run
  getOctokit(personalAccessToken).checks.create({
    owner: config.githubContext.owner,
    repo: config.githubContext.repo,
    name: "TestDriver.ai",
    head_sha: config.githubContext.sha,
    status: "completed",
    conclusion: isPassed ? "success" : "failure",
    output: {
      title: "TestDriver.ai Results",
      summary: oiResult,
      text: extractedFromMarkdown,
      details_url: extractedFromMarkdown,
      images: [
        {
          alt: "Dashcam.io Recording",
          image_url: gif,
        },
      ],
    },
  });

  await core.summary
    .addHeading("TestDriver.ai Results")
    .addLink("View Dashcam.io Recording!", extractedFromMarkdown)
    .addHeading("Summary")
    .addRaw(oiResult)
    .addSeparator()
    .addRaw(shareLink)
    .write();

  
  await axios.post(
    `${baseUrl}/testdriver-result-create`,
    {
      testSuite: config.githubContext.workflow,
      runId: config.githubContext.run_id,
      replayUrl: extractedFromMarkdown,
      instructions: prompt,
      repo: repo,
      branch: config.githubContext.head_ref || config.githubContext.ref,
      commit: config.githubContext.sha,
      platform: os,
      success: isPassed,
      summary: oiResult,
      version: testdriveraiVersion
    },
    {
      Accept: "application/json",
      "Content-Type": "application/json",
    }
  );

})();
