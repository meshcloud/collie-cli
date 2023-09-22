# Contributing to Collie

## Development

### nix-shell

You can use the provided `default.nix` file to stand up a
[nix-shell](https://nixos.org/manual/nix/stable/command-ref/nix-shell.html)
containing all dependencies required for developing collie, including the cloud
CLIs (aws, az, gcloud). Using the nix-shell is _optional_, you can of course use
it as a recipe for installing depencies with your package manager of choice.

### Git Hooks

The repository contains some conventional git hooks that make it easier to
comply with enforced code style by automating code formatting. Using these is
_optional_, though CI will of course enforce code style for pull requests.

```sh
git config core.hooksPath .githooks
```

## Contributing Pull Requests

For changes on code a new branch must be created from `main`. E.g. you create a
new great feature that is ready for review. You create a branch
`feature/something-really-great` and submit it as a PR against `main`.

After approval queue your changes for merging via GitHub's merge queue.

## How to release new code

We are using GitHub Action as CI/CD pipeline for collie, specifically this
[release workflow](.github/workflows/releases.yml).

The versions have this format `vMAJOR.MINOR.PATCH`, e.g. `v0.1.0`.

- `MAJOR` representing a breaking change
- `MINOR` indicates new features
- `PATCH` indicates backwards-compatible patches

The release is triggered by
[creating a new release via GitHub's UI](https://github.com/meshcloud/collie-cli/releases/new)
**as a prerelease**. This gives us a good workflow to review and edit release
notes before publishing as well as running end to end tests before publishing
the release.

The full workflow from forth to back is as follows:

- decide on the version number you want to use for the release choose a new tag
  "vMAJOR.MINOR.PATCH"
- click "Generate release notes" and tick *
- the release binaries are created automatically by the
  [release workflow](.github/workflows/releases.yml)
- the e2e tests are run after the release workflow completes
  [e2e workflow](.github/workflows/e2e.yml)
- manually inspect the e2e test outcomes and publish the release

> Note: The install script also always works with thse latest version, so you're
> done. Nice! 🎉
