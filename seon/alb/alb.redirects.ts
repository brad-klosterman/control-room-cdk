import * as cdk from 'aws-cdk-lib';
import * as loadBalancerV2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as ec2 from "aws-cdk-lib/aws-ec2";

export const createHTTPSRedirect = (
    name: string,
    scope: cdk.Stack,
    loadBalancer: loadBalancerV2.ApplicationLoadBalancer
) => {
    const port = 80;
    loadBalancer.connections.allowFromAnyIpv4(ec2.Port.tcp(port));

    return new loadBalancerV2.CfnListener(scope, name, {
        defaultActions: [
            {
                type: 'redirect',
                redirectConfig: {
                    statusCode: 'HTTP_302',
                    protocol: 'HTTPS',
                    port: '443',
                },
            },
        ],
        loadBalancerArn: loadBalancer.loadBalancerArn,
        port,
        protocol: 'HTTP',
    });
};
