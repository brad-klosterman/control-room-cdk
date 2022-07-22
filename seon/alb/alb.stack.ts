import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as loadBalancerV2 from '@aws-cdk/aws-elasticloadbalancingv2';
import * as acm from '@aws-cdk/aws-certificatemanager';
import { createHTTPSRedirect } from './alb.redirects';
import * as route53 from '@aws-cdk/aws-route53';
import * as route53targets from '@aws-cdk/aws-route53-targets';

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
    const stack = new cdk.Stack(scope, app_name + '_ALB_STACK', app_props);

    const zone = route53.HostedZone.fromLookup(stack, app_name + '_ALB53_ZONE', {
        domainName: domain_name,
    });

    const certificate = new acm.Certificate(stack, app_name + "_CERTIFICATE", {
        domainName: domain_name,
        subjectAlternativeNames: [`*.${domain_name}`],
        validation: acm.CertificateValidation.fromDns(zone),
    });

    // const securityGroup1 = new ec2.SecurityGroup(this, 'SecurityGroup1', { vpc });

    const alb = new loadBalancerV2.ApplicationLoadBalancer(stack, app_name + '_ALB', {
        loadBalancerName: app_name + '_ALB',
        vpc,
        internetFacing: true,
        // securityGroup: securityGroup1, // Optional - will be automatically created otherwise
    });

    const https_listener = alb.addListener(app_name + '_ALB_LISTENER', {
        port: 443,
        open: true,
        certificates: [loadBalancerV2.ListenerCertificate.fromArn(certificate.certificateArn)],
        // defaultAction: alb.ListenerAction.fixedResponse(403, {
        //     contentType: elb.ContentType.APPLICATION_JSON,
        //     messageBody: 'Forbidden'
        // })
    });


    createHTTPSRedirect(app_name + '_ALB_HTTTPSRedirect', stack, alb);

    // Add a Route 53 alias with the Load Balancer as the target
    new route53.ARecord(stack, app_name + `_ALIAS_RECORD`, {
        recordName: app_name + `_ALIAS_RECORD`,
        target: route53.RecordTarget.fromAlias(new route53targets.LoadBalancerTarget(alb)),
        ttl: cdk.Duration.seconds(60),
        zone,
    });

    return {
        zone,
        alb,
        https_listener
    };
};

export default createALBStack;
