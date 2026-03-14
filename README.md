# erlang-ci

A standardized CI/CD pipeline for Erlang/OTP projects.

**Three ways to use it:**

1. **Reusable CI workflow** — a complete CI pipeline with parallel jobs
2. **Reusable release workflow** — auto-tag and release from conventional commits
3. **Composite action** — just setup + caching, bring your own jobs

## Quick start

Create `.github/workflows/ci.yml` in your project:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  ci:
    uses: Taure/erlang-ci/.github/workflows/ci.yml@v1
    with:
      otp-version: '28'
```

This runs **compile → fmt | xref | dialyzer | eunit** in parallel.

## CI pipeline

After compile, all enabled steps run in parallel:

```
                    ┌─ fmt ─────────────────────┐
                    ├─ xref ────────────────────┤
                    ├─ dialyzer ────────────────┤
                    ├─ audit ───────────────────┤
compile ──────────► ├─ eunit ───────────────────┤
                    ├─ ct ──────────────────────┤
                    ├─ coverage ────────────────┤
                    ├─ sbom ────────────────────┤
                    ├─ dependency-submission ───┤
                    ├─ ex-doc ──────────────────┤
                    └───────────────────────────┘
```

| Step | Default | Input | Requires |
|------|---------|-------|----------|
| Compile | always | — | — |
| Format (`rebar3 fmt --check`) | **on** | `enable-fmt` | `erlfmt` plugin |
| Xref | **on** | `enable-xref` | — |
| Dialyzer | **on** | `enable-dialyzer` | — |
| EUnit | **on** | `enable-eunit` | — |
| Common Test | off | `enable-ct` | — |
| ExDoc | off | `enable-ex-doc` | `rebar3_ex_doc` plugin |
| Audit | off | `enable-audit` | `rebar3_audit` plugin |
| Coverage | off | `enable-coverage` | `covertool` plugin + `{cover_enabled, true}` |
| SBOM | off | `enable-sbom` | `rebar3_sbom` plugin |
| Dependency Submission | off | `enable-dependency-submission` | — (self-contained) |

## Release workflow

A reusable workflow that auto-tags and creates GitHub releases from conventional commits using [git-cliff](https://git-cliff.org/).

**How it works:**

1. Analyzes commits since the last tag
2. Determines the next semver (`feat:` → minor, `fix:` → patch, breaking → major)
3. Creates a git tag and pushes it
4. Creates a GitHub release with auto-generated changelog
5. Skips silently if no version bump is needed

**Usage:**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  ci:
    uses: Taure/erlang-ci/.github/workflows/ci.yml@v1
    with:
      otp-version: '28'

  release:
    needs: ci
    if: github.event_name == 'push'
    uses: Taure/erlang-ci/.github/workflows/release.yml@v1
    permissions:
      contents: write
    secrets: inherit
```

**Requirements:**

- Conventional commit messages (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`)
- A `cliff.toml` in your project root (copy from this repo)

| Input | Default | Description |
|-------|---------|-------------|
| `cliff-config` | `cliff.toml` | Path to git-cliff config file |

## Examples

### Simple library

```yaml
jobs:
  ci:
    uses: Taure/erlang-ci/.github/workflows/ci.yml@v1
    with:
      otp-version: '28'
```

### Library with OTP version matrix

Tests run on all OTP versions. Dialyzer, xref, and fmt run on the primary version only.

```yaml
jobs:
  ci:
    uses: Taure/erlang-ci/.github/workflows/ci.yml@v1
    with:
      otp-version: '28'
      otp-matrix: '["27", "28"]'
```

### Web application with PostgreSQL

When `postgres: true` is set, both eunit and CT jobs get a PostgreSQL service container. PG connection details are available as environment variables (`PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`).

```yaml
jobs:
  ci:
    uses: Taure/erlang-ci/.github/workflows/ci.yml@v1
    with:
      otp-version: '28'
      enable-ct: true
      postgres: true
      postgres-version: '17'
      postgres-db: 'myapp_test'
```

### Full pipeline with everything enabled

```yaml
jobs:
  ci:
    uses: Taure/erlang-ci/.github/workflows/ci.yml@v1
    with:
      otp-version: '28'
      otp-matrix: '["27", "28"]'
      enable-ct: true
      enable-ex-doc: true
      enable-audit: true
      enable-coverage: true
      enable-sbom: true
      enable-dependency-submission: true
      postgres: true

  release:
    needs: ci
    if: github.event_name == 'push'
    uses: Taure/erlang-ci/.github/workflows/release.yml@v1
    permissions:
      contents: write
    secrets: inherit
```

**Required rebar.config plugins for the full pipeline:**

```erlang
{project_plugins, [
    erlfmt,
    rebar3_ex_doc,
    rebar3_audit,
    covertool,
    rebar3_sbom
]}.

{cover_enabled, true}.
```

### Auto-detect .tool-versions

If your project has a `.tool-versions` file, it will be used automatically — no configuration needed:

```yaml
jobs:
  ci:
    uses: Taure/erlang-ci/.github/workflows/ci.yml@v1
```

You can also point to a specific file explicitly:

```yaml
jobs:
  ci:
    uses: Taure/erlang-ci/.github/workflows/ci.yml@v1
    with:
      version-file: 'mise.toml'
```

### Mix with custom jobs

Use the reusable workflow for the standard pipeline, then add custom jobs alongside:

```yaml
jobs:
  ci:
    uses: Taure/erlang-ci/.github/workflows/ci.yml@v1
    with:
      otp-version: '28'

  integration:
    needs: ci
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: Taure/erlang-ci@v1
        with:
          otp-version: '28'
      - run: rebar3 compile
      - run: ./scripts/integration_test.sh
```

### Standalone setup action

If you prefer writing your own workflow but want the setup and caching handled:

```yaml
steps:
  - uses: actions/checkout@v4
  - uses: Taure/erlang-ci@v1
    with:
      otp-version: '28'
  - run: rebar3 compile
  - run: rebar3 eunit
```

The composite action handles:
- Installing Erlang/OTP and rebar3 via [erlef/setup-beam](https://github.com/erlef/setup-beam)
- Caching `~/.cache/rebar3` (hex packages, plugins)
- Caching `_build` (compiled dependencies)

## Inputs reference

### Versions

| Input | Default | Description |
|-------|---------|-------------|
| `otp-version` | `28` | Erlang/OTP version |
| `rebar3-version` | `3` | Rebar3 version |
| `version-file` | — | Read versions from `.tool-versions` or `mise.toml` |
| `otp-matrix` | — | JSON array of OTP versions for matrix testing (e.g. `'["27","28"]'`) |

### Steps

| Input | Default | Description |
|-------|---------|-------------|
| `enable-fmt` | `true` | Run `rebar3 fmt --check` |
| `enable-xref` | `true` | Run `rebar3 xref` |
| `enable-dialyzer` | `true` | Run `rebar3 dialyzer` (with PLT caching) |
| `enable-eunit` | `true` | Run `rebar3 eunit` |
| `enable-ct` | `false` | Run `rebar3 ct` |
| `enable-ex-doc` | `false` | Run `rebar3 ex_doc` |
| `enable-audit` | `false` | Run `rebar3 audit` (dep vulnerability scanning) |
| `enable-coverage` | `false` | Coverage via covertool + Codecov upload |
| `enable-sbom` | `false` | Generate CycloneDX SBOM via `rebar3 sbom` |
| `enable-dependency-submission` | `false` | Submit deps to GitHub Dependency Graph |

### PostgreSQL

| Input | Default | Description |
|-------|---------|-------------|
| `postgres` | `false` | Enable PostgreSQL service for eunit and CT |
| `postgres-version` | `17` | PostgreSQL Docker image version |
| `postgres-db` | `test_db` | Database name |
| `postgres-user` | `postgres` | Username |
| `postgres-password` | `postgres` | Password |
| `postgres-port` | `5432` | Host port |

### Test configuration

| Input | Default | Description |
|-------|---------|-------------|
| `ct-config` | — | Path to CT sys.config file |
| `ct-args` | — | Extra args for `rebar3 ct` |
| `eunit-args` | — | Extra args for `rebar3 eunit` (e.g. `--module=foo_tests`) |
| `rebar3-compile-args` | — | Extra args for `rebar3 compile` |

## Templates

### Migration rollback testing

A Common Test suite template for testing Kura migration rollbacks is available at [`templates/migration_rollback_SUITE.erl`](templates/migration_rollback_SUITE.erl). It rolls back every migration one by one, verifies a clean state, then re-applies all migrations.

### cliff.toml

A default git-cliff config for conventional commits is available at [`cliff.toml`](cliff.toml). Copy it to your project root to use with the release workflow.

## Real-world usage

These projects use erlang-ci:

| Project | Config |
|---------|--------|
| [Nova](https://github.com/novaframework/nova) | OTP matrix 26/27/28, fmt, + nova_request_app integration |
| [Kura](https://github.com/Taure/kura) | PostgreSQL, CT, eunit, ex_doc, audit, coverage, SBOM, dependency submission, auto-release |
| [rebar3_fly](https://github.com/Taure/rebar3_fly) | OTP matrix 27/28, ex_doc |
| [rebar3_kura](https://github.com/Taure/rebar3_kura) | OTP matrix 27/28 |
| [rebar3_audit](https://github.com/Taure/rebar3_audit) | Standard + custom dogfood job |

## What this replaces

Instead of copying 50-120 lines of boilerplate YAML into every Erlang project:

```yaml
# before: setup-beam, cache config, compile, fmt, xref, dialyzer, eunit...
# repeated in every repo, drifting apart over time

# after:
uses: Taure/erlang-ci/.github/workflows/ci.yml@v1
with:
  otp-version: '28'
```

## License

Apache-2.0
