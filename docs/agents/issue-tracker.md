# Issue tracker: Linear

Issues and specs for this repo live in Linear. Use the **Linear MCP** (`plugin-linear-linear`) for all operations — not `gh`.

## Defaults

- **Team**: `Dylans apps` (key `DYL`)
- **Project**: `Grid`
- **Workflow states** (use these exact names when setting `state`):
  - `Backlog`
  - `Todo`
  - `In Progress`
  - `In Review`
  - `Done`

## Conventions

- **Create an issue**: `save_issue` with `title`, `team: "Dylans apps"`, `project: "Grid"`, and optional `description` (Markdown, literal newlines). Default new work to `state: "Backlog"` unless the user specifies otherwise.
- **Update an issue**: `save_issue` with `id` (e.g. `DYL-123`) plus fields to change. Prefer `patch` for partial description edits.
- **Read an issue**: `get_issue` with `id` (identifier like `DYL-123` or UUID). Use `includeRelations: true` when blockers/related matter.
- **List issues**: `list_issues` scoped with `team: "Dylans apps"` and/or `project: "Grid"`, plus `state` / `assignee` / `query` as needed.
- **Comment**: `save_comment` with `issueId` and `body` (Markdown).
- **Statuses**: resolve names via `list_issue_statuses` for team `Dylans apps` if a state string is rejected; prefer the workflow names above.

## When a skill says "publish to the issue tracker"

Create a Linear issue on team **Dylans apps**, project **Grid**, typically in **Backlog**.

## When a skill says "fetch the relevant ticket"

`get_issue` for the given identifier (e.g. `DYL-42`).
