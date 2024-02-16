// const { Octokit } = require("@octokit/rest");
const core = require("@actions/core");
const config = require("./config");

// const octokit = new Octokit({
//   auth: process.env.GH_TOKEN, // cycle this token as it's leaked
// });

function setOutput(summary, shareLink) {
  core.setOutput("summary", summary);
  core.setOutput("share-link", shareLink);
}

(async function () {
  console.log(config);

  setOutput(
    "I ran your tests and here's what I found:",
    "https://replayable.io"
  );

  // await octokit.rest.actions.createWorkflowDispatch({
  //   owner: "replayableio",
  //   repo: "testdriver",
  //   workflow_id: "interpret-comment.yml",
  //   ref: "test-bot",
  //   inputs: {
  //     repo: config.githubContext.owner + "/" + config.githubContext.repo,
  //     issue: config.githubContext.issueNumber,
  //     comment: config.input.prompt,
  //     branch: config.githubContext.branch,
  //     response: `I ran your tests and here's what I found:`,
  //   },
  // });
})();
