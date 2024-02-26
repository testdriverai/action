const core = require("@actions/core");
const config = require("./config");
const axios = require("axios");
require("dotenv").config();

function setOutput(summary, shareLink) {
  core.setOutput("summary", summary);
  core.setOutput("share-link", shareLink);
}

const waitFor = (ms) => new Promise((r) => setTimeout(r, ms));

(async function () {
  const baseUrl =
    (process.env.IS_DEV
      ? "https://replayable-dev-michael.ngrok.io"
      : "https://replayable-api-production.herokuapp.com") + "/api/v1";

  const repo = process.env.IS_DEV
    ? "replayableio/testdriver-action"
    : config.githubContext.owner + "/" + config.githubContext.repo;
  const branch = process.env.IS_DEV ? "main" : config.githubContext.branch;
  const prompt = process.env.IS_DEV ? "open youtube" : config.input.prompt;

  const {
    data: { workflowId },
  } = await axios.post(
    `${baseUrl}/testdriver-dispatch`,
    {
      repo,
      branch,
      prompt,
    },
    {
      Accept: "application/json",
      "Content-Type": "application/json",
    }
  );

  console.log("workflow id:", workflowId);

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

  const waitUntilComplete = async () => {
    let { status, conclusion } = await checkStatus();

    while (status !== "completed") {
      await waitFor(1000 * 60 * 1);
      const resp = await checkStatus();
      status = resp.status;
      conclusion = resp.conclusion;
    }

    return conclusion;
  };

  await waitUntilComplete();

  console.log("workflow completed");

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

  const isPassed = oiResult.includes("The test passed");

  if (!isPassed) {
    core.setFailed(oiResult);
  }

  console.log("results: ", shareLink, oiResult);
  setOutput(shareLink, oiResult);
})();
