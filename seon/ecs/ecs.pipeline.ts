import * as cdk from 'aws-cdk-lib';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as actions from 'aws-cdk-lib/aws-codepipeline-actions';

import { PipelineActions, SourcedContainer } from './ecs.interfaces';
import configureBuild from './ecs.build';

const configurePipeline = ({
    stack,
    cluster,
    service,
    service_name,
    sourced_containers,
}: {
    stack: cdk.Stack;
    cluster: ecs.Cluster;
    service: ecs.IBaseService;
    service_name: string;
    sourced_containers: SourcedContainer[];
}) => {
    // Construct the build action source/build
    const { source, build, deploy } = sourced_containers.reduce(
        (accumulator: PipelineActions, container: SourcedContainer) => {
            const sourceOutput = new codepipeline.Artifact();
            const sourceAction = new actions.GitHubSourceAction({
                owner: 'SEON-GmbH',
                repo: container.repo,
                branch: container.branch,
                actionName: `${container.name}_SOURCE`,
                oauthToken: cdk.SecretValue.secretsManager('seon-github-token'),
                output: sourceOutput,
            });

            const buildOutput = new codepipeline.Artifact();

            const buildAction = new actions.CodeBuildAction({
                actionName: `${container.name}_BUILD`,
                project: configureBuild({
                    stack,
                    cluster,
                    container,
                }),
                input: sourceOutput,
                outputs: [buildOutput],
            });

            const deployAction = new actions.EcsDeployAction({
                actionName: `${container.name}_DEPLOY`,
                service,
                imageFile: new codepipeline.ArtifactPath(buildOutput, `imagedefinitions.json`),
                deploymentTimeout: cdk.Duration.minutes(20),
            });

            return {
                source: [...accumulator.source, sourceAction],
                build: [...accumulator.build, buildAction],
                deploy: [...accumulator.deploy, deployAction],
            };
        },
        {
            source: [],
            build: [],
            deploy: [],
        }
    );

    const approvalAction = new actions.ManualApprovalAction({
        actionName: 'Manual_Approve',
    });

    new codepipeline.Pipeline(stack, `${service_name}-PIPELINE`, {
        pipelineName: `${service.serviceName}-PIPELINE`,
        crossAccountKeys: true,
        stages: [
            {
                stageName: 'Source',
                actions: source,
            },
            {
                stageName: 'Build',
                actions: build,
            },
            {
                stageName: 'Approve',
                actions: [approvalAction],
            },
            {
                stageName: 'Deploy',
                actions: deploy,
            },
        ],
    });
};

export default configurePipeline;
