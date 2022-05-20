<h1 align="center">🐶 Collie CLI</h1>

<p align="center">
  <img src="/.github/collie-logo-blue.png" width="250">
</p>

<p align="center">
  <i>Herd your clouds 🐑 with collie</i>
</p>

<p align="center">
  <a href="https://collie-cli.io/">Visit the collie website</a>
</p>

<br>

<p align="center">
  <a href="https://github.com/meshcloud/collie-cli/actions/workflows/build.yml">
    <img src="https://github.com/meshcloud/collie-cli/actions/workflows/build.yml/badge.svg">
  </a>
  <a href="https://github.com/meshcloud/collie-cli/graphs/contributors">
    <img src="https://img.shields.io/badge/maintained-true-green">
  </a>
  <a href="https://github.com/meshcloud/collie-cli/blob/develop/LICENSE">
    <img src="https://img.shields.io/github/license/meshcloud/collie-cli">
  </a>
  <a href="https://github.com/meshcloud/collie-cli/releases">
    <img src="https://img.shields.io/github/v/release/meshcloud/collie-cli?sort=semver">
  </a>
</p>

<p align="center">
    One project on AWS, two on Azure, and might there be something on GCP too 😵? As soon as you have to herd more than a handful of cloud environments, ensuring consistent tagging, permission management and responsible spending becomes a challenge. Collie helps you establish visibility across all your clouds and bring structure to your cloud landscape with landing zones.
</p>

<img align="center" src="/.github/collie-demo.gif">

## ⛅️ Overview

See your costs, IAM, tags, and more across all cloud accounts within minutes -
using your existing cloud CLIs:

- **[View all cloud tenants](https://github.com/meshcloud/collie-cli/wiki#listing-tenants)
  in one single overview** - View your AWS Accounts, Azure Subscriptions, and
  Google Cloud Projects with their metadata with only one command.
- **[View billing information](https://github.com/meshcloud/collie-cli/wiki#listing-costs-per-tenant)
  across all clouds** - See what you spend per day, month, or week in all cloud
  platforms, including the right metadata. Includes support for CSV, YML and
  JSON.
- **[Build a cost dashboard](https://www.meshcloud.io/2021/09/06/open-source-cloud-cost-dashboard-in-under-10-minutes/)** -
  Leverage our free-to-use Google Data Studio template and quickly build a
  multi-cloud cost dashboard using Collie cost data.
- **[Analyze tag inconsistencies](https://github.com/meshcloud/collie-cli/wiki#identifying-inconsistencies-in-the-use-of-tags)** -
  See at a glance what tags are used, by which tenants (and which not), and what
  potential inconsistencies are in place to fix any governance issues.
- **[View IAM assignments](https://github.com/meshcloud/collie-cli/wiki#listing-iam-setup-per-tenant)** -
  See who (or what) has access in what roles to what cloud tenants, including
  inherited roles from ancestors.

Develop and deploy landing zones to provide a solid foundation for your teams to
build on:

- **[Manage a landing zone construction kit](https://github.com/meshcloud/landing-zone-construction-kit)** -
  jumpstart building landing zones for all clouds with a structured and
  consistent workflow and reusable modules
- **Deploy landing zones** across all clouds - deploy landing zones to separate
  dev/prod environments using terraform
- **Document landing zones** for application teams and security stakeholders

## Getting Started

Assuming you have some cloud cli's like `aws`, `az` or `gcloud` already
installed (see [Prerequisites](#️-prerequisites)), here's how to get started

### 🕹 Installation

You can install `collie` using our install scripts below

**Linux / Ubuntu**

```
curl -sf -L https://raw.githubusercontent.com/meshcloud/collie-cli/main/install.sh | sudo bash
```

**Mac OS X**

```
curl -sf -L https://raw.githubusercontent.com/meshcloud/collie-cli/main/install.sh | sh
```

**Windows**

Simply copy the content of
[`install.ps1`](https://github.com/meshcloud/collie-cli/blob/develop/install.ps1)
and run it in your PowerShell console.

### 🚀 Connecting to your clouds

Initialize a new collie repository to hold configuration about your cloud
platforms and start the interactive configuration wizard

```shell
collie init
collie foundation new "my-foundation"
```

### Work with cloud tenants

You can list tenants (e.g. AWS Accounts, Azure Subscriptions, GCP Projects) in
your cloud foundations and manage tags, cost and IAM using the following
commands

```shell
collie tenant list "my-foundation"    # List tenants across all clouds in the foundation
collie tenant cost "my-foundation"    --from 2021-01-01 --to 2021-01-31  # List tenants costs across all clouds in the foundation
collie tenant iam "my-foundation"     # Review access and permissions on tenants
```

### Build Landing Zones

To build landing zones with collie, follow this workflow

```shell
collie kit new "aws/organization-policies"   # generate a new IaC module skeleton
collie kit apply "aws/organization-policies" # apply the module to a cloud platform in your foundation
collie foundation deploy "my-foundation"     # deploy the module to your cloud foundation
```

You can find more information about building and deploying landing zones with
`collie` in the
[Landing Zone Construction Kit documentation](https://landingzone.meshcloud.io).

## ☝️ Prerequisites<a name="prerequisites"></a>

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

_Optional_: To build and deploy landing zones, you'll also need

- [terraform](https://www.terraform.io/downloads) to define landing zones using
  infrastructure as code
- [terragrunt](https://terragrunt.gruntwork.io/docs/getting-started/install/) to
  build and deploy terraform
- [terraform-docs](https://github.com/terraform-docs/terraform-docs/#installation)
  to generate terraform module documentation
- [node.js](https://nodejs.org/en/) to generate your cloud foundation

That's it! Let's get `collie` installed ⤵️

## 👋 Need help or have feedback?

Having some difficulties and need some help? No worries! Visit our forum
[here](https://github.com/meshcloud/collie-cli/discussions) and let us know what
you need help with. You can also let us know if you have any ideas on how to
improve our CLI. We're very eager to hear your thoughts.

You can also reach out to our [Twitter account](https://twitter.com/meshstack)
and get in touch with us there!

## 💡 Why Collie?

At [meshcloud](https://meshcloud.io/) we have years of experience in building
cloud foundations in enterprise organizations with our cloud governance platform
[meshStack](https://meshcloud.io/).

We launched `collie` CLI as a tool for platform engineers and enterprise
architects that want to start getting more control over their clouds with a lean
and tried approach.

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
