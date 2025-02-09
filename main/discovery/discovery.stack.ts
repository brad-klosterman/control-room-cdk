import { CfnOutput, Duration, StackProps } from 'aws-cdk-lib';
import { ServiceDiscovery } from 'aws-cdk-lib/aws-appmesh';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import { Peer, Port, SecurityGroup } from 'aws-cdk-lib/aws-ec2';
import {
    ApplicationListener,
    ApplicationLoadBalancer,
    CfnListener,
    ListenerCertificate,
} from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import {
    ARecord,
    HostedZone,
    IHostedZone,
    PrivateHostedZone,
    RecordTarget,
} from 'aws-cdk-lib/aws-route53';
import { LoadBalancerTarget } from 'aws-cdk-lib/aws-route53-targets';
import { IPrivateHostedZone } from 'aws-cdk-lib/aws-route53/lib/hosted-zone';
import {
    DnsRecordType,
    DnsServiceProps,
    PrivateDnsNamespace,
    Service,
} from 'aws-cdk-lib/aws-servicediscovery';

import { BaseStack } from '../base/base.stack';
import { AvailableServices } from '../config/types';
import { NetworkStack } from '../network/network.stack';

export class DiscoveryStack extends BaseStack {
    /**
     * Network Stack: VPC, IAM
     */
    readonly network: NetworkStack;

    /**
     * Service Discovery Namespace for cloud resources
     * Define namespace for resources so that the applications can dynamically discover them.
     */
    readonly private_dns: PrivateDnsNamespace;

    /**
     * Amazon Route53 Private Hosted Zone.
     * - Used to find mesh virtual service
     * - Used to avoid an IP address lookup error.
     */
    readonly private_hosted_zone: IPrivateHostedZone;

    /**
     * Amazon Route53 Public Hosted Zone.
     * - A container that holds information about how you want to route traffic
     * - Used with the ALB
     */
    readonly dns_hosted_zone: IHostedZone;

    /**
     * Application Load Balancer
     * SEON: https://eu-central-1.console.aws.amazon.com/ec2/v2/home?region=eu-central-1#LoadBalancers:sort=loadBalancerName
     */
    gateway_alb: ApplicationLoadBalancer;
    gateway_alb_security: SecurityGroup;

    /**
     * A listener is a process that checks for connection requests, using the protocol and port that you configure.
     * The rules that you define for a listener determine how the load balancer routes requests to its registered targets.
     */
    gateway_https_listener: ApplicationListener;

    /**
     * CloudMap Namespaces
     * A namespace that applications can use to dynamically discover each other
     * SEON: https://eu-central-1.console.aws.amazon.com/cloudmap/home/namespaces?region=eu-central-1
     */
    readonly alarms_service_cloudmap: Service;
    readonly workforce_service_cloudmap: Service;
    readonly ssp_service_cloudmap: Service;

    constructor(network: NetworkStack, id: string, props?: StackProps) {
        super(network, id, props);

        this.network = network;

        this.dns_hosted_zone = HostedZone.fromLookup(this, this.base_name + '-dns-hosted-zone', {
            domainName: this.network.domain_name,
        });

        this.private_hosted_zone = new PrivateHostedZone(
            this,
            this.base_name + '-private-hosted-zone',
            {
                vpc: this.network.vpc,
                zoneName: this.base_stage + '-appmesh.local',
            },
        );

        this.configureGatewayALB(this.base_name + '-gateway-alb');

        /**
         * - Define namespace for resources so that the applications can dynamically discover them.
         */
        this.private_dns = new PrivateDnsNamespace(this, this.base_name + '-private-dns', {
            name: this.base_stage + '-cloudmap.local',
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
            // defaultAction: ListenerAction.fixedResponse(200, {
            //     messageBody: alb_name + ' --default response-- ',
            // }),
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
            this.base_name + '-' + service_namespace + '-cloudmap',
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

    /**
     * Provides the Service Discovery method a VirtualNode uses
     */
    public getNodeDiscovery(service_namespace: string): ServiceDiscovery {
        switch (service_namespace) {
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
