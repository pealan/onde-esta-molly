#!/usr/bin/env bash
# ============================================================================
# infra/bootstrap-iam.sh — one-time IAM user bootstrap for the Terraform module
#
# Creates the `gente-admin` IAM user, attaches the scoped policy from
# iam-policy-gente-admin.json as an inline policy, generates an access key,
# and prints the credentials in the format `aws configure` expects.
#
# WHERE TO RUN THIS
#   ▶ AWS CloudShell (https://console.aws.amazon.com/cloudshell/)
#     CloudShell is already authenticated as your console session, so this
#     script needs no AWS creds — and you avoid ever generating long-lived
#     root access keys.
#
#     # 1. Open CloudShell in any region.
#     # 2. Clone the repo (or just paste this file + the policy JSON):
#     git clone https://github.com/pealan/onde-esta-molly && cd onde-esta-molly/infra
#     # 3. Run:
#     bash bootstrap-iam.sh
#
# IDEMPOTENT — re-running is safe:
#   - User already exists?         skip create
#   - Policy already attached?     overwrites with current file contents
#   - Access keys already exist?   prints them out (won't create a 2nd one)
# ============================================================================
set -euo pipefail

USER_NAME="gente-admin"
POLICY_NAME="gente-admin-terraform"
POLICY_FILE="$(dirname "$0")/iam-policy-gente-admin.json"

if [[ ! -f "$POLICY_FILE" ]]; then
    echo "ERROR: $POLICY_FILE not found. Run this script from infra/." >&2
    exit 1
fi

# 1. Create user (idempotent).
if aws iam get-user --user-name "$USER_NAME" >/dev/null 2>&1; then
    echo "✓ User $USER_NAME already exists."
else
    aws iam create-user --user-name "$USER_NAME" \
        --tags Key=Project,Value=molly-archive Key=ManagedBy,Value=bootstrap-script \
        >/dev/null
    echo "✓ Created user $USER_NAME."
fi

# 2. Attach scoped inline policy (put-user-policy overwrites if exists).
aws iam put-user-policy \
    --user-name "$USER_NAME" \
    --policy-name "$POLICY_NAME" \
    --policy-document "file://$POLICY_FILE"
echo "✓ Attached policy $POLICY_NAME (from $POLICY_FILE)."

# 3. Access keys. AWS allows max 2 per user — if any exist, we don't create
#    another silently. The operator should rotate explicitly.
EXISTING=$(aws iam list-access-keys --user-name "$USER_NAME" \
    --query 'AccessKeyMetadata[].AccessKeyId' --output text)
if [[ -n "$EXISTING" ]]; then
    cat >&2 <<MSG

⚠  Access key(s) already exist for $USER_NAME:
$(echo "$EXISTING" | tr '\t' '\n' | sed 's/^/   - /')

   I won't create a new one (max is 2, and silently growing keys is bad
   hygiene). If you've lost the secret, rotate explicitly:
       aws iam delete-access-key --user-name $USER_NAME --access-key-id <OLD>
       bash bootstrap-iam.sh
MSG
    exit 0
fi

KEY_JSON=$(aws iam create-access-key --user-name "$USER_NAME")
KEY_ID=$(echo "$KEY_JSON" | jq -r '.AccessKey.AccessKeyId')
KEY_SECRET=$(echo "$KEY_JSON" | jq -r '.AccessKey.SecretAccessKey')

cat <<DONE

────────────────────────────────────────────────────────────────────
✅ Bootstrap complete. New access key for $USER_NAME:

   AWS_ACCESS_KEY_ID     = $KEY_ID
   AWS_SECRET_ACCESS_KEY = $KEY_SECRET

This secret will NEVER be shown again. Copy it now.

────────────────────────────────────────────────────────────────────
Paste this into your laptop (NOT in CloudShell — back on your machine):

    ./dev aws configure --profile gente-admin
    #   AWS Access Key ID:     $KEY_ID
    #   AWS Secret Access Key: $KEY_SECRET
    #   Default region:        sa-east-1
    #   Default output format: json

Then verify:

    ./dev aws --profile gente-admin sts get-caller-identity

You can now close this CloudShell tab. The credentials don't persist here.
────────────────────────────────────────────────────────────────────
DONE
