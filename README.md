# TestDriver.ai

AI QA Agent for GitHub. 

[Website](https://testdriver.ai) | [Join our Discord](https://discord.gg/ZjhBsJc5)

![TestDriver_1](https://github.com/dashcamio/testdriver/assets/318295/2a0ad981-8504-46f0-ad97-60cb6c26f1e7)

https://github.com/dashcamio/testdriver/assets/318295/d325f048-e6ad-44f3-b04d-9fcd1beada21

# Why

<img src="https://github.com/dashcamio/testdriver/assets/318295/e55d0ee4-1c22-40a5-b30b-cc7d155defcd" height="300" />

Manual testing is reptitive and slow. Automated tests take siginifigant investment time and need to be maintained. The TestDriver QA Agent can test your app with natural language prompts and AI vision, which is quicker to set up and more resiliant to changes.

- No code or frameworks to invest in
- Describe test steps with nautural lanuage
- Resiliant to changes in color, positioning, etc
- Can interpret objectives that get in the way of the goal
- High powered Silicon Mac M1 VM
- Supports full stack applications (backend and frontend) as well as desktop app
- Records video and logs of test results (powered by [Dashcam.io](https://dashcam.io/?ref=testdrivergithub))
  - Desktop Video Replay
  - AI Logs
  - Chrome Developer Console
  - Chrome Network Requests
  - Universal Logfile Ingestion

# Example Prompt

```
1. focus the Wave application with Spotlight
2. click "Continue"
3. focus the Wave input with the keyboard shorcut Command + I
4. type 'ls' into the input
5. press return
6. validate Wave shows the result of 'ls'
```
 
# How

1. Spawn a Mac1 VM
2. Clone your repository (optional)
4. Runs `prerun.sh`
5. Spawns AI Agent with prompt
  6. Reads step
  7. Looks at screen, reads text and describes images
  8. Determines what actions it needs to take to reach goal of prompt step
  9. Executes actions
10. Agent summarizes results

# Example Workflow

This is an example workflow that [Wave Terminal](https://github.com/wavetermdev/waveterm) uses to test their electron application nightly and on every feature branch and send the results to Slack.

```yml
name: TestDriver.ai

on:
  push:
    branches: ["main"]
  pull_request:
    branches: ["main"]
  workflow_dispatch:

jobs:
  test:
    name: "TestDriver"
    runs-on: ubuntu-latest
    steps:
      - uses: replayableio/testdriver-action@main
        id: testdriver
        with:
          prompt: |
            1. focus the Wave application with Spotlight
            2. click "Continue"
            3. focus the Wave input with the keyboard shorcut Command + I
            4. type 'ls' into the input
            5. press return
            6. validate Wave shows the result of 'ls'
        env:
          GH_TOKEN: ${{ secrets.GH_TOKEN }}
      - name: Send custom JSON data to Slack workflow
        id: slack
        if: ${{ always() }}
        uses: slackapi/slack-github-action@v1.25.0
        with:
          # This data can be any valid JSON from a previous step in the GitHub Action
          payload: |
            {
              "link": "${{ steps.testdriver.outputs.link }}",
              "summary": ${{ toJSON(steps.testdriver.outputs.summary)}}
            }
        env:
          SLACK_WEBHOOK_URL: "https://hooks.slack.com/triggers/xxx/yyy/zzz"
```

# Prerun Script

TestDriver will look for a script in `./testdriver/prerun.sh` and execute this before the AI prompt.

## Launch Chrome

```sh
npm install dashcam-chrome --save
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --load-extension=./node_modules/dashcam-chrome/build/ 1>/dev/null 2>&1 &
exit
```

## Electron App (Wave Terminal)

```sh
brew install go
brew tap scripthaus-dev/scripthaus
brew install scripthaus
npm install -g yarn
mkdir ~/build
cd ~/build
git clone https://github.com/wavetermdev/waveterm.git
cd waveterm
scripthaus run build-backend
echo "Yarn"
yarn
echo "Rebuild"
scripthaus run electron-rebuild
echo "Webpack"
scripthaus run webpack-build
echo "Starting Electron"
scripthaus run electron 1>/dev/null 2>&1 &
echo "Electron Done"
exit
```

`.testdriver/prerun.sh`
