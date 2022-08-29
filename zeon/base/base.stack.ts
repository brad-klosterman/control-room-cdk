import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';

import { AvailableServices } from '../config/seon.config.interfaces';

export class BaseStack extends Stack {
    /**
     *  base_name: Used for resource naming and identification
     *  - SEON-development | SEON-qa | SEON-staging |  SEON-production
     */
    base_name: string;

    /**
     * base_stage: The stage in the pipeline environment
     * - development | qa | staging | production
     */
    base_stage: string;

    /**
     * Route53 hosted domain_name
     * - Route 53 is a highly available and scalable Domain Name System (DNS) web service
     * * SEON Route53 Dashboard: https://us-east-1.console.aws.amazon.com/route53/v2/home#Dashboard
     */
    domain_name: string;

    /**
     * domain_certificate_arn: a certificate managed by AWS Certificate Manager
     * * SEON ACM: https://eu-central-1.console.aws.amazon.com/acm/home?region=eu-central-1#/certificates/list
     */
    domain_certificate_arn: string;

    /**
     * The main container port used for ingress microservice communication
     * - 4000
     */
    main_port: number;

    /**
     * Federation Gateway Microservice cloudmap namespace
     * - alarms-service
     * SEON CloudMap: https://eu-central-1.console.aws.amazon.com/cloudmap/home/namespaces
     */
    federation_service_namespace: AvailableServices;

    /**
     * Events microservice cloudmap namespace
     * - subscriptions
     */
    events_service_namespace: AvailableServices;

    /**
     * Alarms subgraph microservice cloudmap namespace
     * - alarms
     */
    alarms_service_namespace: AvailableServices;

    /**
     * SSP subgraph microservice cloudmap namespace
     * - ssp
     */
    ssp_service_namespace: AvailableServices;

    /**
     * Workforce subgraph microservice cloudmap namespace
     * - workforce
     */
    workforce_service_namespace: AvailableServices;

    /**
     * Available subgraph microservices
     * - alarms | workforce | ssp
     */
    sub_graphs: AvailableServices[];

    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        this.base_name = this.node.tryGetContext('BASE_NAME');
        this.base_stage = this.node.tryGetContext('STAGE');

        this.domain_name = 'seon-gateway.com';

        this.domain_certificate_arn = `arn:aws:acm:${this.region}:${
            this.account
        }:certificate/${this.node.tryGetContext('certificate_identifier')}`;

        this.main_port = 4000;

        this.federation_service_namespace = 'federation';
        this.events_service_namespace = 'events';

        this.alarms_service_namespace = 'alarms';
        this.ssp_service_namespace = 'ssp';
        this.workforce_service_namespace = 'workforce';

        this.sub_graphs = [
            this.alarms_service_namespace,
            this.ssp_service_namespace,
            this.workforce_service_namespace,
        ];
    }
}
