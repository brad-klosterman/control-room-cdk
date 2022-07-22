import * as cdk from '@aws-cdk/core';
import * as ecs from '@aws-cdk/aws-ecs';
import * as iam from '@aws-cdk/aws-iam';
import * as codebuild from '@aws-cdk/aws-codebuild';
import { SourcedContainer } from './ecs.interfaces';

const configureBuild = ({
    stack,
    cluster,
    container,
}: {
    stack: cdk.Stack;
    cluster: ecs.Cluster;
    container: SourcedContainer;
}) => {
    const project = new codebuild.Project(stack, container.name + '_DOCKER-BUILD', {
        projectName: container.name + '_DOCKER-BUILD',
        environment: {
            buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2_2,
            computeType: codebuild.ComputeType.LARGE,
            privileged: true,
        },
        environmentVariables: {
            CLUSTER_NAME: {
                value: `${cluster.clusterName}`,
            },
            ECR_REPO_URI: {
                value: `${container.ecr.repositoryUri}`,
            },
            CONTAINER_NAME: {
                value: container.name,
            },
            APP_PATH: {
                value: '.',
            },
            BACK_PATH: {
                value: '.',
            },
        },
        buildSpec: codebuild.BuildSpec.fromObject({
            version: '0.2',
            phases: {
                pre_build: {
                    commands: ['echo "In Pre-Build Phase"', 'export TAG=latest', 'echo $TAG'],
                },
                install: {
                    commands: ['echo Seon20212021! | docker login -u seongroup --password-stdin'],
                },
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
                post_build: {
                    commands: [
                        'echo "In Post-Build Phase"',
                        'pwd',
                        'cd $BACK_PATH',
                        'printf \'[{"name":"%s","imageUri":"%s"}]\' $CONTAINER_NAME $ECR_REPO_URI:$TAG > imagedefinitions.json',
                        'pwd; ls -al; cat imagedefinitions.json',
                    ],
                },
            },
            artifacts: {
                files: ['imagedefinitions.json'],
            },
        }),
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
        })
    );

    return project;
};

export default configureBuild;
