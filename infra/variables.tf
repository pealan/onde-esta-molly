variable "region" {
  description = "AWS region. sa-east-1 (São Paulo) keeps latency low for a Brazilian-language site."
  type        = string
  default     = "sa-east-1"
}

variable "aws_profile" {
  description = "Named profile in ~/.aws/credentials. See infra/README.md for IAM setup."
  type        = string
  default     = "gente-admin"
}

variable "domain" {
  description = "Apex domain. This module CREATES the Route53 hosted zone for it — paste the resulting NS records into your registrar."
  type        = string
  default     = "pealan.dev"
}

variable "subdomain" {
  description = "Subdomain to publish under. Result: <subdomain>.<domain>."
  type        = string
  default     = "molly"
}

variable "instance_type" {
  description = "EC2 type. t4g.nano (ARM, 0.5 GB RAM) is plenty for a static nginx site."
  type        = string
  default     = "t4g.nano"
}

variable "admin_public_key" {
  description = "OpenSSH public key (single line) for the ubuntu admin user. Paste contents of ~/.ssh/id_ed25519.pub."
  type        = string
}

variable "admin_ip_cidr" {
  description = "CIDR allowed to SSH in. Pin to your laptop's IP /32 (find via `curl -s ifconfig.me`)."
  type        = string

  validation {
    condition     = can(cidrhost(var.admin_ip_cidr, 0))
    error_message = "admin_ip_cidr must be a valid CIDR (e.g. 203.0.113.42/32)."
  }
}
