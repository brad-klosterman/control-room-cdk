import * as cdk from "@aws-cdk/core";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as ddb from "@aws-cdk/aws-dynamodb";
import * as iam from "@aws-cdk/aws-iam";
import * as ecs from "@aws-cdk/aws-ecs";
import * as ecr from "@aws-cdk/aws-ecr";
import * as acm from "@aws-cdk/aws-certificatemanager";
import * as route53 from "@aws-cdk/aws-route53";
import * as route53targets from "@aws-cdk/aws-route53-targets";
import * as ecsPatterns from "@aws-cdk/aws-ecs-patterns";
import * as loadBalancer from "@aws-cdk/aws-elasticloadbalancingv2";

import * as base from "../../../lib/template/construct/base/base-construct";

export interface EcsInfraProps extends base.ConstructProps {
  stackName: string;
  domainName: string;
  subDomain: string;
  infraVersion: string;
  vpc: ec2.IVpc;
  cluster: ecs.ICluster;
  dockerImageType: string;
  ecrRepo: ecr.Repository;
  containerPort: number;
  internetFacing: boolean;
  dockerPath: string;
  memory: number;
  cpu: number;
  desiredTasks: number;
  autoscaling: boolean;
  minTasks: number;
  maxTasks: number;
  tableName?: string;
}

export class EcsInfraConstrunct extends base.BaseConstruct {
  table: ddb.Table;
  containerName: string;
  service: ecs.FargateService;
  alb: loadBalancer.ApplicationLoadBalancer;

  constructor(scope: cdk.Construct, id: string, props: EcsInfraProps) {
    super(scope, id, props);

    const baseName = props.stackName;
    const apiDomain = props.subDomain + "." + props.domainName;
    this.containerName = `${baseName}Container`;

    // Routes
    let zone;
    try {
      zone = route53.HostedZone.fromLookup(
        this,
        props.domainName + "HostedZone",
        {
          domainName: "" + props.domainName,
        }
      );
    } catch (err) {
      zone = new route53.PublicHostedZone(
        this,
        props.domainName + "HostedZone",
        {
          zoneName: "" + props.domainName,
        }
      );
    }

    new cdk.CfnOutput(this, apiDomain + "Site", {
      value: "https://" + apiDomain,
    });

    const backEndCertificateArn = new acm.DnsValidatedCertificate(
      this,
      apiDomain + "SiteCertificate",
      {
        domainName: apiDomain,
        hostedZone: zone,
      }
    ).certificateArn;

    new cdk.CfnOutput(this, apiDomain + "-Certificate", {
      value: backEndCertificateArn,
    });

    const alb = new ecsPatterns.ApplicationLoadBalancedFargateService(
      this,
      "" + baseName,
      {
        assignPublicIp: true,
        cluster: props.cluster,
        taskImageOptions: {
          image: this.getContainerImage(props),
          containerName: this.containerName,
          environment: {
            APP_NAME: props.stackName,
            INFRA_VERSION: props.infraVersion,
            CONTAINER_SERVICE: "AWS ECS",
            DDB_TABLE:
              props.tableName != undefined ? this.table.tableName : "no-table",
            PORT_IN: `${props.containerPort}`,
            Namespace: `${props.projectPrefix}-NS`,
          },
          logDriver: new ecs.AwsLogDriver({
            streamPrefix: `${baseName}Log`,
          }),
          enableLogging: true,
          containerPort: props.containerPort,
          taskRole: this.createTaskRole(baseName),
          executionRole: this.createExecutionRole(baseName),
        },
        cloudMapOptions: {
          name: props.stackName,
        },
      }
    );

    alb.loadBalancer.addListener(baseName + "HttpsListener", {
      certificateArns: [backEndCertificateArn],
      protocol: loadBalancer.ApplicationProtocol.HTTPS,
      port: 443,
      sslPolicy: loadBalancer.SslPolicy.RECOMMENDED,
      open: true,
      defaultTargetGroups: [alb.targetGroup],
    });

    new route53.ARecord(this, apiDomain + "SiteAliasRecord", {
      recordName: apiDomain,
      target: route53.RecordTarget.fromAlias(
        new route53targets.LoadBalancerTarget(alb.loadBalancer)
      ),
      ttl: cdk.Duration.seconds(300),
      comment: `${apiDomain} Gateway API domain`,
      zone: zone,
    });

 
    this.service = alb.service;
    this.alb = alb.loadBalancer;

    // this.putParameter(
    //   "AlbDnsName",
    //   albFargateService.loadBalancer.loadBalancerDnsName
    // );
    // this.putParameter(
    //   "ServiceSecurityGroupId",
    //   this.service.connections.securityGroups[0].securityGroupId
    // );


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
