import * as ecs from 'aws-cdk-lib/aws-ecs';

export interface CustomContainerProps {
    logStreamPrefix: string;
}

export interface EnvoyContainerProps extends CustomContainerProps {
    app_ports: number[];
    appMeshResourceArn: string;
    enableXrayTracing: boolean;
}

export type XrayContainerProps = CustomContainerProps;

export interface MicroserviceContainerProps extends CustomContainerProps {
    env?: { [key: string]: string };
    image: ecs.ContainerImage;
    portMappings: ecs.PortMapping[];
}
