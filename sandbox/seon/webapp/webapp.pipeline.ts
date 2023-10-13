import * as cdk from 'aws-cdk-lib';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as actions from 'aws-cdk-lib/aws-codepipeline-actions';
import { Bucket } from 'aws-cdk-lib/aws-s3';

import buildWebApp from './webapp.build';

const createWebAppPipeline = ({
    app_props,
    branch,
    bucket,
    environment_variables,
    repo,
    stack,
    web_app_name,
}: {
    app_props: cdk.StackProps;
    branch: string;
    bucket: Bucket;
    environment_variables: { [key: string]: string };
    repo: string;
    stack: cdk.Stack;
    web_app_name: string;
}) => {
    const pipeline = new codepipeline.Pipeline(stack, `${web_app_name}-PIPELINE`, {
        crossAccountKeys: true,
        pipelineName: `${web_app_name}-PIPELINE`,
    });

    // SOURCE
    const source_output = new codepipeline.Artifact();

    const source_action = new actions.GitHubSourceAction({
        actionName: `${web_app_name}_SOURCE`,
        branch,
        oauthToken: cdk.SecretValue.secretsManager('seon-github-token'),
        output: source_output,
        owner: 'SEON-GmbH',
        repo,
    });

    pipeline.addStage({
        actions: [source_action],
        stageName: 'Source',
    });

    // BUILD
    const build_output = new codepipeline.Artifact();

    const build_action = new actions.CodeBuildAction({
        actionName: `${web_app_name}_BUILD`,
        input: source_output,
        outputs: [build_output],
        project: buildWebApp({
            build_command: 'npm run build',
            environment_variables,
            stack,
            web_app_name,
        }),
    });

    pipeline.addStage({
        actions: [build_action],
        stageName: 'Build',
    });

    // APPROVE
    const approval_action = new actions.ManualApprovalAction({
        actionName: 'Manual_Approve',
    });

    pipeline.addStage({
        actions: [approval_action],
        stageName: 'Approve',
    });

    // DEPLOY
    const deploy_action = new actions.S3DeployAction({
        actionName: `${web_app_name}_DEPLOY`,
        bucket,
        input: build_output,
    });

    pipeline.addStage({
        actions: [deploy_action],
        stageName: 'Deploy',
    });
};

export default createWebAppPipeline;
