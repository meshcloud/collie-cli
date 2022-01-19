# Contributing to Collie

## How to release new code

We are using GitHub Action as CI/CD solution for Collie. The definition of releasing pipeline can be found here: `.github/workflows/releases.yml`. The versions have this format `va.b.c`, e.g. `v0.1.0`. The first number (`a`) representing a breaking change, the second (`b`) indicates new features and the third (`c`) indicates patches. As of right now, the release pipeline increases only the feature indicator (`b`) by one on each release. It does this automatically. In case there is a breaking change, manual intervention is required by the Collie team to ensure that the first number (`a`) is increased.

The release will be triggered on each push on `develop` with a new version tag. The triggered process makes sure that `main` always contains the code up to the tagged release version. Direct pushes to `main` are prevented. The full workflow from forth to back is as follows:

- For changes on code a new branch must be created from `develop`. E.g. you create a new great feature that is ready for review. You create a branch `feature/something-really-great`. After approval ✅,  you merge this branch into `develop`.
- You want to release this code as a new feature release (e.g. going from `v0.2.0` to `v0.3.0`), so add a 

- **Important: Don't forget to change the version number in `version.ts` to the version you are about to tag. This process is sadly not automated at the moment.**
- Tag your new release PR with e.g. `git tag -a v1.4.0`
- You open a pull request that merges `feature/something-really-great` into `develop`. **Make sure to use the merge strategy 'Rebase and Merge' and NOT Squash**. You will need at least one approval from someone for this.
- After merging the PR into `develop`, a new release is created shortly after. This is all automatic. The install script also always works with the latest version, so you're done. Nice! 🎉 
