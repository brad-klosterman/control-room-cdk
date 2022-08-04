import * as cdk from 'aws-cdk-lib';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as iam from 'aws-cdk-lib/aws-iam';

import { SourcedContainer } from './ecs.interfaces';

const configureBuild = ({
    cluster,
    container,
    stack,
}: {
    cluster: ecs.Cluster;
    container: SourcedContainer;
    stack: cdk.Stack;
}) => {
    const project = new codebuild.Project(stack, container.name + '-DOCKER-BUILD', {
        buildSpec: codebuild.BuildSpec.fromObject({
            artifacts: {
                files: ['imagedefinitions.json'],
            },
            phases: {
                build: {
                    commands: [
                        'echo "In Build Phase"',
                        'cd $APP_PATH',
                        'ls -l',
                        `docker build -t $ECR_REPO_URI:$TAG .`,
                        '$(aws ecr get-login --no-include-email)',
                        'docker push $ECR_REPO_URI:$TAG',
                    ],
                },
                install: {
                    commands: ['echo Seon20212021! | docker login -u seongroup --password-stdin'],
                },
                post_build: {
                    commands: [
                        'echo "In Post-Build Phase"',
                        'pwd',
                        'cd $BACK_PATH',
                        'printf \'[{"name":"%s","imageUri":"%s"}]\' $CONTAINER_NAME $ECR_REPO_URI:$TAG > imagedefinitions.json',
                        'pwd; ls -al; cat imagedefinitions.json',
                    ],
                },
                pre_build: {
                    commands: ['echo "In Pre-Build Phase"', 'export TAG=latest', 'echo $TAG'],
                },
            },
            version: '0.2',
        }),
        environment: {
            buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2_3,
            computeType: codebuild.ComputeType.SMALL,
            privileged: true,
        },
        environmentVariables: {
            APP_PATH: {
                value: '.',
            },
            BACK_PATH: {
                value: '.',
            },
            CLUSTER_NAME: {
                value: `${cluster.clusterName}`,
            },
            CONTAINER_NAME: {
                value: container.name,
            },
            ECR_REPO_URI: {
                value: `${container.ecr.repositoryUri}`,
            },
        },
        projectName: container.name + '-DOCKER-BUILD',
    });

    container.ecr.grantPullPush(project.role!);

    project.addToRolePolicy(
        new iam.PolicyStatement({
            actions: [
                'ecs:DescribeCluster',
                'ecr:GetAuthorizationToken',
                'ecr:BatchCheckLayerAvailability',
                'ecr:BatchGetImage',
                'ecr:GetDownloadUrlForLayer',
            ],
            resources: [cluster.clusterArn],
        }),
    );

    return project;
};

export default configureBuild;
