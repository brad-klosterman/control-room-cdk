#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { CfnParameter } from 'aws-cdk-lib';

import { BaseStack } from '../lib/stacks/base.stack';
import { EcsServicesStack } from '../lib/stacks/ecs-service.stack';
import { MeshStack } from '../lib/stacks/mesh-components';
import { ServiceDiscoveryStack } from '../lib/stacks/service-discovery';

const app = new cdk.App();

const ENVIRONMENT = app.node.tryGetContext('environment');

export const APP = {
    env: {
        account: '894556524073',
        profile: 'seon',
        region: 'eu-central-1',
    },
    name: 'SEON' + ENVIRONMENT,
};

const base_stack = new BaseStack(app, APP.name + 'BASE', {
    description: 'Defines the Network Infrastructure, container images and ECS Cluster.',
    stackName: APP.name + 'BASE',
});

const serviceDiscoveryStack = new ServiceDiscoveryStack(base_stack, 'ServiceDiscoveryStack', {
    description: 'Defines the application load balancers and the CloudMap service.',
    stackName: 'service-discovery',
});

const meshStack = new MeshStack(serviceDiscoveryStack, 'MeshStack', {
    description: 'Defines mesh components like the virtual nodes, routers and services.',
    stackName: 'mesh-components',
});

const ecsServicesStack = new EcsServicesStack(meshStack, 'ECSServicesStack', {
    description: 'Defines the Fargate services and their task definitions.',
    stackName: 'ecs-services',
});

serviceDiscoveryStack.addDependency(base_stack);
meshStack.addDependency(serviceDiscoveryStack);
ecsServicesStack.addDependency(meshStack);
