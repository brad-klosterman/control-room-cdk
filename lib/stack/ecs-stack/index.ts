import * as acm from '@aws-cdk/aws-certificatemanager';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as ecs from '@aws-cdk/aws-ecs';
import * as route53 from '@aws-cdk/aws-route53';
import * as route53targets from '@aws-cdk/aws-route53-targets';
import * as cdk from '@aws-cdk/core';

import configureALBServices from './constructs/configureALBServices';
import configurePipeline from './constructs/configurePipeline';
import sourceContainerImages from './constructs/sourceContainerImages';
import { IALBProperties, IContainerProperties, IDomainProperties, ITag } from './interfaces';

/** Constructs the stack with given properties.
 * @param scope                 The CDK app
 * @param props                 The CDK stack properties
 * @param vpc                   The VPC to use. Leave as undefined if using a stack created VPC.
 * @param stackName             The Stack identifier
 * @param containers            Defines the tasks to run
 * @param dns                   Define the domain to be registered with Route 53
 * @param tags                  The tags to apply to created services
 */

const createECSStack = ({
    alb,
    cluster,
    containers,
    dns,
    props,
    scope,
    stackName,
    tags,
    vpc,
}: {
    alb: IALBProperties;
    cluster: ecs.Cluster;
    containers: IContainerProperties[];
    dns: IDomainProperties;
    props: cdk.StackProps;
    scope: cdk.App;
    stackName: string;
    tags?: ITag[];
    vpc: ec2.IVpc;
}) => {
    const stack = new cdk.Stack(scope, stackName, props);

    const certificate = acm.Certificate.fromCertificateArn(
        stack,
        stackName + 'Certificate',
        dns.domainCertificateArn,
    );

    const sourcedContainers = sourceContainerImages(stack, containers);

    const { loadBalancer, services } = configureALBServices(
        stackName,
        stack,
        cluster,
        certificate,
        sourcedContainers,
        alb,
        tags,
    );

    configurePipeline({
        cluster,
        services,
        sourcedContainers,
        stack,
        stackName,
    });

    const zone = route53.HostedZone.fromLookup(stack, stackName + 'ZONE', {
        domainName: dns.domainName,
    });

    const URL = `${dns.subdomainName}.${dns.domainName}`;

    new route53.ARecord(stack, `${URL}ALIAS_RECORD`, {
        comment: dns.subdomainName + 'API DOMAIN',
        recordName: dns.subdomainName,
        target: route53.RecordTarget.fromAlias(new route53targets.LoadBalancerTarget(loadBalancer)),
        ttl: cdk.Duration.seconds(60),
        zone: zone,
    });

    // Output the DNS name where you can access your service
    new cdk.CfnOutput(stack, stackName + 'ALB-DNS', {
        value: loadBalancer.loadBalancerDnsName,
    });

    new cdk.CfnOutput(stack, stackName + 'PUBLIC-DNS', {
        value: `${URL}`,
    });

    tags && tags.forEach(tag => cdk.Tags.of(stack).add(tag.name, tag.value));

    return stack;
};

export default createECSStack;
