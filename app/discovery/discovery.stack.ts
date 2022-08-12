import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import * as appmesh from 'aws-cdk-lib/aws-appmesh';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53_targets from 'aws-cdk-lib/aws-route53-targets';
import * as service_discovery from 'aws-cdk-lib/aws-servicediscovery';

import { BaseStack } from '../base/base.stack';

export class DiscoveryStack extends Stack {
    readonly base: BaseStack;

    readonly private_dns: service_discovery.PrivateDnsNamespace;

    readonly dns_hosted_zone: route53.HostedZone;

    readonly gatewayALB: elbv2.ApplicationLoadBalancer;

    constructor(base: BaseStack, id: string, props?: StackProps) {
        super(base, id, props);

        this.base = base;

        this.gatewayALB = new elbv2.ApplicationLoadBalancer(
            this,
            this.base.base_name + 'GATEWAY-ALB',
            {
                internetFacing: true,
                loadBalancerName: this.base.base_name + 'GATEWAY-ALB',
                vpc: this.base.vpc,
            },
        );

        this.private_dns = new service_discovery.PrivateDnsNamespace(
            this,
            this.base.base_name + 'PRIVATE-DNS',
            {
                name: 'local',
                vpc: this.base.vpc,
            },
        );

        this.federation_cloudmap
    }

    public getAlbForService = (service_name: string): elbv2.ApplicationLoadBalancer => {
        switch (service_name) {
            case 'GATEWAY':
                return this.gatewayALB;
            default:
                return this.gatewayALB;
        }
    };

    public getServiceDiscovery(service_name: string): appmesh.ServiceDiscovery {
        switch (service_name) {
            case 'GATEWAY':
                return appmesh.ServiceDiscovery.dns(this.gatewayALB.loadBalancerDnsName);
            default:
                return appmesh.ServiceDiscovery.dns(this.gatewayALB.loadBalancerDnsName);
        }
    }
}
