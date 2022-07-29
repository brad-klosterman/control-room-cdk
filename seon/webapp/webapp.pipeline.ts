import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import { putParameter } from '../constructs/ssm.parameters';
import { LinuxBuildImage } from 'aws-cdk-lib/aws-codebuild';
import buildWebApp from './webapp.build';
import { S3DeployAction } from 'aws-cdk-lib/aws-codepipeline-actions';
import { Bucket } from 'aws-cdk-lib/aws-s3';

interface PipelineConfig {
    repo: string;
    branch: string;
}

export const createWebAppPipeline = ({
    stack,
                                         app_props,
    cluster,
    web_app_name,
    config,
}: {
    stack: cdk.Stack;
    app_props: cdk.StackProps;
    cluster: ecs.Cluster;
    web_app_name: string;
    config: PipelineConfig;
}) => {
    const source_output = new codepipeline.Artifact();
    const source_action = new actions.GitHubSourceAction({
        owner: 'SEON-GmbH',
        repo: config.repo,
        branch: config.branch,
        actionName: `${web_app_name}_SOURCE`,
        oauthToken: cdk.SecretValue.secretsManager('seon-github-token'),
        output: source_output,
    });

    const build_output = new codepipeline.Artifact();
    const build_action = new actions.CodeBuildAction({
        actionName: `${web_app_name}_BUILD`,
        project: buildWebApp({
            stack,
            web_app_name,
            build_command: 'npm run build',
            s3_bucket_region: 'eu-central-1',
            s3_bucket: 'name',
        }),
        input: source_output,
        outputs: [build_output],
    });

    const approval_action = new actions.ManualApprovalAction({
        actionName: 'Manual_Approve',
    });

    const bucket = Bucket.fromBucketAttributes(stack, `${web_app_name}DeployS3Bucket`, {
        bucketName: '',
    });

    const deploy_action = new S3DeployAction({
        actionName: `${web_app_name}_DEPLOY`,
        input: build_output,
        bucket
    });

    new codepipeline.Pipeline(stack, `${web_app_name}-PIPELINE`, {
        pipelineName: `${web_app_name}-PIPELINE`,
        crossAccountKeys: false,
        stages: [
            {
                stageName: 'Source',
                actions: source_action,
            },
            {
                stageName: 'Build',
                actions: build_action,
            },
            {
                stageName: 'Approve',
                actions: [approval_action],
            },
            {
                stageName: 'Deploy',
                actions: deploy_action,
            },
        ],
    });
};

export default createWebAppPipeline;
