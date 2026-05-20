# Architecture diagram (course deliverable)

## In this repo

| File | Purpose |
|------|---------|
| [architecture-diagram.svg](./architecture-diagram.svg) | Topology reference (2 AZ, public/private subnets, services). **Not** AWS official icons. |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Mermaid flow + data model |

## Graded submission (TODO)

The course requires a diagram drawn with [AWS Architecture Icons](https://aws.amazon.com/architecture/icons/) (Lucidchart, draw.io, or PowerPoint), showing **all services** from the project PDF across **two Availability Zones**.

**Export and commit** one of:

- `docs/architecture-diagram.png`
- `docs/architecture-diagram.pdf`

Then update the link in the root [README.md](../README.md) to point at that file.

### Must include

- **Edge:** CloudFront → ALB (public subnets, both AZs)
- **Compute:** EC2 ASG in **private** subnets (no public IP); NAT for outbound
- **Auth:** Cognito (browser + API validation)
- **Data:** DynamoDB; S3 originals + resized; Lambda on S3 PUT
- **Events:** SNS (assignments) → SQS → assignment worker Lambda; EventBridge `cron(0 9 * * ? *)` → daily digest Lambda → SNS digest
- **Ops:** CloudWatch dashboard `MiniJira`, alarm → SNS `mini-jira-alarms`
- **Network labels:** `mini-jira-public-1a/1b`, `mini-jira-private-1a/1b`, NAT 1a (and optional NAT 1b)

### Production IDs (for labels)

| Item | Value |
|------|--------|
| Region | `eu-north-1` |
| CloudFront | `E19LM6JGGQ56CX` |
| Public URL | `https://d2nnx11y19xl0z.cloudfront.net` |
| VPC | `mini-jira-vpc` (`vpc-0839ece58c89264ca`) |
| ASG | `mini-jira-asg` |

Detailed VPC steps: [../infrastructure/VPC-PRIVATE-EC2-MIGRATION.md](../infrastructure/VPC-PRIVATE-EC2-MIGRATION.md).
