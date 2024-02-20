const core = require("@actions/core");
const github = require("@actions/github");
const config = require("./config");

function setOutput(summary, shareLink) {
  core.setOutput("summary", summary);
  core.setOutput("share-link", shareLink);
}

(async function () {
  console.log(config, process.env.GH_TOKEN);

  const octokit = github.getOctokit(process.env.GH_TOKEN);

  const dispatchResult = await octokit.request(
    "POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches",
    {
      owner: "replayableio",
      repo: "testdriver-dev",
      workflow_id: "interpret-comment.yml",
      ref: "main",
      inputs: {
        repo: config.githubContext.owner + "/" + config.githubContext.repo,
        issue: `${config.githubContext.issueNumber}`,
        comment: config.input.prompt,
        branch: config.githubContext.branch,
        response: `I ran your tests and here's what I found:`,
      },
    }
  );

  console.log(dispatchResult);
})();
