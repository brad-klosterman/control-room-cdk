import * as cdk from 'aws-cdk-lib';
import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import * as appmesh from 'aws-cdk-lib/aws-appmesh';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as loadBalancerV2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53targets from 'aws-cdk-lib/aws-route53-targets';
import * as route53_targets from 'aws-cdk-lib/aws-route53-targets';
import { IHostedZone } from 'aws-cdk-lib/aws-route53/lib/hosted-zone-ref';
import * as service_discovery from 'aws-cdk-lib/aws-servicediscovery';

import { BaseStack } from '../base/base.stack';

export class DiscoveryStack extends Stack {
    readonly base: BaseStack;
    readonly private_dns: service_discovery.PrivateDnsNamespace;
    readonly dns_hosted_zone: route53.IHostedZone;
    readonly gateway_alb: elbv2.ApplicationLoadBalancer;
    readonly gateway_https_listener: elbv2.ApplicationListener;
    readonly federation_service_cloudmap: service_discovery.Service;

    constructor(base: BaseStack, id: string, props?: StackProps) {
        super(base, id, props);

        this.base = base;

        this.dns_hosted_zone = route53.HostedZone.fromLookup(
            this,
            this.base.base_name + 'DNS-ZONE',
            {
                domainName: this.base.domain_name,
            },
        );

        this.gateway_alb = new elbv2.ApplicationLoadBalancer(
            this,
            this.base.base_name + 'GATEWAY-ALB',
            {
                internetFacing: true,
                loadBalancerName: this.base.base_name + 'GATEWAY-ALB',
                vpc: this.base.vpc,
            },
        );

        this.gateway_https_listener = this.gateway_alb.addListener(
            this.base.base_name + 'ALB-LISTENER',
            {
                certificates: [
                    loadBalancerV2.ListenerCertificate.fromArn(
                        acm.Certificate.fromCertificateArn(
                            this,
                            this.base.base_name + 'CERTIFICATE',
                            this.base.domain_certificate_arn,
                        ).certificateArn,
                    ),
                ],
                open: true,
                port: 443,
            },
        );

        this.gateway_https_listener.addAction(this.stackName + 'DEFAULT-RESPONSE', {
            action: loadBalancerV2.ListenerAction.fixedResponse(404, {
                messageBody: 'SEON DEVELOPMENT 404',
            }),
        });

        new route53.ARecord(this, this.base.base_name + `ALIAS_RECORD`, {
            recordName: this.base.base_name + `ALIAS_RECORD`,
            target: route53.RecordTarget.fromAlias(
                new route53targets.LoadBalancerTarget(this.gateway_alb),
            ),
            ttl: cdk.Duration.seconds(60),
            zone: this.dns_hosted_zone,
        });

        this.private_dns = new service_discovery.PrivateDnsNamespace(
            this,
            this.base.base_name + 'PRIVATE-DNS',
            {
                name: 'local',
                vpc: this.base.vpc,
            },
        );

        this.federation_service_cloudmap = this.private_dns.createService(
            this.base.base_name + base.federation_service + 'CLOUDMAP',
            this.buildDnsServiceProps(base.federation_service),
        );
    }

    private buildDnsServiceProps = (service_name: string): service_discovery.DnsServiceProps => {
        return {
            customHealthCheck: {
                failureThreshold: 1,
            },
            dnsRecordType: service_discovery.DnsRecordType.A,
            name: service_name,
        };
    };

    public getListener(service_name: string): elbv2.ApplicationListener {
        switch (service_name) {
            case this.base.federation_service:
                return this.gateway_https_listener;
            default:
                return this.gateway_https_listener;
        }
    }

    public getCloudMapService(service_name: string): service_discovery.Service {
        switch (service_name) {
            case this.base.federation_service:
                return this.federation_service_cloudmap;
            default:
                return this.federation_service_cloudmap;
        }
    }

    public getServiceDiscovery(service_name: string): appmesh.ServiceDiscovery {
        switch (service_name) {
            case this.base.federation_service:
                return appmesh.ServiceDiscovery.dns(this.gateway_alb.loadBalancerDnsName);
            // case this.base.serviceBackend2:
            //     return appmesh.ServiceDiscovery.cloudMap(this.backendV2CloudMapService);
            default:
                return appmesh.ServiceDiscovery.dns(this.gateway_alb.loadBalancerDnsName);
        }
    }
}
