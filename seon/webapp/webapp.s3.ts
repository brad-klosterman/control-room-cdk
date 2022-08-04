import * as cdk from 'aws-cdk-lib';
import { CfnOutput, Duration, RemovalPolicy } from 'aws-cdk-lib';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as cloudfront_origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as s3 from 'aws-cdk-lib/aws-s3';

export const createWebAppS3 = ({
    app_props,
    domain_name,
    stack,
    sub_domain,
    web_app_name,
}: {
    app_props: cdk.StackProps;
    domain_name: string;
    stack: cdk.Stack;
    sub_domain: string;
    web_app_name: string;
}) => {
    const zone = route53.HostedZone.fromLookup(stack, web_app_name + '-ZONE', {
        domainName: domain_name,
    });

    const webapp_domain = sub_domain + '.' + domain_name;

    const cloudfront_OAI = new cloudfront.OriginAccessIdentity(
        stack,
        web_app_name + 'CLOUDFRONT-OAI',
        {
            comment: `CLOUDFRONT-OAI for ${web_app_name}`,
        },
    );

    new CfnOutput(stack, web_app_name + '-URL', { value: 'https://' + webapp_domain });

    // Content bucket
    const webapp_bucket = new s3.Bucket(stack, web_app_name.toLowerCase() + '-bucket', {
        // NOT recommended for production code
        /**
         * For sample purposes only, if you create an S3 bucket then populate it, stack destruction fails.  This
         * setting will enable full cleanup of the demo.
         */
        autoDeleteObjects: true,

        blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,

        bucketName: web_app_name.toLowerCase() + '-bucket',

        publicReadAccess: false,

        /**
         * The default removal policy is RETAIN, which means that cdk destroy will not attempt to delete
         * the new bucket, and it will remain in your account until manually deleted. By setting the policy to
         * DESTROY, cdk destroy will attempt to delete the bucket, but will error if the bucket is not empty.
         */
        removalPolicy: RemovalPolicy.DESTROY, // NOT recommended for production code
    });

    // Grant access to cloudfront
    webapp_bucket.addToResourcePolicy(
        new iam.PolicyStatement({
            actions: ['s3:GetObject'],
            principals: [
                new iam.CanonicalUserPrincipal(
                    cloudfront_OAI.cloudFrontOriginAccessIdentityS3CanonicalUserId,
                ),
            ],
            resources: [webapp_bucket.arnForObjects('*')],
        }),
    );

    new CfnOutput(stack, web_app_name + '-BUCKET', { value: webapp_bucket.bucketName });

    // TLS certificate
    const certificate = new acm.DnsValidatedCertificate(stack, web_app_name + '-CERT', {
        domainName: webapp_domain,
        hostedZone: zone,
        region: 'us-east-1',
    });

    new CfnOutput(stack, web_app_name + '-CERT-OUT', { value: certificate.certificateArn });

    // CloudFront distribution
    const webapp_distribution = new cloudfront.Distribution(stack, web_app_name + '-DISTRIBUTION', {
        certificate: certificate,
        defaultBehavior: {
            allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
            compress: true,
            origin: new cloudfront_origins.S3Origin(webapp_bucket, {
                originAccessIdentity: cloudfront_OAI,
            }),
            viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        },
        defaultRootObject: 'index.html',
        domainNames: [webapp_domain],
        errorResponses: [
            {
                httpStatus: 403,
                responseHttpStatus: 403,
                responsePagePath: '/index.html',
                ttl: Duration.minutes(30),
            },
        ],
        minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
    });

    new CfnOutput(stack, web_app_name + '-DISTRIBUTION_ID', {
        value: webapp_distribution.distributionId,
    });

    // Route53 alias record for the CloudFront distribution
    new route53.ARecord(stack, web_app_name + '-ALIAS_RECORD', {
        recordName: webapp_domain,
        target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(webapp_distribution)),
        zone,
    });

    return {
        webapp_bucket,
        webapp_distribution,
    };
};

export default createWebAppS3;
