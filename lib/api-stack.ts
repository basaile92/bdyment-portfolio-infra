import {Construct} from 'constructs';
import {aws_apigateway, aws_lambda, Stack, StackProps} from 'aws-cdk-lib';
import * as path from "node:path";

export class ApiStack extends Stack {
    api: aws_apigateway.LambdaRestApi;
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const graphqlLambda = new aws_lambda.Function(this, "BdymentPortfolioLambda", {
            code: aws_lambda.Code.fromAsset(path.join(__dirname, "../lambda")),
            handler: "lambda.handler",
            runtime: aws_lambda.Runtime.NODEJS_20_X,
        });

        this.api = new aws_apigateway.LambdaRestApi(this, "BdymentPortfolioApi", {
            handler: graphqlLambda,
        });
    }

}
