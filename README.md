# SEON Cloud Development Kit (AWS CDK)

\
Jump To:
[Developer Guide](https://docs.aws.amazon.com/cdk/latest/guide) |
[CDK V2](https://docs.aws.amazon.com/cdk/api/v2/) |
[API Reference](https://docs.aws.amazon.com/cdk/api/latest/docs/aws-construct-library.html) |
[Getting Started](#getting-started) |
-------

## Getting Started

```console
npm i -g aws-cdk
```

# SOLUTIONS 
Container-based MSA: each micro-services are implemented using AWS ECS(Cluster/Service/Task)
Programming-based IaC: all cloud resources are modeld and provisioned using AWS CDK(Typescript)
Fully managed CICD: Continuous integration and continuous deploy using AWS Code Series(Pipeline/Commit/Build/Deploy)
Fully managed Monitoring: logging, metric, dashboard using Amazon CloudWatch
Service Discovery: private DNS service registration & discovery using AWS Cloud Map

## SDK

[JS SDK](https://github.com/aws/aws-sdk-js-v3)
[RUBY SDK](https://github.com/aws/aws-sdk-ruby)
[RUBY SDK DEVELOPERS GUIDE](https://docs.aws.amazon.com/sdk-for-ruby/v3/developer-guide/welcome.html)
https://github.com/aws/aws-sdk-js-v3/tree/main/codegen/sdk-codegen


## AWS App Mesh 

https://aws.amazon.com/app-mesh/

A service mesh is a dedicated infrastructure layer that controls service-to-service communication over a network.
A service mesh enables developers to separate and manage service-to-service communications in a dedicated infrastructure layer.
The transport layer provides end-to-end visibility.

 - Streamline operations by offloading communication management logic from application code and libraries into configurable infrastructure.
 - Reduce troubleshooting time required by having end-to-end visibility into service-level logs, metrics and traces across your application.
 - Easily roll out of new code by dynamically configuring routes to new application versions. Canary/Beta testing 
 
Virtual Services → Virtual Service is an abstraction of your actual service provided by either a virtual node or virtual router with routes.

Virtual Nodes → Virtual Nodes is a logical pointer to your actual discoverable service. Virtual Services must be attached to either Virtual Nodes or Virtual Routers.

Virtual Routers and Routes → Virtual routers handle traffic for one or more virtual services within your mesh. A route is associated to a virtual router. 
 - The route is used to match requests for the virtual router and to distribute traffic to its associated virtual nodes.

### X-Ray
https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_xray-readme.html

### External Traffic
https://github.com/aws/aws-app-mesh-examples/tree/main/walkthroughs/howto-external-traffic


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

## Codepipeline 

https://eu-central-1.console.aws.amazon.com/codesuite/codepipeline/pipelines?region=eu-central-1

## CloudWatch

https://eu-central-1.console.aws.amazon.com/cloudwatch/home?region=eu-central-1#home:
