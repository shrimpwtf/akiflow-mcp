# Akiflow MCP - AI Instructions

You have access to Akiflow, a task and calendar management system. Use these tools to help users manage their tasks and schedule.

## Key Concepts

- **Tasks** live in the Inbox until scheduled or planned
- **Scheduling** a task puts it on the calendar at a specific date/time
- **Projects** (also called labels) organize tasks
- **Tags** provide additional categorization
- **Events** are calendar entries (from Google Calendar, etc.)

## Common Workflows

### Adding a task to inbox
```
add-task: title="Buy groceries"
```

### Scheduling a task for tomorrow at 10am
```
add-task: title="Team meeting", date="2026-01-26", datetime="2026-01-26T10:00:00.000Z", duration=60
```
Or for existing task:
```
schedule-task: id="task-uuid", date="2026-01-26", datetime="2026-01-26T10:00:00.000Z", duration=60
```

### Moving a scheduled task back to inbox
```
unschedule-task: id="task-uuid"
```

### Completing a task
```
mark-done: id="task-uuid"
```

### Setting priority
Priority values: `-1` (goal/highest), `1` (high), `2` (medium), `3` (low)
```
edit-task: id="task-uuid", priority="1"
```

### Assigning to a project
First get project IDs with `get-projects`, then:
```
edit-task: id="task-uuid", listId="project-uuid"
```

### Clearing a field
Set to `null` to clear:
```
edit-task: id="task-uuid", due_date=null, datetime=null
```

## Tips

1. Always use `get-tasks` first to find task IDs before editing
2. Duration is in **minutes** (converted to seconds internally)
3. Use ISO 8601 format for datetime (include timezone or use UTC with Z suffix)
4. Status `2` (Planned) is auto-set when you provide a date
5. To see what calendars are available, use `get-calendars`
6. Events are read-only (synced from external calendars)

## Status Reference
- `1` = Inbox (no date)
- `2` = Planned (has date)
- `4` = Snoozed
- `7` = Someday
- `10` = Scheduled
