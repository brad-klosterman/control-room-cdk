import * as cdk from 'aws-cdk-lib';

import { DiscoveryStack } from './discovery/discovery.stack';
import { ECSStack } from './ecs/ecs.stack';
import { RedisStack } from './elasticache/redis.stack';
import { MeshStack } from './mesh/mesh.stack';
import { NetworkStack } from './network/network.stack';

export const APP = new cdk.App({});

const APP_NAME = APP.node.tryGetContext('BASE_NAME');

const APP_ENV = {
    account: '894556524073',
    profile: 'seon',
    region: 'eu-central-1',
};

const network_stack = new NetworkStack(APP, APP_NAME + '-network-stack', {
    description: 'Defines the Network Infrastructure.',
    env: APP_ENV,
    stackName: APP_NAME + '-NETWORK',
});

const discovery_stack = new DiscoveryStack(network_stack, APP_NAME + '-discovery-stack', {
    description: 'Defines the Application Load Balancers and the CloudMap Service.',
    env: APP_ENV,
    stackName: APP_NAME + '-DISCOVERY',
});

const redis_stack = new RedisStack(network_stack, APP_NAME + '-redis-stack', {
    description: 'Defines the Redis Elasticache Group',
    env: APP_ENV,
    stackName: APP_NAME + '-REDIS',
});

const mesh_stack = new MeshStack(discovery_stack, APP_NAME + '-mesh-stack', {
    description: 'Defines Mesh Components like the Virtual Nodes, Routers and Services.',
    env: APP_ENV,
    stackName: APP_NAME + '-MESH',
});

const ecs_stack = new ECSStack(mesh_stack, APP_NAME + '-ecs-stack', {
    description: 'Defines the Fargate Services and Their Task Definitions.',
    env: APP_ENV,
    stackName: APP_NAME + '-ECS',
});

discovery_stack.addDependency(network_stack);
redis_stack.addDependency(network_stack);
mesh_stack.addDependency(discovery_stack);
ecs_stack.addDependency(mesh_stack);

APP.synth();
