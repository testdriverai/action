const core = require("@actions/core");
const github = require("@actions/github");
const chalk = require("chalk");

class Config {
  constructor() {
    let createPR = core.getInput("create-pr")?.toLowerCase()?.trim() || "false";
    let cloneRepo = core.getInput("clone-repo")?.toLowerCase()?.trim() || "true";
    if (!["true", "false"].includes(createPR) || !["true", "false"].includes(cloneRepo)) {
      throw new Error("Invalid value for create-pr or clone-repo. They should be booleans");
    } else {
      createPR = JSON.parse(createPR);
      cloneRepo = JSON.parse(cloneRepo);
    }

    this.input = {
      prompt: core.getInput("prompt"),
      prerun: core.getInput("prerun"),
      branch: core.getInput("branch") || "main",
      key: core.getInput("key"),
      os: core.getInput("os") || "windows",
      version: core.getInput("version") || "latest",
      createPR,
      cloneRepo,
      prBase: createPR ? core.getInput("pr-base") || "main" : "",
      prBranch: createPR ? core.getInput("pr-branch") : "",
      prTitle: createPR ? core.getInput("pr-title") : "",
      prTestFilename: createPR ? core.getInput("pr-test-filename") : "",
    };

    let branchInfo = () => {


      let sha = github.context.sha;
      let ref = github.context.ref;
      let context = '';
      
      if (github.context.event_name == "workflow_run") {
        context = 'workflow_run';
        sha = github.context.event.workflow_run.pull_requests[0].head.sha;
        ref = github.context.event.workflow_run.pull_requests[0].head.ref;
      } else if (github.context.payload?.pull_request) {
        context = 'pull_request';
        sha = github.context.payload.pull_request.head.sha;
        ref = github.context.payload.pull_request.head.ref;
      } else {
        context = 'default'
        sha = github.context.sha;
        ref = github.context.ref;
      }
      
      let res = {sha, ref, context};

      console.log("");
      console.log(chalk.green("Context"));
      console.log(chalk.yellow("method:"), context);
      console.log(chalk.yellow("ref:"), ref);
      console.log(chalk.yellow("sha:"), sha);

      return res;
    }

    let {sha, ref, context} = branchInfo();
    
    // the values of github.context.repo.owner and github.context.repo.repo are taken from
    // the environment variable GITHUB_REPOSITORY specified in "owner/repo" format and
    // provided by the GitHub Action on the runtime
    this.githubContext = {
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      issueNumber: github.context.issue.number,
      branch: github.context.ref,
      token: github.context.token || github.token,
      sha,
      ref,
      workflow: github.context.workflow,
      run_id: github.context.runId
    };
  }
}

try {
  module.exports = new Config();
} catch (error) {
  core.error(error);
  core.setFailed(error.message);
}
