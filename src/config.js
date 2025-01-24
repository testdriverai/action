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

    this.input = {
      prompt: core.getInput("prompt"),
      prerun: core.getInput("prerun"),
      branch: core.getInput("branch") || "main",
      key: core.getInput("key"),
      os: core.getInput("os") || "windows",
      version: core.getInput("version") || "latest",
      createPR,
      prBase: createPR ? core.getInput("pr-base") || "main" : "",
      prBranch: createPR ? core.getInput("pr-branch") : "",
      prTitle: createPR ? core.getInput("pr-title") : "",
      prTestFilename: createPR ? core.getInput("pr-test-filename") : "",
    };

    let branchInfo = () => {
      
      let sha = github.context.sha;
      let ref = github.context.ref;
      
      console.log("Executin Context:");

      if (github.context.payload?.pull_requests) {
        console.log("Pull Requests [0]");
        sha = github.context.payload.pull_requests[0].head.sha;
        ref = github.context.payload.pull_requests[0].head.ref;
      } else if (github.context.payload?.pull_request) {
        console.log("Pull Request");
        sha = github.context.payload.pull_request.head.sha;
        ref = github.context.payload.pull_request.head.ref;
      } else {
        console.log("Root Context");
        sha = github.context.sha;
        ref = github.context.ref;
      }
      
      let res = {sha, ref};

      console.log("Returning:")
      console.log(res);

      return res;
    }

    let {sha, ref} = branchInfo();
    
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
