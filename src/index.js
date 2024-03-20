const core = require("@actions/core");
const config = require("./config");
const axios = require("axios");

require("dotenv").config();

const colors = require("colors");

function extractLink(markdownString) {
  const regex = /\[!\[.*?\]\(.*?\)\]\((.*?)\)/;
  const match = markdownString.match(regex);
  if (match.length) {
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

  console.log('TestDriver: "Looking into it..."'.green);
  console.log('TestDriver: "I can help ya test that!"'.green);

  let prompt = process.env.IS_DEV
    ? "open youtube"
    : config.input.prompt.replace(/(\r\n|\n)/g, function (match) {
        return match === "\n" ? "\\n" : "\\r\\n";
      });

  const personalAccessToken = process.env.IS_DEV
    ? ""
    : process.env.PERSONAL_GH_TOKEN;

  console.log("inputs", { repo, branch, prompt });

  console.log('TestDriver: "Dispatching testdriver..."'.green);

  const {
    data: { dispatchId },
  } = await axios.post(
    `${baseUrl}/testdriver-dispatch`,
    {
      repo,
      branch,
      prompt,
      personalAccessToken,
    },
    {
      Accept: "application/json",
      "Content-Type": "application/json",
    }
  );

  console.log("dispatch id:", dispatchId);

  console.log('TestDriver: "Finding the dispatched workflow..."'.green);

  const checkWorkflow = async () => {
    const {
      data: { workflowId },
    } = await axios.post(
      `${baseUrl}/testdriver-workflow`,
      {
        dispatchId,
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

  console.log("Found workflow id:", workflowId);

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

    console.log("workflow status: ", status, conclusion);

    return { status, conclusion };
  };

  console.log('TestDriver: "Let\'s Go!"'.green);

  const waitUntilComplete = async () => {
    let { status, conclusion } = await checkStatus();

    while (status !== "completed") {
      await waitFor(1000 * 60 * 1);
      console.log('TestDriver: "Testing..."'.green);
      const resp = await checkStatus();
      status = resp.status;
      conclusion = resp.conclusion;
    }

    if (conclusion === "failure") {
      console.log(`TestDriver: "The workflow has failed!"`);
      throw new Error(`The workflow has failed!`);
    }

    return conclusion;
  };

  await waitUntilComplete();

  console.log('TestDriver: "Done!"'.green);
  console.log('TestDriver: "Writing my report..."'.green);

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

  console.log('TestDriver: "Interpreting results..."'.green);

  const isPassed = oiResult.includes("The test passed");

  if (!isPassed) {
    core.setFailed(oiResult);
  }

  if (isPassed) {
    console.log('TestDriver: "PASS"'.green);
  } else {
    console.log('TestDriver: "FAIL"'.red);
  }

  let extractedFromMarkdown = extractLink(shareLink);

  if (extractedFromMarkdown) {
    console.log("View Test Results on Dashcam.io".yellow);
    console.log(extractedFromMarkdown);
  } else {
    console.log("Something went wrong with Dashcam");
    console.log(shareLink);
  }

  console.log("TestDriver.ai Summary".yellow);
  console.log(oiResult);

  core.setOutput("summary", oiResult);
  core.setOutput("link", extractedFromMarkdown);
  core.setOutput("markdown", shareLink);

  await core.summary

    .addHeading("TestDriver.ai Results")
    .addLink("View Dashcam.io Recording!mMarkdown", extractedFromMarkdown)
    .addHeading("Summary")
    .addRaw(oiResult)
    .addEOL()
    .addRaw(shareLink)
    .addEOL()
    .write();
})();
