const core = require("@actions/core");
const github = require("@actions/github");
const config = require("./config");
import { v4 as uuidv4 } from "uuid";
const UZip = require("uzip");
const colors = require("colors");

function extractLink(markdownString) {
  const regex = /\[!\[.*?\]\(.*?\)\]\((.*?)\)/;
  const match = markdownString.match(regex);
  return match[1];
}

const waitFor = (ms) => new Promise((r) => setTimeout(r, ms));

(async function () {
  const owner = "replayableio";
  const repo = "testdriver";
  const branch = "main";
  const dispatchWorkflow = "interpret-comment.yml";

  const octokit = github.getOctokit(process.env.GH_TOKEN);

  const dispatchId = uuidv4();

  console.log('TestDriver: "Looking into it..."'.green);
  console.log('TestDriver: "I can help ya test that!"'.green);

  let comment = config.input.prompt.replace(/(\r\n|\n)/g, function (match) {
    return match === "\n" ? "\\n" : "\\r\\n";
  });

  await octokit.request(
    "POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches",
    {
      owner,
      repo,
      workflow_id: dispatchWorkflow,
      ref: branch,
      inputs: {
        repo: config.githubContext.owner + "/" + config.githubContext.repo,
        branch: config.githubContext.branch,
        dispatchId,
        comment,
        isFromAction: "true",
      },
    }
  );

  const findWorkFlow = async () => {
    const twoMinutesAgo = new Date();
    twoMinutesAgo.setMinutes(twoMinutesAgo.getMinutes() - 2);

    const workflowResponse = await octokit.request(
      `GET /repos/{owner}/{repo}/actions/runs?created=>{time}&branch={branch}&event={trigger}`,
      {
        owner,
        repo,
        // Can just check dispatches in the past 2 minutes since we poll every 1 minute
        time: twoMinutesAgo.toISOString(),
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
        return workflowId;
      }
    }
  };

  const waitUntilWorkflowAvailable = async () => {
    let workflowId;
    while (!workflowId) {
      await waitFor(1000 * 60);
      console.log('TestDriver: "Setting Up..."'.green);
      workflowId = await findWorkFlow();
    }

    return workflowId;
  };

  console.log('TestDriver: "I\'m workin on it!"'.green);

  const workflowId = await waitUntilWorkflowAvailable();

  console.log(
    'TestDriver: "I\'m all set up and ready to take this thing for a drive!"'
      .green
  );

  const checkStatus = async () => {
    const workflow = await octokit.request(
      "GET /repos/{owner}/{repo}/actions/runs/{run_id}",
      {
        owner,
        repo,
        run_id: workflowId,
      }
    );

    return {
      status: workflow.data.status,
      conclusion: workflow.data.conclusion,
    };
  };

  console.log('TestDriver: "Let\'s Go!"'.green);

  const waitUntilComplete = async () => {
    let { status, conclusion } = await checkStatus();
    while (status != "completed") {
      await waitFor(1000 * 60 * 1);
      console.log('TestDriver: "Testing..."'.green);
      const resp = await checkStatus();
      status = resp.status;
      conclusion = resp.conclusion;
    }

    return conclusion;
  };

  const conclusion = await waitUntilComplete();

  console.log('TestDriver: "Done!"'.green);

  console.log('TestDriver: "Writing my report..."'.green);

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

  console.log('TestDriver: "Interpreting results..."'.green);

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

  console.log('TestDriver: "Decoding..."'.green);

  // get file data
  let unzippedData = UZip.parse(downloadedArtifact.data);
  const textDecoder = new TextDecoder();
  const shareLink = textDecoder.decode(unzippedData["shareLink.txt"]);
  const oiResult = textDecoder.decode(unzippedData["oiResult.txt"]);

  const isPassed = oiResult.includes("The test passed");

  if (!isPassed) {
    core.setFailed(oiResult);
  }

  if (isPassed) {
    console.log('TestDriver: "PASS"'.green);
  } else {
    console.log('TestDriver: "FAIL"'.red);
  }

  console.log("View Test Results on Dashcam.io".yellow);
  console.log(extractLink(shareLink));

  console.log("TestDriver.ai Summary".yellow);
  console.log(oiResult);

  core.setOutput("summary", oiResult);
  core.setOutput("link", extractLink(shareLink));
  core.setOutput("markdown", shareLink);

  await core.summary
    .addHeading("TestDriver.ai Results")
    .addLink("View Dashcam.io Recording!", extractLink(shareLink))
    .addHeading("Summary")
    .addRaw(oiResult)
    .addEOL()
    .addRaw(shareLink)
    .addEOL()
    .write();
})();
