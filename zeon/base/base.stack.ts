import { Stack, StackProps } from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

import { AvailableServices } from '../config/seon.config.interfaces';

export class BaseStack extends Stack {
    base_name: string;
    base_stage: string;
    domain_name: string;
    private_domain_namespace: string;
    domain_certificate_arn: string;
    main_port: number;

    sub_graphs: AvailableServices[];

    federation_service_namespace: AvailableServices;
    subscriptions_service_namespace: AvailableServices;

    // SUB GRAPHS
    alarms_service_namespace: AvailableServices;
    ssp_service_namespace: AvailableServices;
    workforce_service_namespace: AvailableServices;

    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        this.base_name = this.node.tryGetContext('BASE_NAME');
        this.base_stage = this.node.tryGetContext('STAGE');

        this.domain_name = 'seon-gateway.com';
        this.private_domain_namespace = this.base_stage + '-mesh';

        this.domain_certificate_arn = `arn:aws:acm:${this.region}:${
            this.account
        }:certificate/${this.node.tryGetContext('certificate_identifier')}`;

        this.main_port = 4000;

        this.federation_service_namespace = 'federation-service';
        this.subscriptions_service_namespace = 'subscriptions-service';

        this.alarms_service_namespace = 'alarms-service';
        this.ssp_service_namespace = 'ssp-service';
        this.workforce_service_namespace = 'workforce-service';

        this.sub_graphs = [
            this.alarms_service_namespace,
            this.ssp_service_namespace,
            this.workforce_service_namespace,
        ];
    }
}
