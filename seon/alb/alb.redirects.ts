import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as loadBalancerV2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';

export const createHTTPSRedirect = (
    name: string,
    scope: cdk.Stack,
    loadBalancer: loadBalancerV2.ApplicationLoadBalancer,
) => {
    const port = 80;
    loadBalancer.connections.allowFromAnyIpv4(ec2.Port.tcp(port));

    return new loadBalancerV2.CfnListener(scope, name, {
        defaultActions: [
            {
                redirectConfig: {
                    port: '443',
                    protocol: 'HTTPS',
                    statusCode: 'HTTP_302',
                },
                type: 'redirect',
            },
        ],
        loadBalancerArn: loadBalancer.loadBalancerArn,
        port,
        protocol: 'HTTP',
    });
};
