import * as cdk from 'aws-cdk-lib';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as ecs from 'aws-cdk-lib/aws-ecs';

import configureBuild from './ecs.build';
import { PipelineActions, SourcedContainer } from './ecs.interfaces';

const configurePipeline = ({
    cluster,
    service,
    service_name,
    sourced_containers,
    stack,
}: {
    cluster: ecs.Cluster;
    service: ecs.IBaseService;
    service_name: string;
    sourced_containers: SourcedContainer[];
    stack: cdk.Stack;
}) => {
    // Construct the build action source/build
    const { build, deploy, source } = sourced_containers.reduce(
        (accumulator: PipelineActions, container: SourcedContainer) => {
            const sourceOutput = new codepipeline.Artifact();

            const sourceAction = new actions.GitHubSourceAction({
                actionName: `${container.name}_SOURCE`,
                branch: container.branch,
                oauthToken: cdk.SecretValue.secretsManager('seon-github-token'),
                output: sourceOutput,
                owner: 'SEON-GmbH',
                repo: container.repo,
            });

            const buildOutput = new codepipeline.Artifact();

            const buildAction = new actions.CodeBuildAction({
                actionName: `${container.name}_BUILD`,
                input: sourceOutput,
                outputs: [buildOutput],
                project: configureBuild({
                    cluster,
                    container,
                    stack,
                }),
            });

            const deployAction = new actions.EcsDeployAction({
                actionName: `${container.name}_DEPLOY`,
                deploymentTimeout: cdk.Duration.minutes(20),
                imageFile: new codepipeline.ArtifactPath(buildOutput, `imagedefinitions.json`),
                service,
            });

            return {
                build: [...accumulator.build, buildAction],
                deploy: [...accumulator.deploy, deployAction],
                source: [...accumulator.source, sourceAction],
            };
        },
        {
            build: [],
            deploy: [],
            source: [],
        },
    );

    const approvalAction = new actions.ManualApprovalAction({
        actionName: 'Manual_Approve',
    });

    new codepipeline.Pipeline(stack, `${service_name}-PIPELINE`, {
        crossAccountKeys: true,
        pipelineName: `${service.serviceName}`,
        stages: [
            {
                actions: source,
                stageName: 'Source',
            },
            {
                actions: build,
                stageName: 'Build',
            },
            {
                actions: [approvalAction],
                stageName: 'Approve',
            },
            {
                actions: deploy,
                stageName: 'Deploy',
            },
        ],
    });
};

export default configurePipeline;
