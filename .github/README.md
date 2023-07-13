<h1 align="center">🐶 Collie CLI</h1>

<p align="center">
  <img src="/.github/collie-logo-blue.png" width="250">
</p>

<p align="center">
  <i>Supercharge your cloud journey with Collie!</i>
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
    Collie is your central helper in getting a solid foundation for your organization's
    cloud journey. Roll out and manage your core cloud architecture and landing zone(s)
    easily with Infrastructure-as-Code best-practices based on ready-made modules
    inspired by the cloud providers, such as Microsoft Azure Enterprise Scale.
</p>

## 🥜 Collie in a nutshell

Develop and deploy landing zones to provide a solid foundation for your teams to
build on:

- Jumpstart building landing zones for all clouds with a structured and
  consistent workflow and **ready-to-use modules** from the [Collie Hub](https://github.com/meshcloud/collie-hub)
- **Deploy landing zones** across all clouds - deploy landing zones to separate
  dev/prod environments using terraform
- **Automatically document** your landing zones for application teams and security stakeholders

## ☝️ Prerequisites<a name="prerequisites"></a>

To use collie, you'll need to have the following tools installed.

- [terraform](https://www.terraform.io/downloads) to define landing zones using
  infrastructure as code
- [terragrunt](https://terragrunt.gruntwork.io/docs/getting-started/install/) to
  build and deploy terraform
- [terraform-docs](https://github.com/terraform-docs/terraform-docs/#installation)
  to generate terraform module documentation
- [node.js](https://nodejs.org/en/) to generate and preview your cloud foundation documentation

For each cloud platform you want to manage, you'll need the cloud CLI
installed.

- For AWS, this is the `aws` CLI. Install it
  [here](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html).
  Do **not** use the Docker install method.
- For Azure, this is the `az` CLI. Install it
  [here](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli).
- For Google Cloud, this is the `gcloud` CLI. Install it
  [here](https://cloud.google.com/sdk/docs/quickstart).

## 🕹 Installation

Binary downloads of collie can be found on [the Releases page](https://github.com/meshcloud/collie-cli/releases).

Unpack the collie binary and add it to your PATH and you are good to go!

We also provide installation scripts:

**Linux**

```sh
curl -sf -L https://raw.githubusercontent.com/meshcloud/collie-cli/main/install.sh | sudo bash
```

**macOS**

```sh
curl -sf -L https://raw.githubusercontent.com/meshcloud/collie-cli/main/install.sh | sh
```

**Windows**

```powershell
irm https://raw.githubusercontent.com/meshcloud/collie-cli/main/install.ps1 | iex
```

## 📚 Docs

Get started with the [Tutorial](https://collie.cloudfoundation.org/tutorial/).

## 👋 Need help or have feedback?

Having some difficulties and need some help? No worries! Visit our forum
[here](https://github.com/meshcloud/collie-cli/discussions) and let us know what
you need help with. You can also let us know if you have any ideas on how to
improve our CLI. We're very eager to hear your thoughts.

You can also reach out to our [Twitter account](https://twitter.com/meshstack)
and get in touch with us there!

## 💡 Why Collie?

At [meshcloud](https://meshcloud.io/) we have years of experience in building
and operating large-scale cloud foundations in enterprise organizations
with our cloud foundation platform [meshStack](https://meshcloud.io/en/product).

We launched `collie` CLI as a tool for platform engineers and enterprise
architects that want to start getting more control over their clouds with a lean
and tried approach.

## ⛅️ Get visibility across clouds

Beyond Collie's cloud foundation building capabilities, Collie can also easily seek out key information
across multiple clouds:

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

## 🙋‍ Contributor List

This project was originally kicked off by three team members at meshcloud. We
wanted to bring out some of our experience building cloud foundation teams to
the public so everyone can get a taste of what it's like to supercharge your
cloud journey across all clouds

We are very happy to accept contributions from others as well!

<a href="https://github.com/meshcloud/collie-cli/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=meshcloud/collie-cli" />
</a>

## ⭐️ Stargazers

<img src="https://starchart.cc/meshcloud/collie-cli.svg" alt="Stargazers over time" style="max-width: 100%">

<p align="center"><b>Made with ❤️ by <a href="https://meshcloud.io/?ref=gh-collie">meshcloud</a></b></p>
