# SEON CDK

## Architecture

- **Container-based MSA**: Each micro-services are implemented using AWS ECS(Cluster/Service/Task)
- **Programming-based IaC**: All cloud resources are modeled and provisioned using AWS CDK(Typescript)
- **Fully managed CICD**: Continuous integration and continuous deploy (Pipeline/GitHub/Build/Deploy)
- **Fully managed Monitoring**: Logging, metric, dashboard using Amazon CloudWatch
- **Service Discovery**: Private DNS service registration & discovery using AWS Cloud Map

## Host conditions
You can use host conditions to define rules that route requests based on the host name in the host header (also known as host-based routing). This enables you to support multiple subdomains and different top-level domains using a single load balancer.

A hostname is not case-sensitive, can be up to 128 characters in length, and can contain any of the following characters:

A–Z, a–z, 0–9

- .

* (matches 0 or more characters)

? (matches exactly 1 character)

You must include at least one "." character. You can include only alphabetical characters after the final "." character.

Example hostnames

example.com

test.example.com

*.example.com

The rule *.example.com matches test.example.com but doesn't match example.com.

Example host header condition for the AWS CLI

You can specify conditions when you create or modify a rule. For more information, see the create-rule and modify-rule commands. The following condition is satisfied by requests with a host header that matches the specified string.

[
{
"Field": "host-header",
"HostHeaderConfig": {
"Values": ["*.example.com"]
}
}
]