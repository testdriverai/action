# TestDriver.ai GitHub Action

Authenticate to [TestDriver.ai](https://testdriver.ai) from GitHub Actions using
GitHub's **OIDC** token — no long-lived `TD_API_KEY` secret to store or rotate.

This action **only authenticates**. It mints a short-lived GitHub OIDC token,
exchanges it for your team's TestDriver API key, and exports `TD_API_KEY` to the
job environment (and as step outputs). A **later step** in your job runs the
tests.

## Quick start

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    permissions:
      id-token: write   # REQUIRED — lets the runner mint an OIDC token
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
      - run: npm ci

      - name: Authenticate to TestDriver
        uses: testdriverai/action@stable

      - name: Run TestDriver.ai tests
        run: npx vitest run   # TD_API_KEY is in the environment now
```

> **`permissions: id-token: write` is required.** Without it the runner can't mint
> an OIDC token and the action fails with a clear message.

## One-time setup

Authorize the **TestDriver GitHub App** for your org from the TestDriver console
so the org → team binding exists:

| Channel  | Console                                |
| -------- | -------------------------------------- |
| `stable` | https://console.testdriver.ai          |
| `canary` | https://console-canary.testdriver.ai   |
| `test`   | https://console-test.testdriver.ai     |
| `dev`    | https://console-dev.testdriver.ai      |

If your org authorized the App **before OIDC support shipped**, re-authorize once.

## Inputs

| Input      | Default  | Description                                                                                                  |
| ---------- | -------- | ------------------------------------------------------------------------------------------------------------ |
| `channel`  | `stable` | TestDriver release channel: `dev` \| `test` \| `canary` \| `stable`. Selects the API + console URLs.          |
| `api-root` | _(none)_ | Explicit API root override (e.g. `https://api-test.testdriver.ai`). Wins over `channel` when set.            |
| `api-key`  | _(none)_ | Optional `${{ secrets.TD_API_KEY }}` used as a **fallback** if OIDC auth is unavailable for this org.        |

Pin the action to the channel matching your TestDriver SDK: `@test`, `@canary`,
or `@stable`. `testdriverai init` writes the right one for you.

## Outputs

| Output     | Description                                                                       |
| ---------- | --------------------------------------------------------------------------------- |
| `api-key`  | The resolved TestDriver API key (masked in logs). Also exported as `TD_API_KEY`.  |
| `identity` | JSON identity of the resolved team. Empty when the `api-key` fallback was used.   |

## Fallback to a stored secret

If your org hasn't authorized the App, pass a stored key and the action falls back
to it (with a warning) instead of failing:

```yaml
      - uses: testdriverai/action@stable
        with:
          api-key: ${{ secrets.TD_API_KEY }}
```

Without OIDC and without `api-key`, the action fails with a link to the console so
you know exactly what to do.
