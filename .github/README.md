<h1 align="center">🐶 Collie CLI</h1>

<p align="center">
  <img src="/.github/collie-logo-blue.png" width="250">
</p>

<p align="center">
  <i>Herd your cloud 🐑 environments with Collie</i>
</p>
<br>

<p align="center">
  <a href="/">
    <img src="https://github.com/meshcloud/collie-cli/actions/workflows/build.yml/badge.svg">
  </a>
  <a href="/">
    <img src="https://img.shields.io/badge/maintained-true-green">
  </a>
  <a href="/">
    <img src="https://img.shields.io/github/license/meshcloud/collie-cli">
  </a>
  <a href="/">
    <img src="https://img.shields.io/github/v/release/meshcloud/collie-cli?sort=semver">
  </a>
</p>

<p align="center">
    Collie CLI allows you to manage your tenants (<b>AWS</b> Accounts, <b>Azure</b> Subscriptions & <b>Google Cloud</b> Projects) through a single view.
    View your tenants, tags, costs, users, access rights and more through a single common model and stay in control of your cloud landscape.
</p>

<img align="center" src="/.github/collie-demo.gif">

## ⛅️ Overview

- **View all cloud tenants in one single overview** - View your AWS Accounts,
  Azure Subscriptions, and Google Cloud Projects with their metadata with only
  one command.
- **View billing information across all clouds** - See what you spend per day,
  month, or week in all cloud platforms*, including the right metadata. Includes
  support for CSV, YML and JSON.
- **Analyze tag inconsistencies** - See at a glance what tags are used, by which
  tenants (and which not), and what potential inconsistencies are in place to
  fix any governance issues.
- **Track your cloud history** - Collie CLI is built on the principles of GitOps
  and its data can easily be written to git repositories for tracking changes in
  your cloud environments.

<sup><sub>*GCP is currently not supported. Follow the issue
[here](https://github.com/meshcloud/collie-cli/issues/17) to get updated on
progress.</sub></sup>

## ☝️ Prerequisites

For each cloud platform you want to manage, you'll need the equivalent cloud CLI
installed.

- For AWS, this is the `aws` CLI. Install it
  [here](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html).
  Do **not** use the Docker install method.
  - Make sure that you are logged into the
    [management account](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_getting-started_concepts.html),
    which is necessary for listing all AWS Accounts & costs.
- For Azure, this is the `az` CLI. Install it
  [here](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli).
  - Make sure that your user has access to all possible Azure Subscriptions.
    Subscriptions that you do not have access to will not be listed with Collie.
- For Google Cloud, this is the `gcloud` CLI. Install it
  [here](https://cloud.google.com/sdk/docs/quickstart).
  - Make sure that your user has access to all possible Google Cloud Projects.
    Projects that you do not have access to will not be listed with Collie.

That's it! Let's get Collie installed ⤵️

## 🕹 Install and Usage

We have an easy-to-use install script prepared that will install Collie for you
in under a minute. To use it, run the command below depending on your operating
system. Additionally, check the content of the file to be sure that the install
script is safe. If you want, you could also download the [`install.sh`](https://github.com/meshcloud/collie-cli/blob/develop/install.sh) script in
this repository and execute it locally.

**Linux / Ubuntu**

```
curl -sf -L https://raw.githubusercontent.com/meshcloud/collie-cli/main/install.sh | sudo bash
```

**Mac OS X**

```
curl -sf -L https://raw.githubusercontent.com/meshcloud/collie-cli/main/install.sh | sh
```

**Windows**

We sadly do not support Windows at the moment. Follow
[this issue](https://github.com/meshcloud/collie-cli/issues/2) to get updated on
the progress of Collie for Windows.

## 👋 Need help or have feedback?

Having some difficulties and need some help? No worries! Visit our forum
[here](https://github.com/meshcloud/collie-cli/discussions) and let us know what
you need help with. You can also let us know if you have any ideas on how to
improve our CLI. We're very eager to hear your thoughts.

You can also reach out to our [Twitter account](https://twitter.com/meshstack)
and get in touch with us there!

## 🙋‍ Contributor List

This project was originally kicked off by three team members at meshcloud. We
wanted to bring out some of our experience building cloud foundation teams to
the public so everyone can get a taste of what it's like to supercharge your
(multi-)cloud governance.

We are very happy to accept contributions from others as well!

<a href="https://github.com/meshcloud/collie-cli/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=meshcloud/collie-cli" />
</a>

## ⭐️ Stargazers

<img src="https://starchart.cc/meshcloud/collie-cli.svg" alt="Stargazers over time" style="max-width: 100%">

<p align="center"><b>Made with ❤️ by <a href="https://meshcloud.io/?ref=gh-collie">meshcloud</a></b></p>
