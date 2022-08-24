import * as cdk from 'aws-cdk-lib';
import { StackProps } from 'aws-cdk-lib';
import * as appmesh from 'aws-cdk-lib/aws-appmesh';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as loadBalancerV2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53targets from 'aws-cdk-lib/aws-route53-targets';
import * as service_discovery from 'aws-cdk-lib/aws-servicediscovery';

import { BaseStack } from '../base/base.stack';
import { AvailableServices } from '../config/seon.config.interfaces';
import { NetworkStack } from '../network/network.stack';

export class DiscoveryStack extends BaseStack {
    readonly network: NetworkStack;
    readonly private_dns: service_discovery.PrivateDnsNamespace;
    readonly dns_hosted_zone: route53.IHostedZone;
    readonly gateway_alb: elbv2.ApplicationLoadBalancer;
    readonly gateway_https_listener: elbv2.ApplicationListener;

    readonly alarms_service_cloudmap: service_discovery.Service;
    readonly workforce_service_cloudmap: service_discovery.Service;
    readonly ssp_service_cloudmap: service_discovery.Service;

    constructor(network: NetworkStack, id: string, props?: StackProps) {
        super(network, id, props);

        this.network = network;

        this.dns_hosted_zone = route53.HostedZone.fromLookup(this, this.base_name + '-dns-zone', {
            domainName: this.network.domain_name,
        });

        this.gateway_alb = new elbv2.ApplicationLoadBalancer(this, this.base_name + 'gateway-alb', {
            internetFacing: true,
            loadBalancerName: this.base_name + '-gateway-alb',
            vpc: this.network.vpc,
        });

        this.gateway_https_listener = this.gateway_alb.addListener(
            this.base_name + '-gateway-alb-443-listener',
            {
                certificates: [
                    loadBalancerV2.ListenerCertificate.fromArn(
                        acm.Certificate.fromCertificateArn(
                            this,
                            this.base_name + 'CERTIFICATE',
                            this.domain_certificate_arn,
                        ).certificateArn,
                    ),
                ],
                defaultAction: loadBalancerV2.ListenerAction.fixedResponse(200, {
                    messageBody: this.base_name + 'GATEWAY',
                }),
                open: true,
                port: 443,
            },
        );

        new loadBalancerV2.CfnListener(this, this.base_name + '-gateway-alb-80-listener', {
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
            loadBalancerArn: this.gateway_alb.loadBalancerArn,
            port: 80,
            protocol: 'HTTP',
        });

        new route53.ARecord(this, this.base_name + `-gateway-alias-record`, {
            recordName: this.base_stage,
            target: route53.RecordTarget.fromAlias(
                new route53targets.LoadBalancerTarget(this.gateway_alb),
            ),
            ttl: cdk.Duration.seconds(60),
            zone: this.dns_hosted_zone,
        });

        // Output the DNS name where you can access the gateway
        new cdk.CfnOutput(this, this.base_name + '-gateway-alb-dns', {
            value: this.gateway_alb.loadBalancerDnsName,
        });

        this.private_dns = new service_discovery.PrivateDnsNamespace(
            this,
            this.private_domain_namespace,
            {
                name: this.private_domain_namespace,
                vpc: this.network.vpc,
            },
        );

        this.alarms_service_cloudmap = this.private_dns.createService(
            this.private_domain_namespace + '-' + this.alarms_service_namespace + '-cloudmap',
            this.buildDnsServiceProps(this.alarms_service_namespace),
        );

        this.workforce_service_cloudmap = this.private_dns.createService(
            this.private_domain_namespace + '-' + this.workforce_service_namespace + '-cloudmap',
            this.buildDnsServiceProps(this.workforce_service_namespace),
        );

        this.ssp_service_cloudmap = this.private_dns.createService(
            this.private_domain_namespace + '-' + this.ssp_service_namespace + '-cloudmap',
            this.buildDnsServiceProps(this.ssp_service_namespace),
        );
    }

    private buildDnsServiceProps = (
        service_namespace: AvailableServices,
    ): service_discovery.DnsServiceProps => {
        return {
            customHealthCheck: {
                failureThreshold: 1,
            },
            dnsRecordType: service_discovery.DnsRecordType.A,
            name: service_namespace,
        };
    };

    public getListener(service_namespace: AvailableServices): elbv2.ApplicationListener {
        switch (service_namespace) {
            case this.federation_service_namespace:
                return this.gateway_https_listener;
            default:
                return this.gateway_https_listener;
        }
    }

    public getCloudMapService(service_namespace: AvailableServices): service_discovery.Service {
        switch (service_namespace) {
            case this.alarms_service_namespace:
                return this.alarms_service_cloudmap;
            case this.workforce_service_namespace:
                return this.workforce_service_cloudmap;
            case this.ssp_service_namespace:
                return this.ssp_service_cloudmap;
            default:
                return this.alarms_service_cloudmap;
        }
    }

    public getServiceDiscovery(service_name: string): appmesh.ServiceDiscovery {
        switch (service_name) {
            case this.federation_service_namespace:
                return appmesh.ServiceDiscovery.dns(this.gateway_alb.loadBalancerDnsName);
            case this.alarms_service_namespace:
                return appmesh.ServiceDiscovery.cloudMap(this.alarms_service_cloudmap);
            case this.workforce_service_namespace:
                return appmesh.ServiceDiscovery.cloudMap(this.workforce_service_cloudmap);
            case this.ssp_service_namespace:
                return appmesh.ServiceDiscovery.cloudMap(this.ssp_service_cloudmap);
            default:
                return appmesh.ServiceDiscovery.dns(this.gateway_alb.loadBalancerDnsName);
        }
    }
}

// this.gateway_https_listener.addAction(this.base_name + 'ALB-DEFAULT-RESPONSE', {
//     action: loadBalancerV2.ListenerAction.fixedResponse(404, {
//         messageBody: 'SEON DEVELOPMENT 404',
//     }),
// });
