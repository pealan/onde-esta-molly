# ============================================================================
# molly.pealan.dev — AWS infrastructure
#
# Provisions: one Ubuntu 24.04 ARM EC2 host (t4g.nano), a tight security
# group (SSH from admin IP only, HTTP/HTTPS public), a static Elastic IP,
# the Route53 hosted zone for the apex domain, and the A record pointing
# the subdomain at the instance.
#
# Server-side configuration (user, scoped key, rrsync) is handled by
# scripts/server-provision.sh — run on the box after `terraform apply`.
# ============================================================================

terraform {
  required_version = ">= 1.6"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region  = var.region
  profile = var.aws_profile

  default_tags {
    tags = {
      Project   = "molly-archive"
      ManagedBy = "terraform"
      Repo      = "github.com/pealan/onde-esta-molly"
    }
  }
}

# ── DNS zone (created here; NS records are emitted as an output for you
#    to paste at your registrar so delegation works) ─────────────────────────

resource "aws_route53_zone" "this" {
  name    = var.domain
  comment = "Managed by terraform — github.com/pealan/onde-esta-molly"
}

# ── Lookups ────────────────────────────────────────────────────────────────

# Canonical's official Ubuntu 24.04 (Noble) ARM64 AMI — re-resolved each apply.
data "aws_ami" "ubuntu_arm64" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-arm64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# ── Network: VPC + public subnet ───────────────────────────────────────────
# Newer AWS accounts (especially outside us-east-1) don't get a default VPC,
# so we provision an explicit one. Self-contained IaC, works on any account.

resource "aws_vpc" "this" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true
  tags                 = { Name = "pealan-prod-vpc" }
}

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.this.id
  cidr_block              = "10.0.0.0/24"
  availability_zone       = "${var.region}a"
  map_public_ip_on_launch = true
  tags                    = { Name = "pealan-prod-public" }
}

resource "aws_internet_gateway" "this" {
  vpc_id = aws_vpc.this.id
  tags   = { Name = "pealan-prod-igw" }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.this.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.this.id
  }
  tags = { Name = "pealan-prod-public" }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

# ── Network access ─────────────────────────────────────────────────────────

resource "aws_security_group" "web" {
  name        = "pealan-prod-web"
  description = "molly.pealan.dev — SSH admin-only, HTTP/HTTPS public"
  vpc_id      = aws_vpc.this.id

  ingress {
    description = "SSH (admin IP only)"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.admin_ip_cidr]
  }

  ingress {
    description = "HTTP (certbot HTTP-01 + redirect to HTTPS)"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "All egress (apt, certbot, etc.)"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# ── Compute ────────────────────────────────────────────────────────────────

resource "aws_key_pair" "admin" {
  key_name   = "pealan-admin"
  public_key = var.admin_public_key
}

resource "aws_instance" "web" {
  ami                    = data.aws_ami.ubuntu_arm64.id
  instance_type          = var.instance_type
  key_name               = aws_key_pair.admin.key_name
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.web.id]

  root_block_device {
    volume_type = "gp3"
    volume_size = 8
    encrypted   = true
  }

  # IMDSv2-only: blocks SSRF-based credential theft against the metadata service.
  metadata_options {
    http_tokens                 = "required"
    http_endpoint               = "enabled"
    http_put_response_hop_limit = 1
  }

  tags = { Name = "pealan-prod-molly" }
}

resource "aws_eip" "web" {
  instance = aws_instance.web.id
  domain   = "vpc"
  tags     = { Name = "pealan-prod-molly" }
}

# ── DNS ────────────────────────────────────────────────────────────────────

resource "aws_route53_record" "molly" {
  zone_id = aws_route53_zone.this.zone_id
  name    = "${var.subdomain}.${var.domain}"
  type    = "A"
  ttl     = 300
  records = [aws_eip.web.public_ip]
}
