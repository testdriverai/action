# TestDriver.ai

AI QA Agent for GitHub

![TestDriver_1](https://github.com/dashcamio/testdriver/assets/318295/2a0ad981-8504-46f0-ad97-60cb6c26f1e7)

https://github.com/dashcamio/testdriver/assets/318295/3e49a164-3525-49f5-8bdb-4c3c0e5e7010

# Why

Manual testing is reptitive and slow. Automated tests take siginifigant investment time and need to be maintained. The TestDriver QA Agent can test your app with natural language prompts!


# Example Workflow

This is an example workflow that [Wave Terminal](https://github.com/wavetermdev/waveterm) uses to test their electron application nightly and on every feature branch.

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



Example here:
https://github.com/replayableio/testdriver-wave

Supply a `.testdriver/prerun.sh` script to run shell script before AI AGent

1. Generate token in developer settings
![CleanShot 2024-02-24 at 21 11 39](https://github.com/replayableio/testdriver-action/assets/318295/b21dd152-c183-4ce0-987f-31c2e511d3e6)

2. Store as a secret
3. ![CleanShot 2024-02-24 at 21 12 01](https://github.com/replayableio/testdriver-action/assets/318295/9e33a4ef-f885-42a1-be19-2139266ab6de)
