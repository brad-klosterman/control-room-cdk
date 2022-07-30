import * as ssm from '@aws-cdk/aws-ssm';
import * as cdk from '@aws-cdk/core';

export interface ConstructProps {
    appConfig: any;
    projectPrefix: string;
    stackConfig: any;
    stackName: string;
}

export class BaseConstruct extends cdk.Construct {
    protected stackName: string;

    protected stackConfig: any;

    protected appConfig: any;

    constructor(scope: cdk.Construct, id: string, props: ConstructProps) {
        super(scope, id);

        this.stackName = props.stackName;

        this.stackConfig = props.stackConfig;
        this.appConfig = props.appConfig;
    }

    protected exportOutput(key: string, value: string) {
        new cdk.CfnOutput(this, `Output-${key}`, {
            exportName: `${this.stackName}-${key}`,
            value: value,
        });
    }

    protected putParameter(paramKey: string, paramValue: string): string {
        const paramKeyWithPrefix = `${this.stackName}-${paramKey}`;

        new ssm.StringParameter(this, paramKey, {
            parameterName: paramKeyWithPrefix,
            stringValue: paramValue,
        });

        return paramKey;
    }

    protected getParameter(stackName: string, paramKey: string): string {
        const paramKeyWithPrefix = `${stackName}-${paramKey}`;

        return ssm.StringParameter.valueForStringParameter(this, paramKeyWithPrefix);
    }
}
