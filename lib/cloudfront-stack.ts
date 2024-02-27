import * as cdk from 'aws-cdk-lib';
import {
    aws_apigateway,
    aws_certificatemanager,
    aws_cloudfront,
    aws_route53,
    aws_route53_targets, aws_s3,
    Duration
} from 'aws-cdk-lib';
import {Construct} from 'constructs';

type CloudFrontStackProps = cdk.StackProps & {

    api: aws_apigateway.LambdaRestApi;
    bucketAssets: aws_s3.IBucket;
    cloudfrontOriginAccessIdentity: aws_cloudfront.OriginAccessIdentity;

};

export class CloudFrontStack extends cdk.Stack {
    constructor(scope: Construct, id: string, domainName: string, props: CloudFrontStackProps) {
        super(scope, id, props);

        // Il faut créer au préalable une zone hébergée avec comme nom de dns puis mettre son ID. Il faut créer un certificat dans us-east-1 avec un nom de dns puis www.(nom de dns) puis mettre son ARN (il faut que la stack passe une fois le certificat validé) Ne pas oublier de récupérer les serveurs de noms du domaine enregistré dans l'enregistrement NS et les assigner dans domaines enregistrés.
        // Ne pas oublier après avoir déployé d'ajouter dans cloudfront en autre nom de domaine: www.(nom de dns) puis de créer dans la zone hébergée un enregistrement  de type lié au cloudfront ayant pour nom www.(nom de dns)
        const hostedZoneId = "Z05222443ORCSCAK3802V";
        const certificateArn = "arn:aws:acm:us-east-1:339713110788:certificate/0e1c980b-a5a5-4887-ba94-75089c3e12f7";
        const zone = aws_route53.HostedZone.fromHostedZoneAttributes(this, "BdymentPortFolioHostedZone", {hostedZoneId: hostedZoneId, zoneName: domainName});
        const certificate = aws_certificatemanager.Certificate.fromCertificateArn(this, "BdymentPortFolioSiteCertificate", certificateArn);

        const responseHeaderPolicy = new aws_cloudfront.ResponseHeadersPolicy(
            this,
            "BdymentPortFolioProdResponseHeaderPolicy",
            {
                comment: "Security headers response header policy",
                securityHeadersBehavior: {
                    contentSecurityPolicy: {
                        override: true,
                        contentSecurityPolicy: `img-src 'self' data; connect-src 'self' https://${domainName} https://region1.google-analytics.com/g/collect; default-src 'self' 'inline script' 'unsafe-inline' https://www.googletagmanager.com ;`,
                    },
                    strictTransportSecurity: {
                        override: true,
                        accessControlMaxAge: Duration.days(2 * 365),
                        includeSubdomains: true,
                        preload: true,
                    },
                    contentTypeOptions: {
                        override: true,
                    },
                    referrerPolicy: {
                        override: true,
                        referrerPolicy:
                        aws_cloudfront.HeadersReferrerPolicy
                            .STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
                    },
                    xssProtection: {
                        override: true,
                        protection: true,
                        modeBlock: true,
                    },
                    frameOptions: {
                        override: true,
                        frameOption: aws_cloudfront.HeadersFrameOption.DENY,
                    },
                },
            }
        );

        const apiOrigin = new cdk.aws_cloudfront_origins.HttpOrigin(
            `${props.api.restApiId}.execute-api.${cdk.Aws.REGION}.${cdk.Aws.URL_SUFFIX}`,
            {
                originPath: `/${props.api.deploymentStage.stageName}`,
                originSslProtocols: [cdk.aws_cloudfront.OriginSslPolicy.TLS_V1_2],
                protocolPolicy: cdk.aws_cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
            }
        );

        const cloudFrontDistribution = new aws_cloudfront.Distribution(
            this,
            "BdymentPortFolioCloudfrontDistribution",
            {
                certificate: certificate,
                domainNames: [domainName],
                defaultRootObject: "index.html",
                defaultBehavior: {
                    origin: new cdk.aws_cloudfront_origins.S3Origin(props.bucketAssets, {
                        originAccessIdentity: props.cloudfrontOriginAccessIdentity,
                    }),
                    viewerProtocolPolicy:
                    aws_cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                    responseHeadersPolicy: responseHeaderPolicy,
                },
                additionalBehaviors: {
                    "api/*": {
                        origin: apiOrigin,
                        allowedMethods: aws_cloudfront.AllowedMethods.ALLOW_ALL,
                        viewerProtocolPolicy: aws_cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
                        originRequestPolicy: aws_cloudfront.OriginRequestPolicy.fromOriginRequestPolicyId(this, "b689b0a8-53d0-40ab-baf2-68738e2966ac", "b689b0a8-53d0-40ab-baf2-68738e2966ac"),
                        cachedMethods: aws_cloudfront.CachedMethods.CACHE_GET_HEAD,
                        cachePolicy: aws_cloudfront.CachePolicy.CACHING_DISABLED,
                    },
                },
                errorResponses: [
                    {
                        httpStatus: 404,
                        responseHttpStatus: 200,
                        responsePagePath: "/index.html",
                    }
                ],
            }
        );

        new aws_route53.ARecord(this, "BdymentPortFolioFrontArecord", {
            zone: zone,
            recordName: domainName,
            target: aws_route53.RecordTarget.fromAlias(
                new aws_route53_targets.CloudFrontTarget(cloudFrontDistribution)
            ),
        });

    }
}