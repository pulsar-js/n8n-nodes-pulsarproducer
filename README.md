# n8n-nodes-pulsarproducer

This is an n8n community node. It is used to publish messages to Apache Pulsar.

![1763057374115](image/README/1763057374115.png)

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

## What makes this node unique?

This node is built on [@pulsar-js/producer](https://github.com/pulsar-js/producer) instead of the official [pulsar-client](https://www.npmjs.com/package/pulsar-client) module.

The official pulsar client module is a wrapper around the Pulsar C++ library. Native Node.js modules are notoriously difficult to setup because they require a compiler (used by node-gyp) to handle the build step. This can be a blocking barrier in environments that do not allow extra build tools.

The [@pulsar-js/producer](https://github.com/pulsar-js/producer) module, which was written for this node, uses a [pre-built binary](https://github.com/pulsar-js/producer-bin). This eliminates the need for a C++ compiler. The pre-built binary is written in Go using the official Pulsar Go client.

## WARNING
> n8n actively blocks `postinstall` and outbound downloads from modules at runtime (for security purposes). As a result, the binaries used by this module cannot be easily installed directly through the n8n portal unless they are packaged with the npm module. This requires OS/architecture-specific versions of this module (i.e. one npm module for every OS/architecture). That is something we'd like to do, but it needs to be automated as part of the release cycle. We've not had time to automate this yet. Since this is a new module and we're not sure how many people will use it, we're taking a "build on request" approach to this. Open an issue to request a specific architecture. In the meantime, see the "Installation > Dependency Installation" section to get this working.

## Table of Contents

1. [Installation](#installation)
1. [Credentials](#credentials)
1. [Compatibility](#compatibility)
1. [Usage](#usage)
1. [Resources](#resources)
1. [Development](#development)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation. This module is named `n8n-nodes-pulsarproducer`.

### Dependency Installation

This node relies on `@pulsar-js/producer`. n8n's security policies make it difficult to install binaries unless they are packaged with the module. We cannot bundle every OS/architecture-specific binary in this module without making it unfeasibly large. We intend to make OS/architecture-specific npm modules as requested. If your OS/architecture is not yet supported, you can request it (open an issue), or you can install the dependencies using the instructions below.

1. Install the node through the portal as you would any other community module.
1. On your n8n server, navigate to the `n8n-nodes-pulsarproducer` module dependencies. It will be in a directory like `/<my_n8n_root>/main/.n8n/nodes/node_modules/n8n-nodes-pulsarproducer/node_modules/@pulsar-js/producer`.
1. Run `npm run postinstall`.

This will generate a `bin` directory with the correct binary for your OS.

```sh
ls -l ./bin
-rwxr-xr-x 1 root root 18088084 Nov 15 15:15 pulsar-publish
```

## Credentials

This module supports the following Pulsar authentication strategies:

- None
- Basic Auth
- OpenID Connect (OIDC)
- Mutual TLS (mTLS)
- OAuth2
- Athenz

![1763058982159](image/README/1763058982159.png)

## Compatibility

This node was written and tested in the following environment:

- n8n v1.108.1
- platform: npm
- Node.js v24.0.0
- database: sqlite
- executionMode: regular
- concurrency: -1
- license: community

## Usage

This node is designed for node workflows that need to publish individual messages.

A new connection is established for each message/batch sent (no connection pooling). Once a message is sent, the connection is dropped. This is not ideal for platforms that send a constant stream of messages or need the absolute lowest possible latency. However; if you need to send <500 messages per minute, the latency is negligble (<1ms) and the connections are lightweight. The limiting factor is much more likely to be your Pulsar cluster capacity than these ephemeral connections.

## Resources

* [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
* [@pulsar-js/producer](https://github.com/pulsar-js/producer) (underlying npm module)
* [prebuilt binaries](https://github.com/pulsar-js/producer-bin)

## Development

I created this node because I couldn't install the alternatives in a restricted n8n environment. Additionally, the existing Pulsar nodes for n8n did not fully support OIDC, which is something I needed at the time of creation.

Copyright &copy; 2025, [Corey Butler](https://github.com/coreybutler). MIT License.