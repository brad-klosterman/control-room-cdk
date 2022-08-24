import { CfnOutput, Duration, StackProps } from 'aws-cdk-lib';
import { ServiceDiscovery } from 'aws-cdk-lib/aws-appmesh';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import { Peer, Port, SecurityGroup } from 'aws-cdk-lib/aws-ec2';
import {
    ApplicationListener,
    ApplicationLoadBalancer,
    CfnListener,
    ListenerAction,
    ListenerCertificate,
} from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { ARecord, HostedZone, IHostedZone, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { LoadBalancerTarget } from 'aws-cdk-lib/aws-route53-targets';
import {
    DnsRecordType,
    DnsServiceProps,
    PrivateDnsNamespace,
    Service,
} from 'aws-cdk-lib/aws-servicediscovery';

import { BaseStack } from '../base/base.stack';
import { AvailableServices } from '../config/seon.config.interfaces';
import { NetworkStack } from '../network/network.stack';

export class DiscoveryStack extends BaseStack {
    readonly network: NetworkStack;
    readonly private_dns: PrivateDnsNamespace;
    readonly dns_hosted_zone: IHostedZone;

    gateway_alb: ApplicationLoadBalancer;
    gateway_alb_security: SecurityGroup;
    gateway_https_listener: ApplicationListener;

    readonly alarms_service_cloudmap: Service;
    readonly workforce_service_cloudmap: Service;
    readonly ssp_service_cloudmap: Service;

    constructor(network: NetworkStack, id: string, props?: StackProps) {
        super(network, id, props);

        this.network = network;

        this.dns_hosted_zone = HostedZone.fromLookup(this, this.base_name + '-dns-zone', {
            domainName: this.network.domain_name,
        });

        this.configureGatewayALB(this.base_name + '-gateway-alb');

        this.private_dns = new PrivateDnsNamespace(this, this.private_domain_namespace, {
            name: this.private_domain_namespace,
            vpc: this.network.vpc,
        });

        this.alarms_service_cloudmap = this.configureDiscoveryService(
            this.alarms_service_namespace,
        );

        this.workforce_service_cloudmap = this.configureDiscoveryService(
            this.workforce_service_namespace,
        );

        this.ssp_service_cloudmap = this.configureDiscoveryService(this.ssp_service_namespace);
    }

    private configureGatewayALB(alb_name: string) {
        /**
         * Security group to provide a secure connection between the ALB and the containers
         */
        this.gateway_alb_security = new SecurityGroup(this, alb_name + '-security', {
            allowAllOutbound: true,
            securityGroupName: alb_name + '-security',
            vpc: this.network.vpc,
        });

        this.gateway_alb_security.addIngressRule(
            Peer.anyIpv4(),
            Port.tcp(443),
            'Allow HTTPS Traffic',
        );

        this.gateway_alb_security.addIngressRule(
            Peer.anyIpv4(),
            Port.tcp(80),
            'Allow HTTP Traffic',
        );

        this.gateway_alb = new ApplicationLoadBalancer(this, alb_name, {
            internetFacing: true,
            loadBalancerName: alb_name,
            securityGroup: this.gateway_alb_security,
            vpc: this.network.vpc,
        });

        this.gateway_https_listener = this.gateway_alb.addListener(alb_name + '-443-listener', {
            certificates: [
                ListenerCertificate.fromArn(
                    Certificate.fromCertificateArn(
                        this,
                        alb_name + '-certificate',
                        this.domain_certificate_arn,
                    ).certificateArn,
                ),
            ],
            defaultAction: ListenerAction.fixedResponse(200, {
                messageBody: alb_name + ' --default response-- ',
            }),
            open: true,
            port: 443,
        });

        new CfnListener(this, alb_name + '-80-listener', {
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

        new ARecord(this, alb_name + `-alias-record`, {
            recordName: this.base_stage,
            target: RecordTarget.fromAlias(new LoadBalancerTarget(this.gateway_alb)),
            ttl: Duration.seconds(60),
            zone: this.dns_hosted_zone,
        });

        // Output the DNS name where you can access the gateway
        new CfnOutput(this, alb_name + '-alb-dns', {
            value: this.gateway_alb.loadBalancerDnsName,
        });
    }

    private configureDiscoveryService(service_namespace: AvailableServices): Service {
        return this.private_dns.createService(
            this.private_domain_namespace + '-' + service_namespace + '-cloudmap',
            this.buildDnsServiceProps(service_namespace),
        );
    }

    private buildDnsServiceProps = (service_namespace: AvailableServices): DnsServiceProps => {
        return {
            customHealthCheck: {
                failureThreshold: 1,
            },
            dnsRecordType: DnsRecordType.A,
            name: service_namespace,
        };
    };

    public getListener(service_namespace: AvailableServices): ApplicationListener {
        switch (service_namespace) {
            case this.federation_service_namespace:
                return this.gateway_https_listener;
            default:
                return this.gateway_https_listener;
        }
    }

    public getCloudMapService(service_namespace: AvailableServices): Service {
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

    public getServiceDiscovery(service_name: string): ServiceDiscovery {
        switch (service_name) {
            case this.federation_service_namespace:
                return ServiceDiscovery.dns(this.gateway_alb.loadBalancerDnsName);
            case this.alarms_service_namespace:
                return ServiceDiscovery.cloudMap(this.alarms_service_cloudmap);
            case this.workforce_service_namespace:
                return ServiceDiscovery.cloudMap(this.workforce_service_cloudmap);
            case this.ssp_service_namespace:
                return ServiceDiscovery.cloudMap(this.ssp_service_cloudmap);
            default:
                return ServiceDiscovery.dns(this.gateway_alb.loadBalancerDnsName);
        }
    }
}
