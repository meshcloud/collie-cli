# Collie CLI

<p align="center">
  <img src="/.github/collie-logo-blue.png" width="250">
</p>

<br>

<p align="center">
  <a href="https://github.com/meshcloud/collie-cli/actions/workflows/build.yml">
    <img src="https://github.com/meshcloud/collie-cli/actions/workflows/build.yml/badge.svg">
  </a>
  <a href="https://github.com/meshcloud/collie-cli/blob/develop/LICENSE">
    <img src="https://img.shields.io/github/license/meshcloud/collie-cli">
  </a>
  <a href="https://github.com/meshcloud/collie-cli/releases">
    <img src="https://img.shields.io/github/v/release/meshcloud/collie-cli?sort=semver">
  </a>
</p>

Collie is a tool for building and managing landing zones for AWS, Azure or GCP
as terraform modules.

Use collie to

- define your core cloud architecture and landing zone(s) using maintainable
  terraform modules
- discover and leverage ready-to-use modules implementing best-practice
  solutions to common landing zone challenges from
  [Collie Hub](https://collie.cloudfoundation.org/modules)
- leverage an efficient, opinionated terraform workflow that eliminates
  boilerplate and produces great documentation for application and security
  teams

## 🥜 Collie in a nutshell

Collie is a tool to streamline building and managing landing zones using
terraform for AWS, Azure and GCP. Think of collie like a wrapper around
terraform to scaffold, develop and deploy terraform modules.

- platform engineers use collie to manage a structured git repository containing
  all code defining their landing zone(s)
- collie leverages a terraform workflow (powered by terragrunt) to break down
  complex landing zones into modular, logically structured kit modules
- kit modules are standard terraform modules following minimal conventions
- collie lets you import community-maintained modules from
  [Collie Hub](https://collie.cloudfoundation.org/modules) and customize them in
  a fork & own approach

## 🕹 Installation

Binary downloads of collie can be found on
[the Releases page](https://github.com/meshcloud/collie-cli/releases).

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

## ☝️ Prerequisites <a name="prerequisites"></a>

To use collie, you'll need to have the following tools installed.

- [terraform](https://www.terraform.io/downloads) to define landing zones using
  infrastructure as code
- [terragrunt](https://terragrunt.gruntwork.io/docs/getting-started/install/) to
  build and deploy terraform
- [terraform-docs](https://github.com/terraform-docs/terraform-docs/#installation)
  to generate terraform module documentation
- (optional) [node.js](https://nodejs.org/en/) to preview your cloud foundation
  documentation in a local webserver

For each cloud platform you want to manage, you'll need the cloud CLI installed.

- For AWS, this is the `aws` CLI. Install it
  [here](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html).
  Do **not** use the Docker install method.
- For Azure, this is the `az` CLI. Install it
  [here](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli).
- For Google Cloud, this is the `gcloud` CLI. Install it
  [here](https://cloud.google.com/sdk/docs/quickstart).

## 📚 Documentation

Get started with the [Tutorial](https://collie.cloudfoundation.org/tutorial/) or
browse the [complete documentation](https://collie.cloudfoundation.org/).

## Community, Discussion, Support

Collie is a 🌤️
[cloudfoundation.org community](https://cloudfoundation.org/?ref=github-collie-cli)
project. Reach out to us on the
[cloudfoundation.org slack](http://cloudfoundationorg.slack.com).

For contributers, please review [CONTRIBUTING.md](./../CONTRIBUTING.md).
