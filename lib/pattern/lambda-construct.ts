import * as iam from '@aws-cdk/aws-iam';
import lambda = require('@aws-cdk/aws-lambda');
import { S3EventSource } from '@aws-cdk/aws-lambda-event-sources';
import * as s3 from '@aws-cdk/aws-s3';
import cdk = require('@aws-cdk/core');

export interface LambdaPatternConstructProps {
    baseName: string;
    bucket?: s3.Bucket;
    bucketPrefix?: string[];
    bucketSuffix?: string[];
    environments?: any;
    handler?: string;
    lambdaPath: string;
    layerArns?: string[];
    policies: string[] | iam.PolicyStatement[];
    projectFullName: string;
    timeout?: cdk.Duration;
}

export class LambdaPatternConstruct extends cdk.Construct {
    public readonly lambdaFunction: lambda.Function;

    public readonly lambdaRole: iam.Role;

    constructor(scope: cdk.Construct, id: string, props: LambdaPatternConstructProps) {
        super(scope, id);

        const lambdaName = `${props.projectFullName}-${props.baseName}-Lambda`;
        const roleName = `${props.projectFullName}-${props.baseName}-Lambda-Role`;

        this.lambdaRole = this.createRole(roleName, props.policies);

        this.lambdaFunction = this.createLambda(
            lambdaName,
            props.lambdaPath,
            this.lambdaRole,
            props,
        );
    }

    private createLambda(
        lambdaName: string,
        lambdaPath: string,
        lambdaRole: iam.Role,
        props: LambdaPatternConstructProps,
    ): lambda.Function {
        const layers = this.loadLayers(lambdaName, props.layerArns!);

        const lambdaFunction = new lambda.Function(this, lambdaName, {
            code: lambda.Code.fromAsset(lambdaPath),
            environment: props.environments,
            functionName: lambdaName,
            handler: props.handler != undefined ? props.handler : 'handler.handle',
            layers: layers.length > 0 ? layers : undefined,
            role: lambdaRole,
            runtime: lambda.Runtime.PYTHON_3_7,
            timeout: props.timeout != undefined ? props.timeout : cdk.Duration.seconds(60 * 3),
        });

        if (props.bucket != undefined) {
            const filterList: any[] = [];

            // const filters: any = {};
            if (props.bucketPrefix != undefined && props.bucketPrefix.length > 0) {
                for (var item of props.bucketPrefix) {
                    lambdaFunction.addEventSource(
                        new S3EventSource(props.bucket, {
                            events: [
                                s3.EventType.OBJECT_CREATED_PUT,
                                s3.EventType.OBJECT_CREATED_COPY,
                            ],
                            filters: [{ prefix: item }],
                        }),
                    );
                    // filterList.push({prefix: item});
                    // filters['prefix'] = props.bucketPrefix;
                }
            }

            if (props.bucketSuffix != undefined && props.bucketSuffix.length > 0) {
                for (var item of props.bucketSuffix) {
                    lambdaFunction.addEventSource(
                        new S3EventSource(props.bucket, {
                            events: [
                                s3.EventType.OBJECT_CREATED_PUT,
                                s3.EventType.OBJECT_CREATED_COPY,
                            ],
                            filters: [{ suffix: item }],
                        }),
                    );
                    // filterList.push({suffix: item});
                    // filters['suffix'] = props.bucketSuffix;
                }
            }
            // lambdaFunction.addEventSource(new S3EventSource(props.bucket, {
            //   events: [s3.EventType.OBJECT_CREATED],
            //   filters: filterList
            // }));
        }

        return lambdaFunction;
    }

    private createRole(roleName: string, policies: string[] | iam.PolicyStatement[]): iam.Role {
        const role = new iam.Role(this, roleName, {
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
            roleName: roleName,
        });

        role.addManagedPolicy({
            managedPolicyArn: 'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
        });

        for (const item of policies) {
            if (item instanceof iam.PolicyStatement) {
                role.addToPolicy(item);
            } else {
                role.addManagedPolicy({ managedPolicyArn: item });
            }
        }

        return role;
    }

    private loadLayers(lambdaName: string, layerArns: string[]): any[] {
        const layers = [];

        if (layerArns != undefined && layerArns.length > 0) {
            let index = 0;

            for (const arn of layerArns) {
                index++;

                layers.push(
                    lambda.LayerVersion.fromLayerVersionArn(
                        this,
                        `${lambdaName}-${index}-layer`,
                        arn,
                    ),
                );
            }
        }

        return layers;
    }
}
