import * as cdk from 'aws-cdk-lib';
import {aws_cloudfront, aws_iam, aws_s3, aws_s3_deployment, RemovalPolicy} from 'aws-cdk-lib';
import {Construct} from 'constructs';

export class SiteBucketS3Stack extends cdk.Stack {
    bucketAssets: cdk.aws_s3.IBucket;
    cloudfrontOriginAccessIdentity: aws_cloudfront.OriginAccessIdentity;

    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // Créer un bucket public et entrer l'ARN en dessous (policy publique)
        const siteBucket = aws_s3.Bucket.fromBucketArn(this, "BdymentPortfolioFrontBucket", 'arn:aws:s3:::bdyment-portfolio-front-bucket')
        new aws_s3_deployment.BucketDeployment(this, "BdymentPortfolioFrontDeployment", {
            sources: [aws_s3_deployment.Source.asset("./front/build")],
            destinationBucket: siteBucket,
        });

        const cloudfrontOriginAccessIdentity =
            new aws_cloudfront.OriginAccessIdentity(
                this,
                "BdymentPortfolioCloudfrontOriginAccessIdentity"
            );

        siteBucket.addToResourcePolicy(
            new aws_iam.PolicyStatement({
                actions: ["s3:GetObject"],
                resources: [siteBucket.arnForObjects("*")],
                principals: [
                    new aws_iam.CanonicalUserPrincipal(
                        cloudfrontOriginAccessIdentity.cloudFrontOriginAccessIdentityS3CanonicalUserId
                    ),
                ],
            })
        );


        this.bucketAssets = siteBucket;
        this.cloudfrontOriginAccessIdentity = cloudfrontOriginAccessIdentity;
    }
}