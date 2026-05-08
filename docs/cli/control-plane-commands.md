---
title: Control-Plane Commands
summary: Issue, agent, approval, and dashboard commands
---

Client-side commands for managing issues, agents, approvals, and more.

## Issue Commands

```sh
# List issues
pnpm bench issue list [--status todo,in_progress] [--assignee-agent-id <id>] [--match text]

# Get issue details
pnpm bench issue get <issue-id-or-identifier>

# Create issue
pnpm bench issue create --title "..." [--description "..."] [--status todo] [--priority high]

# Update issue
pnpm bench issue update <issue-id> [--status in_progress] [--comment "..."]

# Add comment
pnpm bench issue comment <issue-id> --body "..." [--reopen]

# Checkout task
pnpm bench issue checkout <issue-id> --agent-id <agent-id>

# Release task
pnpm bench issue release <issue-id>
```

## Company Commands

```sh
pnpm bench company list
pnpm bench company get <company-id>

# Export to portable folder package (writes manifest + markdown files)
pnpm bench company export <company-id> --out ./exports/acme --include company,agents

# Preview import (no writes)
pnpm bench company import \
  <owner>/<repo>/<path> \
  --target existing \
  --company-id <company-id> \
  --ref main \
  --collision rename \
  --dry-run

# Apply import
pnpm bench company import \
  ./exports/acme \
  --target new \
  --new-company-name "Acme Imported" \
  --include company,agents
```

## Agent Commands

```sh
pnpm bench agent list
pnpm bench agent get <agent-id>
```

## Approval Commands

```sh
# List approvals
pnpm bench approval list [--status pending]

# Get approval
pnpm bench approval get <approval-id>

# Create approval
pnpm bench approval create --type hire_agent --payload '{"name":"..."}' [--issue-ids <id1,id2>]

# Approve
pnpm bench approval approve <approval-id> [--decision-note "..."]

# Reject
pnpm bench approval reject <approval-id> [--decision-note "..."]

# Request revision
pnpm bench approval request-revision <approval-id> [--decision-note "..."]

# Resubmit
pnpm bench approval resubmit <approval-id> [--payload '{"..."}']

# Comment
pnpm bench approval comment <approval-id> --body "..."
```

## Activity Commands

```sh
pnpm bench activity list [--agent-id <id>] [--entity-type issue] [--entity-id <id>]
```

## Dashboard

```sh
pnpm bench dashboard get
```

## Heartbeat

```sh
pnpm bench heartbeat run --agent-id <agent-id> [--api-base http://localhost:3100]
```
