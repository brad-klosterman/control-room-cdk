import * as cdk from 'aws-cdk-lib';

import createWebAppPipeline from './webapp.pipeline';
import createWebAppS3 from './webapp.s3';

export const createWebAppStack = ({
    app_props,
    branch,
    domain_name,
    environment_variables,
    repo,
    scope,
    sub_domain,
    web_app_name,
}: {
    app_props: cdk.StackProps;
    branch: string;
    domain_name: string;
    environment_variables: { [key: string]: string };
    repo: string;
    scope: cdk.App;
    sub_domain: string;
    web_app_name: string;
}) => {
    const stack = new cdk.Stack(scope, web_app_name, app_props);

    const { webapp_bucket, webapp_distribution } = createWebAppS3({
        app_props,
        domain_name,
        stack,
        sub_domain,
        web_app_name,
    });

    createWebAppPipeline({
        app_props,
        branch,
        bucket: webapp_bucket,
        environment_variables,
        repo,
        stack,
        web_app_name,
    });
};
