import * as cdk from "@aws-cdk/core";
import * as ssm from "@aws-cdk/aws-ssm";

const putParameter = ({
  stack,
  paramKey,
  paramValue,
}: {
  stack: cdk.Stack;
  paramKey: string;
  paramValue: string;
}): string => {
  new ssm.StringParameter(stack, paramKey, {
    parameterName: paramKey,
    stringValue: paramValue,
  });

  return paramKey;
};

export default putParameter;
