import * as cloudwatch from '@aws-cdk/aws-cloudwatch';
import { IWidget } from '@aws-cdk/aws-cloudwatch';
import * as cdk from '@aws-cdk/core';

export interface CloudWatchDashboardProps {
    readonly dashboardName: string;
    readonly period: cdk.Duration;
    readonly projectFullName: string;
}

export class CloudWatchDashboard extends cdk.Construct {
    private dashboard: cloudwatch.Dashboard;

    private props: CloudWatchDashboardProps;

    constructor(scope: cdk.Construct, id: string, props: CloudWatchDashboardProps) {
        super(scope, id);
        this.props = props;

        this.dashboard = new cloudwatch.Dashboard(this, props.dashboardName, {
            dashboardName: `${props.projectFullName}-${props.dashboardName}`,
        });
    }

    public addWidgets(...widgets: IWidget[]): void {
        this.dashboard.addWidgets(...widgets);
    }

    public createWidget(
        name: string,
        metrics: cloudwatch.IMetric[],
        width?: number,
        label?: string,
    ): cloudwatch.GraphWidget {
        const widget = new cloudwatch.GraphWidget({
            left: metrics,
            leftYAxis: {
                label: label,
            },
            title: name,
            width: width,
        });

        return widget;
    }

    public createWidget2(
        name: string,
        metrics: cloudwatch.IMetric[],
        width?: number,
    ): cloudwatch.GraphWidget {
        const widget = new cloudwatch.GraphWidget({
            left: metrics,
            leftYAxis: {
                max: 1,
                min: 0,
                showUnits: false,
            },
            stacked: false,
            title: name,
            view: cloudwatch.GraphWidgetView.TIME_SERIES,
            width: width,
        });

        return widget;
    }

    public createLeftRightWidget(
        name: string,
        leftMetrics: cloudwatch.IMetric[],
        rightMetrics: cloudwatch.IMetric[],
        width?: number,
    ): cloudwatch.GraphWidget {
        const widget = new cloudwatch.GraphWidget({
            left: leftMetrics,
            right: rightMetrics,
            title: name,
            width: width,
        });

        return widget;
    }

    public createDynamoDBMetric(
        tableName: string,
        metricName: string,
        options: cloudwatch.MetricOptions = {},
        operation?: string,
    ): cloudwatch.Metric {
        const dimensions: any = { TableName: tableName };

        if (operation != undefined) {
            dimensions.operation = operation;
        }

        return new cloudwatch.Metric({
            dimensions: dimensions,
            label: options.label != undefined ? options.label : metricName,
            metricName,
            namespace: 'AWS/DynamoDB',
            period: this.props.period,
            statistic: options.statistic,
            unit: options.unit,
            ...options,
        });
    }

    public createLambdaMetric(
        lambdaFunctionName: string,
        metricName: string,
        options: cloudwatch.MetricOptions = {},
    ): cloudwatch.Metric {
        /*
        Options:
         - Sum : cloudwatch.Unit.COUNT
         - Average/Minimum/Maximum : Milliseconds
        */

        return new cloudwatch.Metric({
            dimensions: {
                FunctionName: lambdaFunctionName.includes(':')
                    ? lambdaFunctionName.split(':')[0]
                    : lambdaFunctionName, //lambdaNameAlias.split(':')[0],
                Resource: lambdaFunctionName, //lambdaNameAlias
            },
            label: options.label != undefined ? options.label : metricName,
            metricName,

            namespace: 'AWS/Lambda',

            //cloudwatch.Unit.COUNT
            period: this.props.period,

            statistic: options.statistic,
            // Sum
            unit: options.unit,
            ...options,
        });
    }

    public createIotMetric(
        ruleName: string,
        metricName: string,
        actionType: string,
        options: cloudwatch.MetricOptions = {},
    ): cloudwatch.Metric {
        /*
        Options:
         - Sum : cloudwatch.Unit.COUNT
         - Average/Minimum/Maximum : Milliseconds
        */

        return new cloudwatch.Metric({
            dimensions: {
                ActionType: actionType,
                RuleName: ruleName,
            },
            label: options.label != undefined ? options.label : metricName,
            metricName,

            namespace: 'AWS/IoT',

            //cloudwatch.Unit.COUNT
            period: this.props.period,

            statistic: options.statistic,
            // Sum
            unit: options.unit,
            ...options,
        });
    }

    public createKinesisMetric(
        streamName: string,
        metricName: string,
        options: cloudwatch.MetricOptions = {},
    ): cloudwatch.Metric {
        return new cloudwatch.Metric({
            dimensions: {
                StreamName: streamName,
            },
            label: options.label != undefined ? options.label : metricName,
            metricName,
            namespace: 'AWS/Kinesis',
            period: this.props.period,
            unit: cloudwatch.Unit.COUNT,
            ...options,
        });
    }

    public createEndpointInstanceMetrics(
        endpointName: string,
        variantName: string,
        metricNames: string[],
        options: cloudwatch.MetricOptions = {},
    ): cloudwatch.Metric[] {
        const metric: cloudwatch.Metric[] = metricNames.map(metricName => {
            return new cloudwatch.Metric({
                dimensions: {
                    EndpointName: endpointName,
                    VariantName: variantName,
                },
                label: options.label != undefined ? options.label : metricName,
                metricName,
                namespace: '/aws/sagemaker/Endpoints',
                period: this.props.period,
                statistic: 'Average',
                unit: cloudwatch.Unit.PERCENT,
                ...options,
            });
        });

        return metric;
    }

    public createEndpointInvocationMetrics(
        endpointName: string,
        variantName: string,
        metricNames: string[],
        options: cloudwatch.MetricOptions = {},
    ): cloudwatch.Metric[] {
        const metric: cloudwatch.Metric[] = metricNames.map(metricName => {
            return new cloudwatch.Metric({
                dimensions: {
                    EndpointName: endpointName,
                    VariantName: variantName,
                },
                label: options.label != undefined ? options.label : metricName,
                metricName,

                namespace: 'AWS/SageMaker',

                //cloudwatch.Unit.COUNT Milliseconds
                period: this.props.period,

                statistic: options.statistic,
                // Sum, Average
                unit: options.unit,
                ...options,
            });
        });

        return metric;
    }

    public createEsDomainMetric(
        domainName: string,
        metricName: string,
        clientId: string,
        options: cloudwatch.MetricOptions = {},
    ): cloudwatch.Metric {
        return new cloudwatch.Metric({
            color: options.color,
            dimensions: {
                ClientId: clientId,
                DomainName: domainName,
            },
            label: options.label != undefined ? options.label : metricName,
            metricName,
            namespace: 'AWS/ES',
            period: this.props.period,
            statistic: options.statistic,
            unit: options.unit,
            ...options,
        });
    }

    public createEsDomainMetric2(
        domainName: string,
        metricName: string,
        clientId: string,
        options: cloudwatch.MetricOptions = {},
    ): cloudwatch.Metric {
        return new cloudwatch.Metric({
            color: options.color,
            dimensions: {
                '.': '.',
                DomainName: domainName,
            },
            label: options.label != undefined ? options.label : metricName,
            metricName,
            namespace: '.',
            period: this.props.period,
            statistic: options.statistic,
            unit: options.unit,
            ...options,
        });
    }

    public createApiGatewayMetric(
        apiName: string,
        metricName: string,
        options: cloudwatch.MetricOptions = {},
    ): cloudwatch.Metric {
        return new cloudwatch.Metric({
            dimensions: {
                ApiName: apiName,
            },
            label: options.label != undefined ? options.label : metricName,
            metricName,
            namespace: 'AWS/ApiGateway',
            period: this.props.period,
            statistic: options.statistic,
            unit: options.unit,
            ...options,
        });
    }

    public createSnsMetric(
        topicName: string,
        metricName: string,
        options: cloudwatch.MetricOptions = {},
    ): cloudwatch.Metric {
        return new cloudwatch.Metric({
            dimensions: {
                TopicName: topicName,
            },
            label: options.label != undefined ? options.label : metricName,
            metricName,
            namespace: 'AWS/SNS',
            period: this.props.period,
            statistic: options.statistic,
            unit: options.unit,
            ...options,
        });
    }

    public createCustomMetric(
        namespace: string,
        metricName: string,
        dimensions: any,
        options: cloudwatch.MetricOptions = {},
    ): cloudwatch.Metric {
        return new cloudwatch.Metric({
            dimensions: dimensions,
            label: options.label != undefined ? options.label : metricName,
            metricName,
            namespace: namespace,
            period: this.props.period,
            statistic: options.statistic,
            unit: options.unit,
            ...options,
        });
    }
}
