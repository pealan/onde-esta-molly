# ============================================================================
# molly.gente.com — AWS infrastructure
#
# Provisions: one Ubuntu 24.04 ARM EC2 host (t4g.nano), a tight security
# group (SSH from admin IP only, HTTP/HTTPS public), a static Elastic IP,
# and the Route53 A record pointing the subdomain at it.
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

# ── Lookups ────────────────────────────────────────────────────────────────

data "aws_route53_zone" "this" {
  name         = var.domain
  private_zone = false
}

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

# ── Network access ─────────────────────────────────────────────────────────

resource "aws_security_group" "web" {
  name        = "gente-prod-web"
  description = "molly.gente.com — SSH admin-only, HTTP/HTTPS public"

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
  key_name   = "gente-admin"
  public_key = var.admin_public_key
}

resource "aws_instance" "web" {
  ami                    = data.aws_ami.ubuntu_arm64.id
  instance_type          = var.instance_type
  key_name               = aws_key_pair.admin.key_name
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

  tags = { Name = "gente-prod-molly" }
}

resource "aws_eip" "web" {
  instance = aws_instance.web.id
  domain   = "vpc"
  tags     = { Name = "gente-prod-molly" }
}

# ── DNS ────────────────────────────────────────────────────────────────────

resource "aws_route53_record" "molly" {
  zone_id = data.aws_route53_zone.this.zone_id
  name    = "${var.subdomain}.${var.domain}"
  type    = "A"
  ttl     = 300
  records = [aws_eip.web.public_ip]
}
