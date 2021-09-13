import * as cdk from "@aws-cdk/core";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as ddb from "@aws-cdk/aws-dynamodb";
import * as iam from "@aws-cdk/aws-iam";
import * as ecs from "@aws-cdk/aws-ecs";
import * as ecr from "@aws-cdk/aws-ecr";
import * as acm from "@aws-cdk/aws-certificatemanager";
import * as s3 from "@aws-cdk/aws-s3";
import * as route53 from "@aws-cdk/aws-route53";
import * as route53targets from "@aws-cdk/aws-route53-targets";
import * as ecsPatterns from "@aws-cdk/aws-ecs-patterns";
import * as loadBalancer from "@aws-cdk/aws-elasticloadbalancingv2";

import * as base from "../../../lib/template/construct/base/base-construct";

export interface EcsInfraProps extends base.ConstructProps {
  stackName: string;
  infraVersion: string;
  vpc: ec2.IVpc;
  cluster: ecs.ICluster;
  dockerImageType: string;
  ecrRepo: ecr.Repository;
  containerPort: number;
  internetFacing: boolean;
  dockerPath: string;
  memory: string;
  cpu: string;
  desiredTasks: number;
  autoscaling: boolean;
  minTasks: number;
  maxTasks: number;
  tableName?: string;
  enviroment: string;
  domainName: string;
  subDomain: string;
  taskEnv?: { [key: string]: string } | undefined;
}

export class EcsInfraConstrunct extends base.BaseConstruct {
  table: ddb.Table;
  containerName: string;
  service: ecs.FargateService;
  alb: loadBalancer.ApplicationLoadBalancer;

  constructor(scope: cdk.Construct, id: string, props: EcsInfraProps) {
    super(scope, id, props);

    const baseName = props.stackName;
    this.containerName = `${baseName}Container`;

    /**
     * Define an Application Load Balancer.
     * @resource AWS::ElasticLoadBalancingV2::LoadBalancer
     */
    const alb = new loadBalancer.ApplicationLoadBalancer(
      this,
      baseName + "-alb",
      {
        loadBalancerName: baseName + "-alb",
        vpc: props.vpc,
        vpcSubnets: { subnets: props.vpc.publicSubnets }, // BK is this subnet defined
        internetFacing: props.internetFacing,
      }
    );

    /**
     * Container for records, and records contain information about how to route traffic
     * for a specific domain, such as seon.com and its subdomains (api.seon.com)
     */

    const zone = route53.HostedZone.fromLookup(
      this,
      props.domainName + "-HostedZone",
      {
        domainName: props.domainName,
      }
    );

    new route53.ARecord(this, props.domainName + "-SiteAliasRecord", {
      recordName: props.domainName,
      target: route53.RecordTarget.fromAlias(
        new route53targets.LoadBalancerTarget(alb)
      ),
      comment: `${props.domainName} API domain`,
      zone: zone,
    });

    const certificate = new acm.Certificate(this, baseName + "-Certificate", {
      domainName: props.domainName,
      subjectAlternativeNames: [`*.${props.domainName}`],
      validation: acm.CertificateValidation.fromEmail(),
    });

    const targetGroupHttp = new loadBalancer.ApplicationTargetGroup(
      this,
      baseName + "-Target",
      {
        port: 4000,
        vpc: props.vpc,
        protocol: loadBalancer.ApplicationProtocol.HTTP,
        targetType: loadBalancer.TargetType.IP,
      }
    );

    targetGroupHttp.configureHealthCheck({
      path: "/api/status",
      protocol: loadBalancer.Protocol.HTTP,
    });

    const listener = alb.addListener(baseName + "-Listener", {
      open: true,
      port: 443,
      certificates: [certificate],
    });

    listener.addTargetGroups(baseName + "-TG", {
      targetGroups: [targetGroupHttp],
    });

    const albSG = new ec2.SecurityGroup(this, baseName + "-ALB_SG", {
      vpc: props.vpc,
      allowAllOutbound: true,
    });

    albSG.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      "Allow https traffic"
    );

    alb.addSecurityGroup(albSG);

    const bucket = new s3.Bucket(this, `${baseName.toLowerCase()}-s3`, {
      bucketName: `${baseName.toLowerCase()}-s3`,
    });

    const taskRole = new iam.Role(this, baseName + "TaskRole", {
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
      roleName: baseName + "-TaskRole",
      description: "Role that the api task definitions use to run the api code",
    });

    taskRole.attachInlinePolicy(
      new iam.Policy(this, baseName + "-TaskPolicy", {
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["S3:*"],
            resources: [bucket.bucketArn],
          }),
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["SES:*"],
            resources: ["*"],
          }),
        ],
      })
    );

    const taskDefinition = new ecs.TaskDefinition(this, baseName + "-TaskDef", {
      family: baseName + "TaskDef",
      compatibility: ecs.Compatibility.EC2_AND_FARGATE,
      cpu: props.cpu,
      memoryMiB: props.memory,
      networkMode: ecs.NetworkMode.AWS_VPC,
      taskRole: taskRole,
    });

   

    const container = taskDefinition.addContainer("Container", {
      containerName: `${baseName}Container`,
      image: this.getContainerImage(props),
      logging: new ecs.AwsLogDriver({
          streamPrefix: `${baseName}Log`
      }),
      // environment: {
      //     Namespace: `${this.projectPrefix}-NS`,
      //     TargetServiceName: targetServiceStackName,
      //     AlbDnsName: this.getParameter(targetServiceStackName, 'AlbDnsName')
      // }
  });

    container.addPortMappings({ containerPort: 4000 });

    const ecsSG = new ec2.SecurityGroup(this, baseName + "-ECS_SG", {
      vpc: props.vpc,
      allowAllOutbound: true,
    });

    ecsSG.connections.allowFrom(
      albSG,
      ec2.Port.allTcp(),
      "Application load balancer"
    );

    const service = new ecs.FargateService(this, baseName + "-Service", {
      cluster: props.cluster,
      desiredCount: 1,
      taskDefinition,
      securityGroups: [ecsSG],
      assignPublicIp: true,
    });

    service.attachToApplicationTargetGroup(targetGroupHttp);

    const scalableTaget = service.autoScaleTaskCount({
      minCapacity: 1,
      maxCapacity: 5,
    });

    scalableTaget.scaleOnMemoryUtilization(`${baseName}-ScaleUpMem`, {
      targetUtilizationPercent: 75,
    });

    scalableTaget.scaleOnCpuUtilization(`${baseName}-ScaleUpCPU`, {
      targetUtilizationPercent: 75,
    });

    this.service = service;
    this.alb = alb;
  }

  private getContainerImage(props: EcsInfraProps): ecs.ContainerImage {
    if (props.dockerImageType == "HUB") {
      return ecs.ContainerImage.fromRegistry("amazon/amazon-ecs-sample");
    } else if (props.dockerImageType == "ECR") {
      return ecs.ContainerImage.fromEcrRepository(props.ecrRepo);
    } else {
      return ecs.ContainerImage.fromAsset(props.dockerPath);
    }
  }

  private createTaskRole(baseName: string): iam.Role {
    const role = new iam.Role(this, `TaskRole`, {
      roleName: `${baseName}TaskRole`,
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
    });

    role.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: ["*"],
        actions: ["dynamodb:Scan", "dynamodb:PutItem"],
      })
    );

    return role;
  }

  private createExecutionRole(baseName: string): iam.Role {
    const role = new iam.Role(this, `ExecutionRole`, {
      roleName: `${baseName}ExecutionRole`,
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
    });

    role.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: ["*"],
        actions: [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
        ],
      })
    );
    role.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: ["*"],
        actions: ["logs:CreateLogStream", "logs:PutLogEvents"],
      })
    );

    return role;
  }
}

/*
    // outputs to be used in code deployments
    new cdk.CfnOutput(this, `${env}ServiceName`, {
        exportName: `${env}ServiceName`,
        value: service.serviceName,
      });
  
      new cdk.CfnOutput(this, `${env}ImageRepositoryUri`, {
        exportName: `${env}ImageRepositoryUri`,
        value: props.ecrRepo.repositoryUri,
      });
  
      new cdk.CfnOutput(this, `${env}ImageName`, {
        exportName: `${env}ImageName`,
        value: image.imageName,
      });
  
      new cdk.CfnOutput(this, `${env}ClusterName`, {
        exportName: `${env}ClusterName`,
        value: props.cluster.clusterName,
      });

      */
