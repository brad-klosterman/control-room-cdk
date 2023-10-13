import * as cdk from 'aws-cdk-lib';
import * as ssm from 'aws-cdk-lib/aws-ssm';

export const putParameter = ({
    param_key,
    param_value,
    stack,
}: {
    param_key: string;
    param_value: string;
    stack: cdk.Stack;
}): string => {
    new ssm.StringParameter(stack, param_key, {
        parameterName: param_key,
        stringValue: param_value,
    });

    return param_key;
};
