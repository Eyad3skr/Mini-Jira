# VPC migration: public ALB + private EC2 + NAT

**Status:** Migration **completed** for `mini-jira-vpc`. EC2 runs in private subnets with no public IPs; admin via **SSM Session Manager**. NAT 1a (`nat-085b0e523088ab428`) serves both private subnets; NAT 1b (`nat-064ae60a9ebddb766`) exists for optional per-AZ routing ([Option B](#option-b--nat-per-az-stronger-diagram) below).

Use this document as a **runbook** for rebuild/rollback or another environment — not as “EC2 still in public subnets only.”

---

Target architecture:

```text
Internet
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│  VPC mini-jira-vpc                                       │
│                                                          │
│  PUBLIC (10.0.0.0/25 + 10.0.0.128/25)  ← you have these │
│    • Internet Gateway (already: igw-0d2c8e4837a60dde7)   │
│    • ALB (mini-jira-alb)                                 │
│    • NAT Gateway(s)                                      │
│                                                          │
│  PRIVATE (new: 10.2.0.0/25 + 10.2.0.128/25)              │
│    • EC2 ASG (no public IP)                              │
│    • 0.0.0.0/0 → NAT (outbound: Cognito, S3, SNS, etc.)  │
└─────────────────────────────────────────────────────────┘
```

**Your IDs (eu-north-1):**

| Resource | ID |
|----------|-----|
| VPC | `vpc-0839ece58c89264ca` |
| Public subnet 1a | `subnet-0df9d68d325a5534a` (10.0.0.0/25) |
| Public subnet 1b | `subnet-04b10fa483209cb55` (10.0.0.128/25) |
| ALB SG | `sg-0a12014db2754d447` |
| EC2 SG | `sg-086b2a0c91f9ce742` |
| ASG | `mini-jira-asg` |
| Launch template | `asg-template` (default **v5**, no public IP) |
| Target group | `mini-jira-api-tg` (port 80) |
| Private subnet 1a | `mini-jira-private-1a` (`10.2.0.0/25`) |
| Private subnet 1b | `mini-jira-private-1b` (`10.2.0.128/25`) |
| NAT 1a (active route) | `nat-085b0e523088ab428` |
| NAT 1b (optional HA) | `nat-064ae60a9ebddb766` |

**Downtime:** ~15–30 minutes while ASG is scaled to 0 and back up in private subnets. CloudFront URL stays the same.

**Cost:** NAT Gateway ≈ $0.045/hr + data processing in `eu-north-1` (budget accordingly).

---

## Before you start

1. **Snapshot mental model:** EC2 will **lose public IPs**. Primary admin path: **SSM Session Manager** (`mini-jira-ec2-role` + `AmazonSSMManagedInstanceCore`). SSH to a public IP is not the documented ops path for private EC2.
2. **Commit / backup** anything on instances you care about (`pm2 save`, golden AMI optional).
3. **AWS CLI** configured with admin rights (not the EC2 instance role).
4. Optional: set ASG **min/desired/max** to 0 during maintenance window.

---

## Phase 1 — Tag and confirm public subnets

Your two existing subnets are already public (`MapPublicIpOnLaunch=true`, route to IGW).

**Console:** VPC → Subnets → select each → Tags:

- `Name` = `mini-jira-public-1a` / `mini-jira-public-1b`
- `Tier` = `public`

**Verify route table** `rtb-052847338bb7a53e4` (or the one with `0.0.0.0/0` → `igw-...`) is associated with **both** public subnets only.

```bash
aws ec2 describe-route-tables --region eu-north-1 \
  --filters Name=vpc-id,Values=vpc-0839ece58c89264ca \
  --query 'RouteTables[].{Id:RouteTableId,Routes:Routes,Subnets:Associations[*].SubnetId}'
```

Keep this table as **public route table**. Do **not** associate private subnets with it.

---

## Phase 2 — Add address space for private subnets

Your VPC primary CIDR is only `10.0.0.0/24` (256 IPs). Private subnets need **non-overlapping** space.

### Why `10.0.1.0/24` and `172.16.0.0/24` both fail

Your VPC primary CIDR is **`10.0.0.0/24`**, which puts it in the **`10.0.0.0/8`** family. AWS rules ([IPv4 CIDR block association restrictions](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-cidr-blocks.html#add-cidr-block-restrictions)):

| Block you tried | Why it is rejected |
|-----------------|-------------------|
| `10.0.1.0/24` | Your VPC already uses space in **`10.0.0.0/15`** (`10.0.0.0`–`10.1.255.255`). AWS blocks adding more CIDRs from **`10.0.0.0/16`** (`10.0.0.0`–`10.0.255.255`). |
| `172.16.0.0/24` | With a `10.0.0.0/8` VPC, AWS blocks secondary CIDRs from **other RFC1918 ranges** (`172.16.0.0/12`, `192.168.0.0/16`). The error says *“same private address range”* — meaning another **`10.0.0.0/8`** block, not `172.16.x`. |

**What works:** another **`10.0.0.0/8`** CIDR that is **outside** `10.0.0.0/16`, e.g. **`10.2.0.0/24`** (covers `10.2.0.0`–`10.2.0.255`).

You have **two valid paths**:

| Path | Secondary CIDR | Effort |
|------|----------------|--------|
| **A (recommended)** | `10.2.0.0/24` (still `10.0.0.0/8`, AWS-allowed) | Low — keep existing public subnets |
| **B** | None — split `10.0.0.0/24` into four `/26` subnets | High — [Appendix A](#appendix-a-fallback-rebuild-4-subnets-in-1000024-only) |

The rest of this guide uses **Path A**.

### 2a. Associate secondary CIDR `10.2.0.0/24`

**Console:** VPC → Your VPC → Actions → **Edit CIDRs** → Add `10.2.0.0/24` → Save.

**CLI:**

```bash
aws ec2 associate-vpc-cidr-block \
  --region eu-north-1 \
  --vpc-id vpc-0839ece58c89264ca \
  --cidr-block 10.2.0.0/24
```

Wait until state is `associated` (can take 1–5 minutes).

```bash
aws ec2 describe-vpcs --region eu-north-1 --vpc-ids vpc-0839ece58c89264ca \
  --query 'Vpcs[0].CidrBlockAssociationSet'
```

You should see both `10.0.0.0/24` and `10.2.0.0/24`. If association fails, use [Appendix A](#appendix-a-fallback-rebuild-4-subnets-in-1000024-only).

### 2b. Create private subnets (in `10.2.0.0/24`)

| Name | CIDR | AZ |
|------|------|-----|
| `mini-jira-private-1a` | `10.2.0.0/25` | `eu-north-1a` |
| `mini-jira-private-1b` | `10.2.0.128/25` | `eu-north-1b` |

**Console:** VPC → Subnets → Create subnet → VPC `mini-jira-vpc` → pick CIDR + AZ → **Auto-assign public IPv4: Disabled**.

**CLI:**

```bash
PRIVATE_1A=$(aws ec2 create-subnet --region eu-north-1 \
  --vpc-id vpc-0839ece58c89264ca \
  --cidr-block 10.2.0.0/25 \
  --availability-zone eu-north-1a \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=mini-jira-private-1a},{Key=Tier,Value=private}]' \
  --query Subnet.SubnetId --output text)

PRIVATE_1B=$(aws ec2 create-subnet --region eu-north-1 \
  --vpc-id vpc-0839ece58c89264ca \
  --cidr-block 10.2.0.128/25 \
  --availability-zone eu-north-1b \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=mini-jira-private-1b},{Key=Tier,Value=private}]' \
  --query Subnet.SubnetId --output text)

echo "PRIVATE_1A=$PRIVATE_1A PRIVATE_1B=$PRIVATE_1B"
```

Save the two subnet IDs for the ASG step.

---

## Phase 3 — NAT Gateway (outbound for private EC2)

### 3a. Allocate Elastic IPs (one per NAT; use two for full AZ HA)

```bash
EIP_1A=$(aws ec2 allocate-address --region eu-north-1 --domain vpc --query AllocationId --output text)
# Optional second AZ:
EIP_1B=$(aws ec2 allocate-address --region eu-north-1 --domain vpc --query AllocationId --output text)
```

### 3b. Create NAT Gateway in **public** subnets

**Important:** NAT must sit in a **public** subnet (route to IGW).

```bash
NAT_1A=$(aws ec2 create-nat-gateway --region eu-north-1 \
  --subnet-id subnet-0df9d68d325a5534a \
  --allocation-id $EIP_1A \
  --tag-specifications 'ResourceType=natgateway,Tags=[{Key=Name,Value=mini-jira-nat-1a}]' \
  --query NatGateway.NatGatewayId --output text)

# Optional (recommended for “2 AZ” story):
NAT_1B=$(aws ec2 create-nat-gateway --region eu-north-1 \
  --subnet-id subnet-04b10fa483209cb55 \
  --allocation-id $EIP_1B \
  --tag-specifications 'ResourceType=natgateway,Tags=[{Key=Name,Value=mini-jira-nat-1b}]' \
  --query NatGateway.NatGatewayId --output text)
```

Wait until `State` = `available`:

```bash
aws ec2 describe-nat-gateways --region eu-north-1 --nat-gateway-ids $NAT_1A --query 'NatGateways[0].State'
```

**Cost-saving alternative (deployed):** one NAT in `1a` only; both private subnets use it via `mini-jira-private-rt` → `nat-085b0e523088ab428`. NAT 1b may exist but is optional unless you use per-AZ route tables (private hosts in `1b` lose outbound if `1a` AZ fails when using single-NAT routing).

---

## Phase 4 — Private route tables

Create **one route table per private subnet** (best practice for AZ-local NAT) or one shared table (simpler).

### Option A — One NAT in 1a (cheaper)

```bash
RT_PRIVATE=$(aws ec2 create-route-table --region eu-north-1 \
  --vpc-id vpc-0839ece58c89264ca \
  --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=mini-jira-private-rt}]' \
  --query RouteTable.RouteTableId --output text)

aws ec2 create-route --region eu-north-1 \
  --route-table-id $RT_PRIVATE \
  --destination-cidr-block 0.0.0.0/0 \
  --nat-gateway-id $NAT_1A

aws ec2 associate-route-table --region eu-north-1 \
  --route-table-id $RT_PRIVATE --subnet-id $PRIVATE_1A

aws ec2 associate-route-table --region eu-north-1 \
  --route-table-id $RT_PRIVATE --subnet-id $PRIVATE_1B
```

### Option B — NAT per AZ (stronger diagram)

- Route table `private-rt-1a`: `0.0.0.0/0` → `NAT_1A`, associated with `PRIVATE_1A`
- Route table `private-rt-1b`: `0.0.0.0/0` → `NAT_1B`, associated with `PRIVATE_1B`

**Verify private subnets do NOT have a route to `igw-...`**, only to `nat-...`.

---

## Phase 5 — Security groups (confirm before cutover)

Requirement: **EC2 only reachable from ALB** on app ports.

Your `mini-jira-ec2-sg` already allows:

- TCP **80** from ALB SG ✓ (nginx)
- TCP **3001** from ALB SG ✓ (optional direct API)

**Remove or avoid** after migration:

- SSH `22` from `0.0.0.0/0` (you have a single IP — OK for admin, not “private EC2” best practice)

**ALB SG** (`mini-jira-alb-sg`): keep 80/443 from `0.0.0.0/0` (CloudFront/users hit ALB).

No change required if the above already matches.

---

## Phase 6 — Launch template: no public IP

**Console:** EC2 → Launch Templates → `asg-template` → Create new version:

- **Network settings:** Subnet = (will be overridden by ASG)
- **Auto-assign public IP:** **Disable**
- Security group: `mini-jira-ec2-sg`
- IAM instance profile: `mini-jira-ec2-role`

**CLI (new version example):**

```bash
# Get current template data, then create-version with AssociatePublicIpAddress=false
aws ec2 describe-launch-template-versions --region eu-north-1 \
  --launch-template-name asg-template --versions '$Latest' \
  --query 'LaunchTemplateVersions[0].LaunchTemplateData'

# When creating new version, set:
#   NetworkInterfaces[0].AssociatePublicIpAddress=false
#   (or LaunchTemplateData with no public IP — exact field depends on your template type)
```

If your template uses **simple subnet + SG** (not network interface block):

```bash
aws ec2 create-launch-template-version --region eu-north-1 \
  --launch-template-name asg-template \
  --source-version '$Latest' \
  --launch-template-data '{
    "NetworkInterfaces": [{
      "DeviceIndex": 0,
      "AssociatePublicIpAddress": false,
      "Groups": ["sg-086b2a0c91f9ce742"],
      "DeleteOnTermination": true
    }]
  }'
```

Set ASG to use **$Latest** launch template version.

---

## Phase 7 — Move ASG to private subnets

### 7a. Scale down

```bash
aws autoscaling update-auto-scaling-group --region eu-north-1 \
  --auto-scaling-group-name mini-jira-asg \
  --min-size 0 --desired-capacity 0 --max-size 2
```

Wait until no instances are running (check EC2 console).

### 7b. Update ASG subnets (private only)

```bash
aws autoscaling update-auto-scaling-group --region eu-north-1 \
  --auto-scaling-group-name mini-jira-asg \
  --vpc-zone-identifier "$PRIVATE_1A,$PRIVATE_1B" \
  --health-check-type ELB \
  --health-check-grace-period 300
```

**Do not** include public subnet IDs in `vpc-zone-identifier`.

### 7c. Scale back up

```bash
aws autoscaling update-auto-scaling-group --region eu-north-1 \
  --auto-scaling-group-name mini-jira-asg \
  --min-size 2 --desired-capacity 2 --max-size 2
```

New instances should show:

- **Subnet:** `mini-jira-private-1a` or `1b`
- **Public IPv4:** none
- **Private IP:** `10.2.0.x`

### 7d. ALB stays in public subnets

**No change** to ALB subnet list — still `subnet-0df9d68d325a5534a` + `subnet-04b10fa483209cb55`.

Target group registers instances by **private IP** (normal for ALB → private EC2).

---

## Phase 8 — Verify

### Network

```bash
# No NAT = fail
aws ec2 describe-nat-gateways --region eu-north-1 \
  --filter Name=vpc-id,Values=vpc-0839ece58c89264ca \
  --query 'NatGateways[?State==`available`].NatGatewayId'

# Instances private only
aws ec2 describe-instances --region eu-north-1 \
  --filters Name=tag:aws:autoscaling:groupName,Values=mini-jira-asg Name=instance-state-name,Values=running \
  --query 'Reservations[].Instances[].{Subnet:SubnetId,Public:PublicIpAddress,Private:PrivateIpAddress}'
```

### Application

1. `curl http://<alb-dns>/health` → `{"status":"ok",...}`
2. CloudFront → login → create task → SNS / DynamoDB / S3 upload
3. Target group **healthy** for both instances

If health checks fail:

- SG: ALB → EC2 on port **80**
- Private route: `0.0.0.0/0` → NAT
- Nginx listening on `0.0.0.0:80`

---

## Phase 9 — Admin access without public EC2 IP

Pick one:

### A. SSM Session Manager (recommended)

1. Attach policy `AmazonSSMManagedInstanceCore` to `mini-jira-ec2-role`
2. Ensure VPC endpoints or NAT allows SSM (NAT is enough for outbound to AWS APIs)
3. EC2 → Instance → Connect → **Session Manager**

### B. Bastion in public subnet

- Small EC2 in `mini-jira-public-1a` with public IP
- SSH to bastion, then `ssh` to `10.2.0.x` private IP
- Restrict bastion SG to your IP only

### C. Keep SSH rule on EC2 SG only if you temporarily assign public IP (not recommended for final diagram)

---

## Phase 10 — Update architecture documentation

Document in [../docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) and your formal diagram:

- **Public subnets:** ALB + NAT (+ optional bastion)
- **Private subnets:** ASG / EC2
- **NAT:** outbound path for Cognito, S3, SNS, DynamoDB

Application URL: `https://d2nnx11y19xl0z.cloudfront.net`

---

## Appendix A — Fallback: rebuild 4 subnets in 10.0.0.0/24 only

If you cannot add any allowed secondary CIDR (e.g. `10.2.0.0/24`), you must **replace** `/25` subnets with four `/26` subnets (requires deleting old subnets after ASG/ALB teardown):

| Subnet | CIDR | Role |
|--------|------|------|
| public-1a | 10.0.0.0/26 | ALB, NAT |
| public-1b | 10.0.0.64/26 | ALB, NAT |
| private-1a | 10.0.0.128/26 | EC2 |
| private-1b | 10.0.0.192/26 | EC2 |

Order: scale ASG to 0 → delete ASG subnets association → remove ALB (or move) → delete subnets → create four `/26` → NAT → ALB → ASG.

This is more disruptive; prefer **Phase 2** secondary CIDR if possible.

---

## Checklist (requirement mapping)

| Requirement | After migration |
|-------------|----------------|
| Public subnets for ALB | ALB in `subnet-0df9d68d325a5534a` + `subnet-04b10fa483209cb55` |
| Private subnets for EC2 | ASG in `mini-jira-private-1a` + `mini-jira-private-1b` |
| NAT for outbound | NAT in public subnet(s); private RT `0.0.0.0/0` → NAT |

---

## Rollback (if something breaks)

1. ASG `vpc-zone-identifier` back to public subnet IDs
2. Launch template: re-enable public IP if needed
3. Scale to 2
4. ALB unchanged — should work as before

NAT/EIP can be deleted later to save cost.
