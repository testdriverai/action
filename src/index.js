const core = require("@actions/core");
const github = require("@actions/github");
const config = require("./config");
import { v4 as uuidv4 } from "uuid";
const UZip = require("uzip");

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
        comment: config.input.prompt,
      },
    }
  );

  await waitFor(1000 * 60 * 1); // wait 5 minutes for workflow to complete

  const fiveMinsAgo = new Date();
  fiveMinsAgo.setMinutes(fiveMinsAgo.getMinutes() - 1);

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
          break;
        }
      }
    }

    // break iteration of workflow runs if workflow id found
    if (workflowId) {
      break;
    }
  }

  const checkStatus = async () => {
    const workflow = await octokit.request(
      "GET /repos/{owner}/{repo}/actions/runs/{run_id}",
      {
        owner,
        repo,
        run_id: workflowId,
      }
    );

    console.log(
      "workflow data",
      workflow.data.status,
      workflow.data.conclusion
    );
  };

  let checkTimes = 0;
  checkStatus();
  const intervalId = setInterval(() => {
    checkStatus();
    checkTimes++;
    if (checkTimes > 10) {
      clearInterval(intervalId);
    }
  }, 1000 * 60 * 1);

  // list workflow run artifacts
  const artifacts = await octokit.request(
    "GET /repos/{owner}/{repo}/actions/runs/{run_id}/artifacts",
    {
      owner,
      repo,
      run_id: workflowId,
    }
  );

  // find artifact id
  let artifactId;
  for (let i = 0; i < artifacts.data.total_count; i++) {
    if (artifacts.data.artifacts[i].name === "share-link") {
      artifactId = artifacts.data.artifacts[i].id;
    }
  }

  // download the artifact
  let downloadedArtifact = await octokit.request(
    "GET /repos/{owner}/{repo}/actions/artifacts/{artifact_id}/{archive_format}",
    {
      owner,
      repo,
      artifact_id: artifactId,
      archive_format: "zip",
    }
  );

  // get file data
  let unzippedData = UZip.parse(downloadedArtifact.data);
  const textDecoder = new TextDecoder();
  const shareLink = textDecoder.decode(unzippedData["shareLink.txt"]);
  const oiResult = textDecoder.decode(unzippedData["oiResult.txt"]);

  console.log(shareLink, oiResult);
})();
