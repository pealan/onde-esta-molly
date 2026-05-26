output "public_ip" {
  description = "Elastic IP attached to the instance. Pin DNS here."
  value       = aws_eip.web.public_ip
}

output "dns_name" {
  description = "Public DNS the site will serve from once nginx + TLS are configured."
  value       = aws_route53_record.molly.fqdn
}

output "ssh_command" {
  description = "Copy-paste this to log in as the admin user."
  value       = "ssh ubuntu@${aws_route53_record.molly.fqdn}"
}

output "next_steps" {
  description = "Post-apply runbook."
  value       = <<-EOT

    ────────────────────────────────────────────────────────────────────
    Infra is up. Public IP: ${aws_eip.web.public_ip}
    DNS:                    ${aws_route53_record.molly.fqdn}
    ────────────────────────────────────────────────────────────────────

    1. Wait ~1 min for DNS to propagate, then verify:
         dig +short ${aws_route53_record.molly.fqdn}
         # should return: ${aws_eip.web.public_ip}

    2. SSH into the box:
         ssh ubuntu@${aws_route53_record.molly.fqdn}

    3. Bootstrap (creates molly-deploy user, scoped key, rrsync):
         curl -fsSLO https://raw.githubusercontent.com/pealan/onde-esta-molly/main/scripts/server-provision.sh
         chmod +x server-provision.sh && sudo ./server-provision.sh
         # the script prints the nginx + certbot commands to run next

    4. From your laptop, in the repo root:
         rsync -avz --delete bundle/ gente-prod-molly:/

    5. Verify:
         curl -sI https://${aws_route53_record.molly.fqdn}/   # 200 OK

  EOT
}
