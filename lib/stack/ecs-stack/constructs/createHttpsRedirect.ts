import * as ec2 from '@aws-cdk/aws-ec2';
import * as loadBalancerV2 from '@aws-cdk/aws-elasticloadbalancingv2';
import * as cdk from '@aws-cdk/core';

/// Creates ALB redirect from port 80 to the HTTPS endpoint
const createHttpsRedirect = (
    stackName: string,
    scope: cdk.Stack, // cdk.Construct
    loadBalancer: loadBalancerV2.ApplicationLoadBalancer,
) => {
    const port = 80;
    loadBalancer.connections.allowFromAnyIpv4(ec2.Port.tcp(port));

    const actionProperty: loadBalancerV2.CfnListener.ActionProperty = {
        redirectConfig: {
            port: '443',
            protocol: 'HTTPS',
            statusCode: 'HTTP_302',
        },
        type: 'redirect',
    };

    const redirectProps: loadBalancerV2.CfnListenerProps = {
        defaultActions: [actionProperty],
        loadBalancerArn: loadBalancer.loadBalancerArn,
        port,
        protocol: 'HTTP',
    };

    return new loadBalancerV2.CfnListener(scope, `${stackName}HttpRedirect`, redirectProps);
};

export default createHttpsRedirect;
