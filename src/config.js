const core = require("@actions/core");
const github = require("@actions/github");

class Config {
  constructor() {
    const createPR = core.getInput("create-pr")?.toLowerCase()?.trim();
    if (!["true", "false"].includes(createPR)) {
      throw new Error(
        "Invalid value for create-pr input. It should be either true or false."
      );
    }
    this.input = {
      prompt: core.getInput("prompt"),
      prerun: core.getInput("prerun"),
      branch: core.getInput("branch") || "main",
      key: core.getInput("key"),
      os: core.getInput("os") || "windows",
      version: core.getInput("version") || "latest",
      createPR: JSON.parse(createPR),
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
