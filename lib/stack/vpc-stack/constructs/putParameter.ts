import * as ssm from '@aws-cdk/aws-ssm';
import * as cdk from '@aws-cdk/core';

const putParameter = ({
    paramKey,
    paramValue,
    stack,
}: {
    paramKey: string;
    paramValue: string;
    stack: cdk.Stack;
}): string => {
    new ssm.StringParameter(stack, paramKey, {
        parameterName: paramKey,
        stringValue: paramValue,
    });

    return paramKey;
};

export default putParameter;
