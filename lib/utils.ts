import { StackProps } from 'aws-cdk-lib';
import * as ecs from 'aws-cdk-lib/aws-ecs';

import { ApplicationContainer } from './constructs/application-container';
import { EnvoySidecar } from './constructs/envoy-sidecar';
import { XrayContainer } from './constructs/xray-container';

export enum ServiceDiscoveryType {
    CLOUDMAP = 'CLOUDMAP',
    DNS = 'DNS',
}

export interface CustomContainerProps {
    logStreamPrefix: string;
}

export interface CustomStackProps extends StackProps {
    addMesh?: boolean;
}

export interface EnvoyContainerProps extends CustomContainerProps {
    appMeshResourceArn: string;
    enableXrayTracing: boolean;
}

export interface EnvoyConfiguration {
    container?: EnvoySidecar;
    proxyConfiguration?: ecs.ProxyConfiguration;
}

export type XrayContainerProps = CustomContainerProps;

export interface ApplicationContainerProps extends CustomContainerProps {
    env?: { [key: string]: string };
    image: ecs.ContainerImage;
    portMappings: ecs.PortMapping[];
}

export interface AppMeshFargateServiceProps {
    applicationContainer: ApplicationContainer;
    envoyConfiguration?: EnvoyConfiguration;
    serviceDiscoveryType?: ServiceDiscoveryType;
    serviceName: string;
    taskDefinitionFamily: string;
    xrayContainer?: XrayContainer;
}
