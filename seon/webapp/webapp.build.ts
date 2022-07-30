/* eslint-disable sort-keys-fix/sort-keys-fix */

import * as cdk from 'aws-cdk-lib';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import { Cache, LinuxBuildImage, LocalCacheMode } from 'aws-cdk-lib/aws-codebuild';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';

export const buildWebApp = ({
    build_command,
    environment_variables,
    stack,
    web_app_name,
}: {
    build_command: string;
    environment_variables: { [key: string]: string };
    stack: cdk.Stack;
    web_app_name: string;
}) => {
    const build_project = new codebuild.Project(stack, web_app_name + '-BUILD_PROJECT', {
        buildSpec: codebuild.BuildSpec.fromObject({
            version: '0.2',
            env: {
                variables: environment_variables,
            },
            phases: {
                install: {
                    'runtime-versions': {
                        nodejs: '16.3.2',
                    },
                },
                pre_build: {
                    commands: ['echo Installing source NPM dependencies...', 'npm install'],
                },
                build: {
                    commands: ['echo Build started on `date`', `${build_command}`],
                },
                post_build: {
                    commands: ['npm rebuild node-sass'],
                },
                // post_build: {
                //     commands: [
                //         'echo Copy the contents of /build to S3',
                //         `aws s3 cp --recursive --acl public-read --region ${s3_bucket_region} ./build s3://${s3_bucket}/`,
                //         'echo S3 deployment completed on `date`',
                //     ],
                // },
            },
            artifacts: {
                'base-directory': 'build',
                files: ['**/*'],
            },
        }),
        cache: Cache.local(LocalCacheMode.DOCKER_LAYER, LocalCacheMode.CUSTOM),
        environment: {
            buildImage: LinuxBuildImage.STANDARD_5_0,
            privileged: true,
        },
        projectName: web_app_name + '-BUILD_PROJECT',
    });

    build_project.addToRolePolicy(
        new PolicyStatement({
            actions: ['s3:PutObject', 's3:PutObjectAcl'],
            effect: Effect.ALLOW,
            resources: ['*'],
        }),
    );

    return build_project;
};

export default buildWebApp;
