const core = require("@actions/core");
const github = require("@actions/github");

class Config {
  constructor() {
    this.input = {
      prompt: core.getInput("prompt"),
      os: core.getInput("os") || "mac",
      prerun: core.getInput("prerun"),
      gh_token: core.getInput("gh_token"),
      version: core.getInput("version"),
      key: core.getInput("key"),
      os: core.getInput("os") || "windows",
      testdriveraiVersion: core.getInput("testdriveraiVersion") || "latest",
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
