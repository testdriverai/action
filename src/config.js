const core = require("@actions/core");
const github = require("@actions/github");

class Config {
  constructor() {
    let createPR = core.getInput("create-pr")?.toLowerCase()?.trim() || "false";
    if (!["true", "false"].includes(createPR)) {
      throw new Error("Invalid value for create-pr. It should be a boolean");
    } else {
      createPR = JSON.parse(createPR);
    }
    const random = Math.random().toString(36).substring(7);
    this.input = {
      prompt: core.getInput("prompt"),
      prerun: core.getInput("prerun"),
      branch: core.getInput("branch") || "main",
      key: core.getInput("key"),
      os: core.getInput("os") || "windows",
      version: core.getInput("version") || "latest",
      createPR,
      prBase: createPR ? core.getInput("pr-base") || "main" : "",
      prBranch: createPR
        ? core.getInput("pr-branch") || `testdriver/test-${random}`
        : "",
      prTitle: createPR
        ? core.getInput("pr-title") || `Testdriver-${random}`
        : "",
      prTestFilename: createPR
        ? core.getInput("pr-test-filename") || `testdriver-${random}.yml`
        : "",
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
