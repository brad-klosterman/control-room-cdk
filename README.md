# SEON CDK

## Architecture

- **Container-based MSA**: Each micro-services are implemented using AWS ECS(Cluster/Service/Task)
- **Programming-based IaC**: All cloud resources are modeld and provisioned using AWS CDK(Typescript)
- **Fully managed CICD**: Continuous integration and continuous deploy (Pipeline/GitHub/Build/Deploy)
- **Fully managed Monitoring**: Logging, metric, dashboard using Amazon CloudWatch
- **Service Discovery**: Private DNS service registration & discovery using AWS Cloud Map

![solution-arcitecture](docs/solution-architecture.png)


# VPC
Virtual Private Cloud (VPC) - used to provision resources with a virtual private network to provide greater control over access and security of resources. This section will essentially create the following:

- Private subnets - to block internet access
- Public subnets - allows internet access
- Security groups - allows you to provide connections between resources in the VPC, e.g. allow the load balancer to access Fargate containers 


# CDK OUTPUTS
Outputs are values that we can import into other stacks or simply redirect to a file on the local file system.

Note that the output key is inferred from the id parameter we've passed to the CfnOutput construct. In our case the key is bucketName.

The CfnOutput construct accepts the following props:
- value - the value of the output
- description - a short description of the output value
- exportName - the name of the output, that will be used in cross stack references
- condition - if the condition prop evaluates to false the output is not set for the stack

# NAT Gateway
A NAT gateway is a Network Address Translation (NAT) service. You can use a NAT gateway so that instances in a private subnet can connect to services outside your VPC but external services cannot initiate a connection with those instances.

In AWS, all network traffic in and out of Elastic Network Interfaces (ENIs) is controlled by Security Groups. You can think of Security Groups as a firewall with a set of rules. By default, Security Groups allow no incoming (ingress) traffic and all outgoing (egress) traffic. 

A network access control list (ACL) is an optional layer of security for your VPC that acts as a firewall for controlling traffic in and out of one or more subnets. You might set up network ACLs with rules similar to your security groups in order to add an additional layer of security to your VPC. 


# CIDR
When you create a VPC, you must specify a range of IPv4 addresses for the VPC in the form of a Classless Inter-Domain Routing (CIDR) block; for example, 10.0.0.0/16. This is the primary CIDR block for your VPC.


# VPC
After you create a VPC, you can add one or more subnets in each Availability Zone. A subnet is a range of IP addresses in your VPC. You can launch AWS resources, such as EC2 instances, into a specific subnet. When you create a subnet, you specify the IPv4 CIDR block for the subnet, which is a subset of the VPC CIDR block. Each subnet must reside entirely within one Availability Zone and cannot span zones.


# Subnet
If a subnet's traffic is routed to an internet gateway, the subnet is known as a public subnet. In this diagram, subnet 1 is a public subnet. If you want your instance in a public subnet to communicate with the internet over IPv4, it must have a public IPv4 address or an Elastic IP address (IPv4).

# Internet Gateway
An internet gateway is a horizontally scaled, redundant, and highly available VPC component that allows communication between your VPC and the internet.

To enable access to or from the internet for instances in a subnet in a VPC, you must do the following.
- Create an internet gateway and attach it to your VPC.
- Add a route to your subnet's route table that directs internet-bound traffic to the internet gateway.
- Ensure that instances in your subnet have a globally unique IP address (public IPv4 address, Elastic IP address, or IPv6 address).
- Ensure that your network access control lists and security group rules allow the relevant traffic to flow to and from your instance.


# Fargate
AWS Fargate is a technology that you can use with Amazon ECS to run containers without having to manage servers or clusters of Amazon EC2 instances. With Fargate, you no longer have to provision, configure, or scale clusters of virtual machines to run containers. This removes the need to choose server types, decide when to scale your clusters, or optimize cluster packing.

Each task that runs in Fargate comes with a dedicated Elastic Network Interface (ENI) with a private IP address. All containers of the same task can communicate with each other via localhost. Inbound and outbound task communication goes through the ENI. A public IP address can be enabled as well.

# ALB Listener
A listener is a process that checks for connection requests. You define a listener when you create your load balancer, and you can add listeners to your load balancer at any time.

You can create an HTTPS listener, which uses encrypted connections (also known as SSL offload). This feature enables traffic encryption between your load balancer and the clients that initiate SSL or TLS sessions.





# Task Definitions
A task definition is required to run Docker containers in Amazon ECS. The following are some of the parameters you can specify in a task definition:
- The Docker image to use with each container in your task
- How much CPU and memory to use with each task or each container within a task
- The launch type to use, which determines the infrastructure on which your tasks are hosted
- The Docker networking mode to use for the containers in your task
- The logging configuration to use for your tasks
- Whether the task should continue to run if the container finishes or fails
- The command the container should run when it is started
- Any data volumes that should be used with the containers in the task
- The IAM role that your tasks should use

The Docker networking mode to use for the containers in the task. For Amazon ECS tasks hosted on Fargate, the awsvpc network mode is required.

awsvpc — The task is allocated its own elastic network interface (ENI) and a primary private IPv4 address. This gives the task the same networking properties as Amazon EC2 instances.

When the network mode is awsvpc, the task is allocated an elastic network interface, and you must specify a NetworkConfiguration when you create a service or run a task with the task definition. For more information, see Fargate Task Networking in the Amazon Elastic Container Service User Guide for AWS Fargate.

The awsvpc network mode offers the highest networking performance for containers because they use the Amazon EC2 network stack. Exposed container ports are mapped directly to the attached elastic network interface port, so you cannot take advantage of dynamic host port mappings.

# Sticky sessions for your Application Load Balancer
By default, an Application Load Balancer routes each request independently to a registered target based on the chosen load-balancing algorithm. However, you can use the sticky session feature (also known as session affinity) to enable the load balancer to bind a user’s session to a specific target. This ensures that all requests from the user during the session are sent to the same target. This feature is useful for servers that maintain state information in order to provide a continuous experience to clients. To use sticky sessions, the client must support cookies.