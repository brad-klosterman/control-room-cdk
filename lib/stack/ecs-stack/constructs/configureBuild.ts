import * as codebuild from '@aws-cdk/aws-codebuild';
import * as ecs from '@aws-cdk/aws-ecs';
import * as iam from '@aws-cdk/aws-iam';
import * as cdk from '@aws-cdk/core';

import { ISourcedContainer } from '../interfaces';

/** Constructs the build project for the CI/CD pipeline.
 * @param stack               The CDK stack
 * @param cluster             The ECS cluster
 * @param container           The container to build
 */

const configureBuild = ({
    cluster,
    container,
    stack,
}: {
    cluster: ecs.Cluster;
    container: ISourcedContainer;
    stack: cdk.Stack;
}) => {
    const project = new codebuild.Project(stack, 'DockerBuild', {
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
            buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2_2,
            computeType: codebuild.ComputeType.LARGE,
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
                value: `${container.id}Container`,
            },
            ECR_REPO_URI: {
                value: `${container.ecrRepo.repositoryUri}`,
            },
        },
        projectName: `${container.id}DockerBuild`,
    });

    container.ecrRepo.grantPullPush(project.role!);

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
