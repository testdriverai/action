const core = require("@actions/core");
const config = require("./config");
const axios = require("axios");
const chalk = require("chalk");

require("dotenv").config();

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

  console.log(chalk.green("TestDriver:"), '"Looking into it..."');
  console.log(chalk.green("TestDriver:"), '"I can help ya test that!"');

  let prompt = process.env.IS_DEV
    ? "open youtube"
    : config.input.prompt.replace(/(\r\n|\n)/g, function (match) {
        return match === "\n" ? "\\n" : "\\r\\n";
      });


  let prerun = config.input.prerun;
  let version = config.input.version;

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
      prerun,
      version,
      personalAccessToken,
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
        branch: version
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
    const {
      data: { status, conclusion },
    } = await axios.post(
      `${baseUrl}/testdriver-status-check`,
      { workflowId },
      {
        Accept: "application/json",
        "Content-Type": "application/json",
      }
    );

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

    if (conclusion === "failure") {
      console.log(
        chalk.green("TestDriver:"),
        chalk.red('"The workflow has failed!"')
      );
    }

    return conclusion;
  };

  await waitUntilComplete();

  console.log(chalk.green("TestDriver:"), chalk.green('"Done!"'));
  console.log(chalk.green("TestDriver:"), '"Writing my report..."'.green);

  const {
    data: { shareLink, oiResult },
  } = await axios.post(
    `${baseUrl}/testdriver-artifacts`,
    { workflowId },
    {
      Accept: "application/json",
      "Content-Type": "application/json",
    }
  );

  console.log(chalk.green("TestDriver:"), '"Interpreting results..."'.green);

  const isPassed = oiResult.includes("The test passed");

  if (!isPassed) {
    core.setFailed(oiResult);
  }

  if (isPassed) {
    console.log(chalk.green("TestDriver:"), chalk.green('"PASS"'));
  } else {
    console.log(chalk.green("TestDriver:"), chalk.red('"FAIL"'));
  }

  let extractedFromMarkdown = extractLink(shareLink);

  if (extractedFromMarkdown) {
    console.log(chalk.yellow("View Test Results on Dashcam.io"));
    console.log(extractedFromMarkdown);
  } else {
    console.log(chalk.red("Something went wrong with Dashcam"));
    console.log(shareLink);
  }

  console.log(chalk.yellow("TestDriver.ai Summary"));
  console.log(oiResult);

  core.setOutput("summary", oiResult);
  core.setOutput("link", extractedFromMarkdown);
  core.setOutput("markdown", shareLink);

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
