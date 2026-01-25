# Akiflow MCP Server

MCP server for Akiflow task management.

## Features

- Get tasks, events, calendars with filters
- Create and update tasks
- Schedule/unschedule tasks on calendar
- Mark tasks done
- List projects and tags
- Auto-refreshing authentication

## Setup

### 1. Get Your Refresh Token

1. Open Akiflow web app (web.akiflow.com)
2. Open DevTools: `Cmd+Option+I` (Mac) or `Ctrl+Shift+I` (Windows/Linux)
3. Go to **Network** tab
4. Refresh the page or wait for a `refreshToken` request
5. Copy the `refresh_token` value from the request/response

### 2. Configure MCP

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "akiflow": {
      "command": "npx",
      "args": ["-y", "@shrimpwtf/mcp-akiflow@latest"],
      "env": {
        "AKIFLOW_REFRESH_TOKEN": "your_refresh_token_here"
      }
    }
  }
}
```

## Available Tools

### Tasks

#### `get-tasks`
List tasks with optional filters.
- `done` (boolean): Filter by completion status (default: false)
- `status` (string): `1`=Inbox, `2`=Planned, `4`=Snoozed, `7`=Someday, `10`=Scheduled
- `limit` (number): Max tasks to return

#### `add-task`
Create a new task.
- `title` (string, required): Task title
- `description` (string): Task description
- `date` (string): Plan date (`YYYY-MM-DD`)
- `datetime` (string): Plan datetime (ISO 8601)
- `due_date` (string): Deadline (`YYYY-MM-DD`)
- `duration` (number): Duration in minutes
- `priority` (string): `-1`=goal, `1`=high, `2`=medium, `3`=low
- `status` (string): `1`=Inbox, `2`=Planned, `7`=Someday, `10`=Scheduled
- `listId` (string): Project UUID
- `tags_ids` (array): Tag UUIDs

#### `edit-task`
Update an existing task.
- `id` (string, required): Task UUID
- All fields from `add-task` (optional, nullable to clear values)

#### `mark-done`
Mark a task as completed.
- `id` (string, required): Task UUID

#### `schedule-task`
Schedule a task on the calendar.
- `id` (string, required): Task UUID
- `date` (string, required): Date (`YYYY-MM-DD`)
- `datetime` (string): Specific time (ISO 8601)
- `duration` (number): Duration in minutes (default: 30)

#### `unschedule-task`
Remove a task from the calendar.
- `id` (string, required): Task UUID
- `to_inbox` (boolean): Move to inbox (default: true)

### Calendar

#### `get-events`
Get calendar events.
- `limit` (number): Max events to return
- `calendar_id` (string): Filter by calendar ID

#### `get-calendars`
Get all calendars with metadata.

### Organization

#### `get-projects`
List all projects and folders.

#### `get-tags`
List all tags.

## API Details

### Task Status
- `1`: Inbox
- `2`: Planned
- `4`: Snoozed
- `7`: Someday
- `10`: Scheduled

### Task Priority
- `-1`: Goal
- `1`: High
- `2`: Medium
- `3`: Low
- `null`: None

### Date Formats
- Date: `YYYY-MM-DD`
- Datetime: ISO 8601 (`2026-01-26T10:00:00.000Z`)

## Security

- Refresh token is sensitive - treat like a password
- Never commit tokens to git
- Access tokens auto-refresh on 401

## License

MIT
