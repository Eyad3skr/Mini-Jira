# Architecture diagrams

## Repository files

| File | Description |
|------|-------------|
| [architecture-diagram.svg](./architecture-diagram.svg) | Logical topology — 2 AZ, public/private subnets, core services |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Mermaid service flow and data model |

## Formal diagram (AWS Architecture Icons)

For documentation that uses official icons, export from [AWS Architecture Icons](https://aws.amazon.com/architecture/icons/) (draw.io, Lucidchart, or similar) and add:

- `docs/architecture-diagram.png`, or
- `docs/architecture-diagram.pdf`

### Recommended components

| Layer | Include |
|-------|---------|
| Edge | CloudFront → ALB (public subnets, both AZs) |
| Compute | EC2 ASG in private subnets (no public IP); NAT for egress |
| Identity | Cognito user pool |
| Data | DynamoDB; S3 originals and resized; image-resize Lambda on PUT |
| Events | SNS assignments → SQS → worker Lambda; EventBridge `cron(0 9 * * ? *)` → digest Lambda |
| Observability | CloudWatch dashboard `MiniJira`, alarms → SNS |

### Production labels (eu-north-1)

| Resource | Identifier |
|----------|------------|
| CloudFront | `E19LM6JGGQ56CX` |
| VPC | `mini-jira-vpc` (`vpc-0839ece58c89264ca`) |
| ASG | `mini-jira-asg` |
| Public URL | `https://d2nnx11y19xl0z.cloudfront.net` |

VPC details: [../infrastructure/VPC-PRIVATE-EC2-MIGRATION.md](../infrastructure/VPC-PRIVATE-EC2-MIGRATION.md).
