import * as cdk from 'aws-cdk-lib';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as loadBalancerV2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53targets from 'aws-cdk-lib/aws-route53-targets';

import { certificate_identifier } from '../seon.app.config';
import { createHTTPSRedirect } from './alb.redirects';

export const createALBStack = ({
    app_name,
    domain_certificate_arn,
    domain_name,
    stack,
    vpc,
}: {
    app_name: string;
    domain_certificate_arn: string;
    domain_name: string;
    stack: cdk.Stack;
    vpc: ec2.IVpc;
}) => {
    /*
     * DOMAIN
     *
     */

    const zone = route53.HostedZone.fromLookup(stack, app_name + '-ALB53-ZONE', {
        domainName: domain_name,
    });

    const certificate = acm.Certificate.fromCertificateArn(
        stack,
        app_name + '-CERTIFICATE',
        domain_certificate_arn,
    );

    /*
     * Security Group
     *
     */

    // security group that allows all traffic from the same security group
    const security_group = new ec2.SecurityGroup(stack, app_name + '-SHARED-SG', {
        allowAllOutbound: true,
        vpc,
    });

    security_group.connections.allowFrom(security_group, ec2.Port.allTraffic());

    // security group to provide a secure connection between the ALB and the containers
    const alb_security_group = new ec2.SecurityGroup(stack, app_name + '-ALB-SG', {
        allowAllOutbound: true,
        vpc,
    });

    alb_security_group.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'Allow HTTPS Traffic');
    alb_security_group.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'Allow HTTP Traffic');

    /*
     * Application Load Balancer
     *
     */

    const alb = new loadBalancerV2.ApplicationLoadBalancer(stack, app_name + '-ALB', {
        internetFacing: true,
        loadBalancerName: app_name + '-ALB',
        securityGroup: alb_security_group,
        vpc,
    });

    const https_listener = alb.addListener(app_name + '-ALB_LISTENER', {
        certificates: [loadBalancerV2.ListenerCertificate.fromArn(certificate.certificateArn)],
        // defaultTargetGroups: [],
        open: true,
        port: 443,
    });

    https_listener.addAction(app_name + '-ALB_DEFAULT_RESPONSE', {
        action: loadBalancerV2.ListenerAction.fixedResponse(404, {
            messageBody: 'SEON DEVELOPMENT 404',
        }),
    });

    createHTTPSRedirect(app_name + '-ALB_HTTTPSRedirect', stack, alb);

    // Add a Route 53 alias with the Load Balancer as the target
    new route53.ARecord(stack, app_name + `-ALIAS_RECORD`, {
        recordName: app_name + `-ALIAS_RECORD`,
        target: route53.RecordTarget.fromAlias(new route53targets.LoadBalancerTarget(alb)),
        ttl: cdk.Duration.seconds(60),
        zone,
    });

    new cdk.CfnOutput(stack, app_name + '-HTTP-LISTENER-ARN', {
        exportName: app_name + 'HTTP-LISTENER-ARN',
        value: https_listener.listenerArn,
    });

    new cdk.CfnOutput(stack, app_name + '-ALB-DNS', { value: alb.loadBalancerDnsName });

    return {
        alb,
        alb_security_group,
        https_listener,
        security_group,
        zone,
    };
};

export default createALBStack;

/*
    const deploymentGroup = new codedeploy.ServerDeploymentGroup(this, 'DeploymentGroup', {
        loadBalancer: codedeploy.LoadBalancer.application(targetGroup),
    });
 */
