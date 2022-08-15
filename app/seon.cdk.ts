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

const discovery_stack = new ServiceDiscoveryStack(base_stack, APP.name + 'DISCOVERY', {
    description: 'Defines the Application Load Balancers and the CloudMap Service.',
    stackName: APP.name + 'DISCOVERY',
});

const mesh_stack = new MeshStack(discovery_stack, APP.name + 'MESH', {
    description: 'Defines Mesh Components like the Virtual Nodes, Routers and Services.',
    stackName: APP.name + 'MESH',
});

const ecs_stack = new EcsServicesStack(mesh_stack, APP.name + 'ECS', {
    description: 'Defines the Fargate Services and their Task Definitions.',
    stackName: APP.name + 'ECS',
});

discovery_stack.addDependency(base_stack);
mesh_stack.addDependency(discovery_stack);
ecs_stack.addDependency(mesh_stack);
