const core = require("@actions/core");
const github = require("@actions/github");
const config = require("./config");
import { v4 as uuidv4 } from "uuid";

function setOutput(summary, shareLink) {
  core.setOutput("summary", summary);
  core.setOutput("share-link", shareLink);
}

const waitFor = (ms) => new Promise((r) => setTimeout(r, ms));

(async function () {
  const owner = "replayableio";
  const repo = "testdriver-dev";
  const branch = "main";
  const dispatchWorkflow = "interpret-comment.yml";

  console.log(config, process.env.GH_TOKEN);

  const octokit = github.getOctokit(process.env.GH_TOKEN);

  const dispatchId = uuidv4();

  await octokit.request(
    "POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches",
    {
      owner,
      repo,
      workflow_id: dispatchWorkflow,
      ref: branch,
      inputs: {
        dispatchId,
        repo: config.githubContext.owner + "/" + config.githubContext.repo,
        issue: `${config.githubContext.issueNumber}`,
        comment: config.input.prompt,
        branch: config.githubContext.branch,
        response: `I ran your tests and here's what I found:`,
      },
    }
  );

  await waitFor(1000 * 60 * 5); // wait 5 minutes for workflow to complete

  const fiveMinsAgo = new Date();
  fiveMinsAgo.setMinutes(fiveMinsAgo.getMinutes() - 5);

  const workflowResponse = await octokit.request(
    `GET /repos/{owner}/{repo}/actions/runs?created=>{time}&branch={branch}&event={trigger}`,
    {
      owner,
      repo,
      time: fiveMinsAgo.toISOString(),
      branch,
      trigger: "workflow_dispatch",
    }
  );
  const runs = workflowResponse.data.workflow_runs || [];

  let workflowId;

  for (let i in runs) {
    const workflowRun = runs[i];

    // fetch jobs for the workflow run
    const jobsUrl = new URL(workflowRun.jobs_url);
    const response = await octokit.request(`GET ${jobsUrl.pathname}`);
    const jobs = response.data.jobs || [];

    // iterate over jobs within workflow run
    for (let j in jobs) {
      const job = jobs[j];
      const steps = job.steps;

      if (steps.length > 1) {
        // if after setup phase is a step that contains our
        //  dispatch id then capture workflow details and break
        if (steps[1].name == dispatchId) {
          workflowId = job.run_id;
          workflowUrl = workflowRun.html_url;
          break;
        }
      }
    }

    // break iteration of workflow runs if workflow id found
    if (workflowId) {
      break;
    }
  }

  console.log(workflowId);
})();
