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
`feature/something-really-great` and submit it as a PR against `main`. After
approval ✅ your code is merged as usual.

## How to release new code

We are using GitHub Action as CI/CD pipeline for Collie, specifically this
[release workflow](.github/workflows/releases.yml).

The versions have this format `vMAJOR.MINOR.PATCH`, e.g. `v0.1.0`.

- `MAJOR` representing a breaking change
- `MINOR` indicates new features
- `PATCH` indicates backwards-compatible patches

The release is triggered on each push on `main` with a new version tag. The
triggered process makes sure that `main` always contains the code up to the
tagged release version.

Direct pushes to `main` are prevented. The full workflow from forth to back is
as follows:

- decide on the version number you want to use for the release
- **Important: Change the version number in `info.ts`. This process is sadly not
  automated at the moment.**
- create a "release vX.Y.Z" pull request containing that version number bump
- release PRs must be merged using the merge strategy 'Rebase and Merge' and NOT
  Squash.
- manually tag the resulting merge commit with a version tag, e.g.
  `git tag -a v1.4.0` and push the tag to github
- the release is created automatically by the
  [release workflow](.github/workflows/releases.yml)

> Note: The install script also always works with the latest version, so you're
> done. Nice! 🎉
