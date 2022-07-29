import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as loadBalancerV2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import { createHTTPSRedirect } from './alb.redirects';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53targets from 'aws-cdk-lib/aws-route53-targets';
import { certificate_identifier } from '../seon.app.config';

export const createALBStack = ({
    scope,
    app_props,
    app_name,
    domain_name,
    vpc,
}: {
    scope: cdk.App;
    app_props: cdk.StackProps;
    domain_name: string;
    app_name: string;
    vpc: ec2.IVpc;
}) => {
    const stack = new cdk.Stack(scope, app_name + '-LOADBALANCER', app_props);

    const zone = route53.HostedZone.fromLookup(stack, app_name + '-ALB53-ZONE', {
        domainName: domain_name,
    });

    const domainCertificateArn = `arn:aws:acm:${app_props?.env?.region}:${app_props?.env?.account}:certificate/${certificate_identifier}`;

    const certificate = acm.Certificate.fromCertificateArn(
        stack,
        app_name + '-CERTIFICATE',
        domainCertificateArn
    );

    const alb = new loadBalancerV2.ApplicationLoadBalancer(stack, app_name + '-ALB', {
        loadBalancerName: app_name + '-ALB',
        vpc,
        internetFacing: true,
    });

    const https_listener = alb.addListener(app_name + '-ALB_LISTENER', {
        port: 443,
        open: true,
        certificates: [loadBalancerV2.ListenerCertificate.fromArn(certificate.certificateArn)],
        defaultAction: loadBalancerV2.ListenerAction.fixedResponse(200, {
            contentType: 'text/plain',
            messageBody: 'OK',
        }),
    });

    createHTTPSRedirect(app_name + '-ALB_HTTTPSRedirect', stack, alb);

    const services_target_group = new loadBalancerV2.ApplicationTargetGroup(
        stack,
        app_name + 'SERVICES-TG',
        {
            targetType: loadBalancerV2.TargetType.INSTANCE,
            port: 80,
            vpc,
        }
    );

    https_listener.addTargetGroups(app_name + 'LISTENER-TARGET', {
        targetGroups: [services_target_group],
    });

    /*
     * alb.logAccessLogs()
     * logAccessLogs(bucket: IBucket, prefix?: string): void
     */


    // Add a Route 53 alias with the Load Balancer as the target
    new route53.ARecord(stack, app_name + `-ALIAS_RECORD`, {
        recordName: app_name + `-ALIAS_RECORD`,
        target: route53.RecordTarget.fromAlias(new route53targets.LoadBalancerTarget(alb)),
        ttl: cdk.Duration.seconds(60),
        zone,
    });

    return {
        zone,
        alb,
        https_listener,
        services_target_group
    };
};

export default createALBStack;

/*
    const deploymentGroup = new codedeploy.ServerDeploymentGroup(this, 'DeploymentGroup', {
        loadBalancer: codedeploy.LoadBalancer.application(targetGroup),
    });
 */
