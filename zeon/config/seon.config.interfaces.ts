import { FargateTaskDefinitionProps } from 'aws-cdk-lib/aws-ecs/lib/fargate/fargate-task-definition';

export type AvailableServices =
    | 'federation-service'
    | 'subscriptions-service'
    | 'alarms-service'
    | 'ssp-service'
    | 'workforce-service';

export interface ServiceConfig {
    desired_count: number;
    discovery_type: 'DNS' | 'CLOUDMAP';
    health_check_url: string;
    main_container: {
        environment: {
            [key: string]: string;
        };
        github: {
            branch: string;
            repo: string;
        };
    };
    max_healthy_percent: number;
    min_healthy_percent: number;
    priority: number;
    task_props: FargateTaskDefinitionProps;
}
