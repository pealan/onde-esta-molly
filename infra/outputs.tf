output "public_ip" {
  description = "Elastic IP attached to the instance. Pin DNS here."
  value       = aws_eip.web.public_ip
}

output "dns_name" {
  description = "Public DNS the site will serve from once nginx + TLS are configured."
  value       = aws_route53_record.molly.fqdn
}

output "nameservers" {
  description = "Paste these into your registrar (Porkbun → Domain Management → Authoritative Nameservers)."
  value       = aws_route53_zone.this.name_servers
}

output "ssh_command" {
  description = "Copy-paste this to log in as the admin user."
  value       = "ssh ubuntu@${aws_route53_record.molly.fqdn}"
}

output "next_steps" {
  description = "Post-apply runbook."
  value       = <<-EOT

    ────────────────────────────────────────────────────────────────────
    Infra is up.
      Public IP:   ${aws_eip.web.public_ip}
      DNS target:  ${aws_route53_record.molly.fqdn}
    ────────────────────────────────────────────────────────────────────

    1. AT YOUR REGISTRAR (Porkbun → ${var.domain} → Authoritative Nameservers),
       paste the 4 nameservers from the `nameservers` output above.
       Save. Propagation takes minutes to hours.

    2. Verify (re-run every few minutes until it returns the EIP):
         dig +short ${aws_route53_record.molly.fqdn}
         # should return: ${aws_eip.web.public_ip}

    3. SSH into the box (once DNS resolves):
         ssh ubuntu@${aws_route53_record.molly.fqdn}

    4. Bootstrap (creates molly-deploy user, scoped key, rrsync):
         curl -fsSLO https://raw.githubusercontent.com/pealan/onde-esta-molly/main/scripts/server-provision.sh
         chmod +x server-provision.sh && sudo ./server-provision.sh
         # the script prints the nginx + certbot commands to run next

    5. From your laptop, in the repo root:
         rsync -avz --delete bundle/ pealan-prod-molly:/

    6. Smoke-test:
         curl -sI https://${aws_route53_record.molly.fqdn}/   # 200 OK

  EOT
}
