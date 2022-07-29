import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import { putParameter } from '../constructs/ssm.parameters';
import { Cache, LinuxBuildImage, LocalCacheMode } from 'aws-cdk-lib/aws-codebuild';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';

export const buildWebApp = ({
    stack,
    web_app_name,
    build_command,
    s3_bucket_region,
    s3_bucket,
}: {
    stack: cdk.Stack;
    web_app_name: string;
    build_command: string;
    s3_bucket_region: string;
    s3_bucket: string;
}) => {
    const build_project = new codebuild.Project(stack, web_app_name + '-BUILD_PROJECT', {
        projectName: web_app_name + '-BUILD_PROJECT',
        environment: {
            buildImage: LinuxBuildImage.STANDARD_5_0,
            privileged: true,
        },
        environmentVariables: {
        },
        buildSpec: codebuild.BuildSpec.fromObject({
            version: '0.2',
            phases: {
                install: {
                    'runtime-versions': {
                        nodejs: '14',
                    },
                },
                pre_build: {
                    commands: ['echo Installing source NPM dependencies...', 'npm install'],
                },
                build: {
                    commands: ['echo Build started on `date`', `${build_command}`],
                },
                post_build: {
                    commands: [
                        'echo Copy the contents of /build to S3',
                        `aws s3 cp --recursive --acl public-read --region ${s3_bucket_region} ./build s3://${s3_bucket}/`,
                        'echo S3 deployment completed on `date`',
                    ],
                },
            },
            artifacts: {
                files: ['**/*'],
                'base-directory': 'build',
            },
        }),
        cache: Cache.local(LocalCacheMode.DOCKER_LAYER, LocalCacheMode.CUSTOM),
    });

    build_project.addToRolePolicy(
        new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ['s3:PutObject', 's3:PutObjectAcl'],
            resources: ['*'],
        })
    );

    return build_project;
};

export default buildWebApp;
