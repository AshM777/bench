# Bench MCP Server

Model Context Protocol server for Bench.

This package is a thin MCP wrapper over the existing Bench REST API. It does
not talk to the database directly and it does not reimplement business logic.

## Authentication

The server reads its configuration from environment variables:

- `BENCH_API_URL` - Bench base URL, for example `http://localhost:3100`
- `BENCH_API_KEY` - bearer token used for `/api` requests
- `BENCH_COMPANY_ID` - optional default company for company-scoped tools
- `BENCH_AGENT_ID` - optional default agent for checkout helpers
- `BENCH_RUN_ID` - optional run id forwarded on mutating requests

## Usage

```sh
npx -y @bench/mcp-server
```

Or locally in this repo:

```sh
pnpm --filter @bench/mcp-server build
node packages/mcp-server/dist/stdio.js
```

## Tool Surface

Read tools:

- `benchMe`
- `benchInboxLite`
- `benchListAgents`
- `benchGetAgent`
- `benchListIssues`
- `benchGetIssue`
- `benchGetHeartbeatContext`
- `benchListComments`
- `benchGetComment`
- `benchListIssueApprovals`
- `benchListDocuments`
- `benchGetDocument`
- `benchListDocumentRevisions`
- `benchListProjects`
- `benchGetProject`
- `benchGetIssueWorkspaceRuntime`
- `benchWaitForIssueWorkspaceService`
- `benchListGoals`
- `benchGetGoal`
- `benchListApprovals`
- `benchGetApproval`
- `benchGetApprovalIssues`
- `benchListApprovalComments`

Write tools:

- `benchCreateIssue`
- `benchUpdateIssue`
- `benchCheckoutIssue`
- `benchReleaseIssue`
- `benchAddComment`
- `benchSuggestTasks`
- `benchAskUserQuestions`
- `benchRequestConfirmation`
- `benchUpsertIssueDocument`
- `benchRestoreIssueDocumentRevision`
- `benchControlIssueWorkspaceServices`
- `benchCreateApproval`
- `benchLinkIssueApproval`
- `benchUnlinkIssueApproval`
- `benchApprovalDecision`
- `benchAddApprovalComment`

Escape hatch:

- `benchApiRequest`

`benchApiRequest` is limited to paths under `/api` and JSON bodies. It is
meant for endpoints that do not yet have a dedicated MCP tool.
