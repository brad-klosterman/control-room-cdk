# SEON Cloud Development Kit (AWS CDK)

\
Jump To:
[Developer Guide](https://docs.aws.amazon.com/cdk/latest/guide) |
[CDK V2](https://docs.aws.amazon.com/cdk/api/v2/) |
[API Reference](https://docs.aws.amazon.com/cdk/api/latest/docs/aws-construct-library.html) |
[Getting Started](#getting-started) |
-------

## Getting Started

For a detailed walkthrough, see the [tutorial](https://docs.aws.amazon.com/cdk/latest/guide/getting_started.html#hello_world_tutorial) in the AWS CDK [Developer Guide](https://docs.aws.amazon.com/cdk/latest/guide/home.html).

### At a glance
Install or update the [AWS CDK CLI] from npm (requires [Node.js ≥ 14.15.0](https://nodejs.org/download/release/latest-v14.x/)). We recommend using a version in [Active LTS](https://nodejs.org/en/about/releases/)

```console
npm i -g aws-cdk
```


## VPC

A NAT gateway is a Network Address Translation (NAT) service. You can use a NAT gateway so that instances in a private subnet can connect to services outside your VPC



## Application Load Balancer 

Elastic Load Balancing automatically distributes your incoming traffic across multiple targets, such as EC2 instances, containers, and IP addresses.
It monitors the health of its registered targets, and routes traffic only to the healthy targets
Elastic Load Balancing scales your load balancer as your incoming traffic changes over time. It can automatically scale to the vast majority of workloads

A listener checks for connection requests from clients, using the protocol and port that you configure.
The rules that you define for a listener determine how the load balancer routes requests to its registered targets

Each target group routes requests to one or more registered targets, such as EC2 instances, using the protocol and port 
number that you specify. You can register a target with multiple target groups. You can configure health checks on a per 
target group basis. Health checks are performed on all targets registered to a target group that is specified in a listener rule for your load balancer.



## AWS App Mesh 

https://aws.amazon.com/app-mesh/

is a service mesh based on the Envoy proxy. It standardizes how microservices communicate, giving you end-to-end visibility and helping to ensure high-availability for your applications.


Why use App Mesh?
Streamline operations by offloading communication management logic from application code and libraries into configurable infrastructure.
Reduce troubleshooting time required by having end-to-end visibility into service-level logs, metrics and traces across your application.
Easily roll out of new code by dynamically configuring routes to new application versions.
Ensure high-availability with custom routing rules that help ensure every service is highly available during deployments, after failures, and as your application scales.
Manage all service to service traffic using one set of APIs regardless of how the services are implemented.

### X-Ray
https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_xray-readme.html

### External Traffic
https://github.com/aws/aws-app-mesh-examples/tree/main/walkthroughs/howto-external-traffic


## Codepipeline 

https://eu-central-1.console.aws.amazon.com/codesuite/codepipeline/pipelines?region=eu-central-1

## CloudWatch

https://eu-central-1.console.aws.amazon.com/cloudwatch/home?region=eu-central-1#home:

## SDK

https://github.com/aws/aws-sdk-js-v3
https://github.com/aws/aws-sdk-ruby
https://github.com/aws/aws-sdk-js-v3/tree/main/codegen/sdk-codegen
