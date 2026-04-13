#!/usr/bin/env node

/**
 * Akiflow MCP Server
 * Minimal, token-efficient task management for Akiflow
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {
  AkiflowClient,
  Task,
  Event,
  TimeSlot,
  Recording,
  MeetingBrief,
} from "./akiflow-client.js";
import { z } from "zod";

// Validate environment
const REFRESH_TOKEN = process.env.AKIFLOW_REFRESH_TOKEN;
if (!REFRESH_TOKEN) {
  console.error(
    "Error: AKIFLOW_REFRESH_TOKEN environment variable is required",
  );
  process.exit(1);
}

// Initialize client
const client = new AkiflowClient(REFRESH_TOKEN);

// Instructions for AI
const INSTRUCTIONS = `# Akiflow MCP - AI Instructions

You have access to Akiflow, a task and calendar management system.

## Key Concepts
- Tasks live in Inbox until scheduled
- Scheduling puts a task on calendar at specific date/time
- Projects (labels) organize tasks
- Events are calendar entries that sync two-way with external calendars (Google, etc.)

## Quick Reference

### Task Status
- 1 = Inbox, 2 = Planned, 4 = Snoozed, 7 = Someday, 10 = Scheduled

### Priority
- -1 = Goal, 1 = High, 2 = Medium, 3 = Low, null = None

### Date Filtering
- Most list tools accept date_from and date_to (YYYY-MM-DD) to filter by date range
- Example: get-events with date_from="2026-04-12" date_to="2026-04-12" returns today's events only

### Common Actions
- Add task: add-task with title (required)
- Schedule: schedule-task with id, date, optional datetime/duration
- Unschedule: unschedule-task with id (moves back to inbox)
- Complete: mark-done with id
- Update: edit-task with id and fields to change (use null to clear)
- Get events: get-events with optional calendar_id filter
- Edit events: edit-event with id and fields to change
- Add task to time slot: add-task-to-timeslot with task_id and time_slot_id
- Remove task from time slot: remove-task-from-timeslot with task_id

### Meeting Assistant
- get-recordings: List meeting recordings (transcripts, summaries, action items)
- get-recording: Get full recording detail by ID (summary, action items, transcript, brief)
- get-meeting-briefs: List pre-meeting research briefs
- get-meeting-brief: Get full brief detail by ID
- create-task-from-action-item: Create Akiflow task from a recording's action item

### Tips
- Duration is in minutes
- Use ISO 8601 for datetime (e.g. 2026-01-26T10:00:00.000Z)
- Get task IDs from get-tasks before editing
- Get project IDs from get-projects before assigning
- Events sync two-way with external calendars
`;

// Create server
const server = new Server(
  {
    name: "akiflow",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  },
);

// Tool schemas
const GetTasksSchema = z.object({
  done: z.boolean().optional().describe("Filter by completion status"),
  status: z
    .enum(["1", "2", "4", "7", "10"])
    .optional()
    .describe("1=Inbox, 2=Planned, 4=Snoozed, 7=Someday, 10=Scheduled"),
  date_from: z
    .string()
    .optional()
    .describe("Only tasks on or after this date (YYYY-MM-DD). Compares against task date/datetime."),
  date_to: z
    .string()
    .optional()
    .describe("Only tasks on or before this date (YYYY-MM-DD). Compares against task date/datetime."),
  listId: z.string().optional().describe("Filter by project UUID"),
  priority: z
    .string()
    .optional()
    .describe("Filter by priority: -1=goal, 1=high, 2=medium, 3=low"),
  limit: z.number().optional().describe("Max number of tasks to return"),
});

const GetEventsSchema = z.object({
  limit: z.number().optional().describe("Max events to return"),
  calendar_id: z.string().optional().describe("Filter by calendar ID"),
  date_from: z
    .string()
    .optional()
    .describe("Only events starting on or after this date (YYYY-MM-DD)"),
  date_to: z
    .string()
    .optional()
    .describe("Only events starting on or before this date (YYYY-MM-DD)"),
});

const AddTaskSchema = z.object({
  title: z.string().describe("Task title (required)"),
  description: z
    .string()
    .optional()
    .describe("Task description (supports HTML)"),
  date: z.string().optional().describe("Plan date (YYYY-MM-DD)"),
  datetime: z
    .string()
    .optional()
    .describe("Plan datetime (ISO 8601 with timezone)"),
  due_date: z.string().optional().describe("Due date / deadline (YYYY-MM-DD)"),
  duration: z.number().optional().describe("Duration in minutes"),
  priority: z
    .enum(["-1", "1", "2", "3"])
    .optional()
    .describe("-1=goal, 1=high, 2=medium, 3=low (omit for none)"),
  status: z
    .enum(["1", "2", "7", "10"])
    .optional()
    .describe("1=Inbox, 2=Planned, 7=Someday, 10=Scheduled"),
  listId: z
    .string()
    .optional()
    .describe("Project UUID (use get-projects to find)"),
  tags_ids: z
    .array(z.string())
    .optional()
    .describe("Array of tag UUIDs (use get-tags)"),
});

const EditTaskSchema = z.object({
  id: z.string().describe("Task UUID to edit"),
  title: z.string().optional(),
  description: z.string().nullable().optional(),
  date: z.string().nullable().optional(),
  datetime: z.string().nullable().optional(),
  due_date: z.string().nullable().optional(),
  duration: z.number().nullable().optional(),
  priority: z.enum(["-1", "1", "2", "3"]).nullable().optional(),
  status: z.enum(["1", "2", "4", "7", "10"]).optional(),
  done: z.boolean().optional(),
  listId: z.string().nullable().optional(),
  tags_ids: z.array(z.string()).nullable().optional(),
});

const MarkDoneSchema = z.object({
  id: z.string().describe("Task UUID to mark as done"),
});

const ScheduleTaskSchema = z.object({
  id: z.string().describe("Task UUID to schedule"),
  date: z.string().describe("Date to schedule (YYYY-MM-DD)"),
  datetime: z
    .string()
    .optional()
    .describe("Specific time (ISO 8601, e.g. 2026-01-26T10:00:00.000Z)"),
  duration: z.number().optional().describe("Duration in minutes (default: 30)"),
});

const UnscheduleTaskSchema = z.object({
  id: z.string().describe("Task UUID to unschedule"),
  to_inbox: z
    .boolean()
    .optional()
    .describe(
      "Move to inbox (status=1) instead of just removing time (default: true)",
    ),
});

const AddEventSchema = z.object({
  title: z.string().describe("Event title (required)"),
  calendar_id: z
    .string()
    .describe("Calendar UUID to create event in (use get-calendars to find)"),
  start_datetime: z.string().describe("Start time (ISO 8601)"),
  end_datetime: z.string().describe("End time (ISO 8601)"),
  description: z.string().optional().describe("Event description"),
  location: z.string().optional().describe("Event location"),
  all_day: z.boolean().optional().describe("All-day event (default: false)"),
});

const EditEventSchema = z.object({
  id: z.string().describe("Event UUID to edit"),
  title: z.string().optional(),
  description: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  start_datetime: z.string().optional().describe("Start time (ISO 8601)"),
  end_datetime: z.string().optional().describe("End time (ISO 8601)"),
  all_day: z.boolean().optional(),
});

const AddTimeSlotSchema = z.object({
  title: z.string().describe("Time slot title (required)"),
  calendar_id: z
    .string()
    .describe("Calendar UUID to create time slot in (use get-calendars)"),
  start_time: z.string().describe("Start time (ISO 8601)"),
  end_time: z.string().describe("End time (ISO 8601)"),
  label_id: z.string().optional().describe("Project/label UUID (optional)"),
});

const EditTimeSlotSchema = z.object({
  id: z.string().describe("Time slot UUID to edit"),
  title: z.string().optional(),
  start_time: z.string().optional().describe("Start time (ISO 8601)"),
  end_time: z.string().optional().describe("End time (ISO 8601)"),
  label_id: z.string().nullable().optional(),
});

const GetTimeSlotsSchema = z.object({
  limit: z.number().optional().describe("Max time slots to return"),
  date_from: z
    .string()
    .optional()
    .describe("Only time slots starting on or after this date (YYYY-MM-DD)"),
  date_to: z
    .string()
    .optional()
    .describe("Only time slots starting on or before this date (YYYY-MM-DD)"),
});

const AddTaskToTimeSlotSchema = z.object({
  task_id: z.string().describe("Task UUID to add to time slot"),
  time_slot_id: z.string().describe("Time slot UUID to add the task to"),
});

const RemoveTaskFromTimeSlotSchema = z.object({
  task_id: z.string().describe("Task UUID to remove from its time slot"),
});

const GetRecordingsSchema = z.object({
  date_from: z
    .string()
    .optional()
    .describe("Only recordings from on or after this date (YYYY-MM-DD)"),
  date_to: z
    .string()
    .optional()
    .describe("Only recordings from on or before this date (YYYY-MM-DD)"),
  limit: z.number().optional().describe("Max recordings to return"),
});

const GetRecordingSchema = z.object({
  id: z.string().describe("Recording UUID"),
});

const GetMeetingBriefsSchema = z.object({
  date_from: z
    .string()
    .optional()
    .describe("Only briefs on or after this date (YYYY-MM-DD)"),
  date_to: z
    .string()
    .optional()
    .describe("Only briefs on or before this date (YYYY-MM-DD)"),
  limit: z.number().optional().describe("Max briefs to return"),
});

const GetMeetingBriefSchema = z.object({
  id: z.string().describe("Meeting brief UUID"),
});

const CreateTaskFromActionItemSchema = z.object({
  recording_id: z.string().describe("Recording UUID"),
  action_item_id: z
    .string()
    .describe("Action item ID within the recording"),
});

// List resources
server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [
    {
      uri: "akiflow://instructions",
      name: "Akiflow Instructions",
      description: "How to use the Akiflow MCP tools",
      mimeType: "text/markdown",
    },
  ],
}));

// Read resource
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  if (uri === "akiflow://instructions") {
    return {
      contents: [
        {
          uri,
          mimeType: "text/markdown",
          text: INSTRUCTIONS,
        },
      ],
    };
  }

  throw new Error(`Unknown resource: ${uri}`);
});

// List tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "get-tasks",
      description:
        "Get tasks with optional filters. Returns active (non-deleted, non-trashed) tasks sorted by date.",
      inputSchema: {
        type: "object",
        properties: {
          done: {
            type: "boolean",
            description: "Filter by completion status (default: false)",
          },
          status: {
            type: "string",
            enum: ["1", "2", "4", "7", "10"],
            description:
              "1=Inbox, 2=Planned, 4=Snoozed, 7=Someday, 10=Scheduled",
          },
          date_from: {
            type: "string",
            description:
              "Only tasks on or after this date (YYYY-MM-DD). Compares against task date/datetime.",
          },
          date_to: {
            type: "string",
            description:
              "Only tasks on or before this date (YYYY-MM-DD). Compares against task date/datetime.",
          },
          listId: {
            type: "string",
            description: "Filter by project UUID",
          },
          priority: {
            type: "string",
            description: "Filter by priority: -1=goal, 1=high, 2=medium, 3=low",
          },
          limit: {
            type: "number",
            description: "Max tasks to return",
          },
        },
      },
    },
    {
      name: "get-events",
      description:
        "Get calendar events (v5 API). Returns detailed event data including attendees, location, recurrence.",
      inputSchema: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Max events to return",
          },
          calendar_id: {
            type: "string",
            description: "Filter by calendar ID",
          },
          date_from: {
            type: "string",
            description: "Only events starting on or after this date (YYYY-MM-DD)",
          },
          date_to: {
            type: "string",
            description: "Only events starting on or before this date (YYYY-MM-DD)",
          },
        },
      },
    },
    {
      name: "add-task",
      description: "Create a new task in Akiflow",
      inputSchema: {
        type: "object",
        properties: {
          title: { type: "string", description: "Task title (required)" },
          description: { type: "string", description: "Task description" },
          date: { type: "string", description: "Plan date (YYYY-MM-DD)" },
          datetime: { type: "string", description: "Plan datetime (ISO 8601)" },
          due_date: { type: "string", description: "Due date (YYYY-MM-DD)" },
          duration: { type: "number", description: "Duration in minutes" },
          priority: { type: "string", enum: ["-1", "1", "2", "3"] },
          status: { type: "string", enum: ["1", "2", "7", "10"] },
          listId: { type: "string", description: "Project UUID" },
          tags_ids: { type: "array", items: { type: "string" } },
        },
        required: ["title"],
      },
    },
    {
      name: "edit-task",
      description: "Update an existing task",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "Task UUID (required)" },
          title: { type: "string" },
          description: { type: "string" },
          date: { type: "string" },
          datetime: { type: "string" },
          due_date: { type: "string" },
          duration: { type: "number" },
          priority: { type: "string", enum: ["-1", "1", "2", "3"] },
          status: { type: "string", enum: ["1", "2", "4", "7", "10"] },
          done: { type: "boolean" },
          listId: { type: "string" },
          tags_ids: { type: "array", items: { type: "string" } },
        },
        required: ["id"],
      },
    },
    {
      name: "mark-done",
      description: "Mark a task as completed",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "Task UUID" },
        },
        required: ["id"],
      },
    },
    {
      name: "schedule-task",
      description: "Schedule a task on the calendar at a specific date/time",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "Task UUID" },
          date: { type: "string", description: "Date (YYYY-MM-DD)" },
          datetime: {
            type: "string",
            description:
              "Specific time (ISO 8601, e.g. 2026-01-26T10:00:00.000Z)",
          },
          duration: {
            type: "number",
            description: "Duration in minutes (default: 30)",
          },
        },
        required: ["id", "date"],
      },
    },
    {
      name: "unschedule-task",
      description:
        "Remove a task from the calendar and optionally move to inbox",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "Task UUID" },
          to_inbox: {
            type: "boolean",
            description: "Move to inbox (default: true)",
          },
        },
        required: ["id"],
      },
    },
    {
      name: "get-projects",
      description:
        "List all projects and folders. Note: Folders have type='folder', projects/labels have type=null",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "get-tags",
      description: "List all tags",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },

    {
      name: "get-calendars",
      description:
        "Get all calendars. Returns calendar metadata including colors, settings, and sync status.",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "add-event",
      description:
        "Create a new calendar event. Syncs to the source calendar (Google, etc.)",
      inputSchema: {
        type: "object",
        properties: {
          title: { type: "string", description: "Event title (required)" },
          calendar_id: {
            type: "string",
            description: "Calendar UUID (use get-calendars to find)",
          },
          start_datetime: {
            type: "string",
            description: "Start time (ISO 8601)",
          },
          end_datetime: { type: "string", description: "End time (ISO 8601)" },
          description: { type: "string", description: "Event description" },
          location: { type: "string", description: "Event location" },
          all_day: { type: "boolean", description: "All-day event" },
        },
        required: ["title", "calendar_id", "start_datetime", "end_datetime"],
      },
    },
    {
      name: "edit-event",
      description:
        "Edit a calendar event. Changes sync back to the source calendar (Google, etc.)",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "Event UUID" },
          title: { type: "string" },
          description: { type: ["string", "null"] },
          location: { type: ["string", "null"] },
          start_datetime: {
            type: "string",
            description: "Start time (ISO 8601)",
          },
          end_datetime: { type: "string", description: "End time (ISO 8601)" },
          all_day: { type: "boolean" },
        },
        required: ["id"],
      },
    },
    {
      name: "get-time-slots",
      description:
        "Get time slots (internal calendar blocks that don't sync to external calendars)",
      inputSchema: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Max time slots to return" },
          date_from: {
            type: "string",
            description:
              "Only time slots starting on or after this date (YYYY-MM-DD)",
          },
          date_to: {
            type: "string",
            description:
              "Only time slots starting on or before this date (YYYY-MM-DD)",
          },
        },
      },
    },
    {
      name: "add-time-slot",
      description:
        "Create a time slot (internal calendar block). Does not sync to external calendars.",
      inputSchema: {
        type: "object",
        properties: {
          title: { type: "string", description: "Time slot title (required)" },
          calendar_id: {
            type: "string",
            description: "Calendar UUID (use get-calendars)",
          },
          start_time: { type: "string", description: "Start time (ISO 8601)" },
          end_time: { type: "string", description: "End time (ISO 8601)" },
          label_id: { type: "string", description: "Project/label UUID" },
        },
        required: ["title", "calendar_id", "start_time", "end_time"],
      },
    },
    {
      name: "edit-time-slot",
      description: "Edit a time slot",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "Time slot UUID" },
          title: { type: "string" },
          start_time: { type: "string", description: "Start time (ISO 8601)" },
          end_time: { type: "string", description: "End time (ISO 8601)" },
          label_id: { type: ["string", "null"] },
        },
        required: ["id"],
      },
    },
    {
      name: "add-task-to-timeslot",
      description:
        "Add a task to a time slot. Links the task to an existing time slot block on the calendar.",
      inputSchema: {
        type: "object",
        properties: {
          task_id: { type: "string", description: "Task UUID to add" },
          time_slot_id: {
            type: "string",
            description: "Time slot UUID to add the task to",
          },
        },
        required: ["task_id", "time_slot_id"],
      },
    },
    {
      name: "remove-task-from-timeslot",
      description:
        "Remove a task from its time slot. Unlinks the task from its associated time slot block.",
      inputSchema: {
        type: "object",
        properties: {
          task_id: {
            type: "string",
            description: "Task UUID to remove from its time slot",
          },
        },
        required: ["task_id"],
      },
    },
    {
      name: "get-recordings",
      description:
        "List meeting recordings from Meeting Assistant. Each recording has a summary, action items, transcript, and brief.",
      inputSchema: {
        type: "object",
        properties: {
          date_from: {
            type: "string",
            description: "Only recordings from on or after this date (YYYY-MM-DD)",
          },
          date_to: {
            type: "string",
            description: "Only recordings from on or before this date (YYYY-MM-DD)",
          },
          limit: {
            type: "number",
            description: "Max recordings to return",
          },
        },
      },
    },
    {
      name: "get-recording",
      description:
        "Get full detail for a single meeting recording including summary, action items, raw transcript, and brief.",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "Recording UUID" },
        },
        required: ["id"],
      },
    },
    {
      name: "get-meeting-briefs",
      description:
        "List pre-meeting research briefs. Briefs provide background context and attendee info before meetings.",
      inputSchema: {
        type: "object",
        properties: {
          date_from: {
            type: "string",
            description: "Only briefs on or after this date (YYYY-MM-DD)",
          },
          date_to: {
            type: "string",
            description: "Only briefs on or before this date (YYYY-MM-DD)",
          },
          limit: {
            type: "number",
            description: "Max briefs to return",
          },
        },
      },
    },
    {
      name: "get-meeting-brief",
      description:
        "Get full detail for a single pre-meeting research brief by ID.",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "Meeting brief UUID" },
        },
        required: ["id"],
      },
    },
    {
      name: "create-task-from-action-item",
      description:
        "Create an Akiflow task from a meeting recording's action item. Bridges meeting action items into your task list.",
      inputSchema: {
        type: "object",
        properties: {
          recording_id: {
            type: "string",
            description: "Recording UUID",
          },
          action_item_id: {
            type: "string",
            description: "Action item ID within the recording",
          },
        },
        required: ["recording_id", "action_item_id"],
      },
    },
  ],
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    switch (name) {
      case "get-tasks": {
        const { done = false, status, date_from, date_to, listId, priority, limit } =
          GetTasksSchema.parse(args);
        const response = await client.getTasks();

        let tasks = response.data.filter(
          (t: Task) => t.deleted_at === null && t.trashed_at === null,
        );

        // Apply filters
        if (done !== undefined) {
          tasks = tasks.filter((t: Task) => t.done === done);
        }
        if (status) {
          tasks = tasks.filter((t: Task) => t.status === parseInt(status));
        }
        if (date_from) {
          tasks = tasks.filter((t: Task) => {
            const d = (t.date || t.datetime || t.due_date || "").substring(0, 10);
            return d >= date_from;
          });
        }
        if (date_to) {
          tasks = tasks.filter((t: Task) => {
            const d = (t.date || t.datetime || t.due_date || "").substring(0, 10);
            return d && d <= date_to;
          });
        }
        if (listId) {
          tasks = tasks.filter((t: Task) => t.listId === listId);
        }
        if (priority) {
          tasks = tasks.filter((t: Task) => t.priority === parseInt(priority));
        }

        // Sort by date
        tasks.sort((a: Task, b: Task) => {
          const dateA = a.date || a.datetime || a.due_date || "9999-12-31";
          const dateB = b.date || b.datetime || b.due_date || "9999-12-31";
          return dateA.localeCompare(dateB);
        });

        // Limit results
        if (limit) {
          tasks = tasks.slice(0, limit);
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(tasks, null, 2),
            },
          ],
        };
      }

      case "add-task": {
        const params = AddTaskSchema.parse(args);
        const task: Task = { title: params.title };

        if (params.description) task.description = params.description;
        if (params.date) {
          task.date = params.date;
          task.status = 2; // Auto-set to Planned
        }
        if (params.datetime) {
          task.datetime = params.datetime;
          task.status = 2;
        }
        if (params.due_date) task.due_date = params.due_date;
        if (params.duration) task.duration = params.duration * 60; // Convert to seconds
        if (params.priority) task.priority = parseInt(params.priority);
        if (params.status) task.status = parseInt(params.status);
        if (params.listId) task.listId = params.listId;
        if (params.tags_ids) task.tags_ids = params.tags_ids;

        // Default status to Inbox if not set
        if (!task.status) task.status = 1;

        const result = await client.createTask(task);
        const created = result[0];

        return {
          content: [
            {
              type: "text",
              text: `Task created: "${created?.title}" (ID: ${created?.id})`,
            },
          ],
        };
      }

      case "edit-task": {
        const params = EditTaskSchema.parse(args);
        const task: Task = { id: params.id };

        if (params.title) task.title = params.title;
        if (params.description !== undefined)
          task.description = params.description;
        if (params.date !== undefined) task.date = params.date;
        if (params.datetime !== undefined) task.datetime = params.datetime;
        if (params.due_date !== undefined) task.due_date = params.due_date;
        if (params.duration !== undefined)
          task.duration =
            params.duration === null ? null : params.duration * 60;
        if (params.priority !== undefined)
          task.priority =
            params.priority === null ? null : parseInt(params.priority);
        if (params.status !== undefined) task.status = parseInt(params.status);
        if (params.done !== undefined) task.done = params.done;
        if (params.listId !== undefined) task.listId = params.listId;
        if (params.tags_ids !== undefined) task.tags_ids = params.tags_ids;

        const result = await client.updateTask(task);

        return {
          content: [
            {
              type: "text",
              text: `Task updated: "${result[0]?.title}" (ID: ${params.id})`,
            },
          ],
        };
      }

      case "mark-done": {
        const { id } = MarkDoneSchema.parse(args);
        const result = await client.markTaskDone(id);

        return {
          content: [
            {
              type: "text",
              text: `Marked done: "${result[0]?.title}"`,
            },
          ],
        };
      }

      case "schedule-task": {
        const params = ScheduleTaskSchema.parse(args);
        const task: Task = {
          id: params.id,
          date: params.date,
          datetime: params.datetime || null,
          duration: (params.duration || 30) * 60, // Default 30 min, convert to seconds
          status: 2, // Planned
          global_updated_at: new Date().toISOString(),
        };

        const result = await client.updateTask(task);

        return {
          content: [
            {
              type: "text",
              text: `Scheduled: "${result[0]?.title}" on ${params.date}${params.datetime ? ` at ${params.datetime}` : ""}`,
            },
          ],
        };
      }

      case "unschedule-task": {
        const params = UnscheduleTaskSchema.parse(args);
        const toInbox = params.to_inbox !== false; // Default true

        const task: Task = {
          id: params.id,
          date: null,
          datetime: null,
          status: toInbox ? 1 : undefined, // Inbox if to_inbox
          global_updated_at: new Date().toISOString(),
        };

        const result = await client.updateTask(task);

        return {
          content: [
            {
              type: "text",
              text: `Unscheduled: "${result[0]?.title}"${toInbox ? " (moved to inbox)" : ""}`,
            },
          ],
        };
      }

      case "get-projects": {
        const response = await client.getProjects();
        const projects = response.data.filter((p) => p.deleted_at === null);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(projects, null, 2),
            },
          ],
        };
      }

      case "get-tags": {
        const response = await client.getTags();
        const tags = response.data.filter((t) => t.deleted_at === null);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(tags, null, 2),
            },
          ],
        };
      }

      case "get-events": {
        const { limit, calendar_id, date_from, date_to } =
          GetEventsSchema.parse(args);
        const response = await client.getEvents();

        let events = response.data.filter((e: Event) => e.deleted_at === null);

        // Filter by calendar
        if (calendar_id) {
          events = events.filter((e: Event) => e.calendar_id === calendar_id);
        }
        if (date_from) {
          events = events.filter((e: Event) => {
            const d = (e.start_datetime || e.start_date || "").substring(0, 10);
            return d >= date_from;
          });
        }
        if (date_to) {
          events = events.filter((e: Event) => {
            const d = (e.start_datetime || e.start_date || "").substring(0, 10);
            return d && d <= date_to;
          });
        }

        // Sort by start datetime
        events.sort((a: Event, b: Event) => {
          const dateA = a.start_datetime || a.start_date || "9999-12-31";
          const dateB = b.start_datetime || b.start_date || "9999-12-31";
          return dateA.localeCompare(dateB);
        });

        // Limit results
        if (limit) {
          events = events.slice(0, limit);
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(events, null, 2),
            },
          ],
        };
      }

      case "get-calendars": {
        const response = await client.getCalendars();
        const calendars = response.data;

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(calendars, null, 2),
            },
          ],
        };
      }

      case "add-event": {
        const params = AddEventSchema.parse(args);
        const result = await client.createEvent({
          title: params.title,
          calendar_id: params.calendar_id,
          start_datetime: params.start_datetime,
          end_datetime: params.end_datetime,
          description: params.description,
          location: params.location,
          all_day: params.all_day,
        });
        const created = result[0];

        return {
          content: [
            {
              type: "text",
              text: `Event created: "${created?.title}" (ID: ${created?.id})`,
            },
          ],
        };
      }

      case "edit-event": {
        const params = EditEventSchema.parse(args);
        const event: Partial<Event> = {
          id: params.id,
          global_updated_at: new Date().toISOString(),
        };

        if (params.title !== undefined) event.title = params.title;
        if (params.description !== undefined)
          event.description = params.description;
        if (params.location !== undefined) event.location = params.location;
        if (params.start_datetime !== undefined)
          event.start_datetime = params.start_datetime;
        if (params.end_datetime !== undefined)
          event.end_datetime = params.end_datetime;
        if (params.all_day !== undefined) event.all_day = params.all_day;

        const result = await client.updateEvent(event);

        return {
          content: [
            {
              type: "text",
              text: `Event updated: "${result[0]?.title}" (ID: ${params.id})`,
            },
          ],
        };
      }

      case "get-time-slots": {
        const { limit, date_from, date_to } = GetTimeSlotsSchema.parse(args);
        const response = await client.getTimeSlots();

        let slots = response.data.filter(
          (s: TimeSlot) => s.deleted_at === null,
        );

        if (date_from) {
          slots = slots.filter(
            (s: TimeSlot) => s.start_time.substring(0, 10) >= date_from,
          );
        }
        if (date_to) {
          slots = slots.filter(
            (s: TimeSlot) => s.start_time.substring(0, 10) <= date_to,
          );
        }

        // Sort by start time
        slots.sort((a: TimeSlot, b: TimeSlot) => {
          return a.start_time.localeCompare(b.start_time);
        });

        if (limit) {
          slots = slots.slice(0, limit);
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(slots, null, 2),
            },
          ],
        };
      }

      case "add-time-slot": {
        const params = AddTimeSlotSchema.parse(args);
        const result = await client.createTimeSlot({
          title: params.title,
          calendar_id: params.calendar_id,
          start_time: params.start_time,
          end_time: params.end_time,
          label_id: params.label_id,
        });
        const created = result[0];

        return {
          content: [
            {
              type: "text",
              text: `Time slot created: "${created?.title}" (ID: ${created?.id})`,
            },
          ],
        };
      }

      case "edit-time-slot": {
        const params = EditTimeSlotSchema.parse(args);
        const slot: Partial<TimeSlot> = {
          id: params.id,
          global_updated_at: new Date().toISOString(),
        };

        if (params.title !== undefined) slot.title = params.title;
        if (params.start_time !== undefined)
          slot.start_time = params.start_time;
        if (params.end_time !== undefined) slot.end_time = params.end_time;
        if (params.label_id !== undefined) slot.label_id = params.label_id;

        const result = await client.updateTimeSlot(slot);

        return {
          content: [
            {
              type: "text",
              text: `Time slot updated: "${result[0]?.title}" (ID: ${params.id})`,
            },
          ],
        };
      }

      case "add-task-to-timeslot": {
        const params = AddTaskToTimeSlotSchema.parse(args);
        const nowISO = new Date().toISOString();

        const task: Task = {
          id: params.task_id,
          time_slot_id: params.time_slot_id,
          global_updated_at: nowISO,
        };

        const result = await client.updateTask(task);

        return {
          content: [
            {
              type: "text",
              text: `Task "${result[0]?.title}" added to time slot (ID: ${params.time_slot_id})`,
            },
          ],
        };
      }

      case "remove-task-from-timeslot": {
        const params = RemoveTaskFromTimeSlotSchema.parse(args);
        const nowISO = new Date().toISOString();

        const task: Task = {
          id: params.task_id,
          time_slot_id: null,
          global_updated_at: nowISO,
        };

        const result = await client.updateTask(task);

        return {
          content: [
            {
              type: "text",
              text: `Task "${result[0]?.title}" removed from time slot`,
            },
          ],
        };
      }

      case "get-recordings": {
        const { limit, date_from, date_to } = GetRecordingsSchema.parse(args);
        let recordings = await client.getAllRecordings();

        recordings = recordings.filter(
          (r: Recording) => !r.trashedAt,
        );

        if (date_from) {
          recordings = recordings.filter((r: Recording) => {
            const d = (r.data?.startTime || r.createdAt || "").substring(0, 10);
            return d >= date_from;
          });
        }
        if (date_to) {
          recordings = recordings.filter((r: Recording) => {
            const d = (r.data?.startTime || r.createdAt || "").substring(0, 10);
            return d && d <= date_to;
          });
        }

        if (limit) {
          recordings = recordings.slice(0, limit);
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(recordings, null, 2),
            },
          ],
        };
      }

      case "get-recording": {
        const { id } = GetRecordingSchema.parse(args);
        const response = await client.getRecording(id);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        };
      }

      case "get-meeting-briefs": {
        const { limit, date_from, date_to } = GetMeetingBriefsSchema.parse(args);
        let briefs = await client.getAllMeetingBriefs();

        if (date_from) {
          briefs = briefs.filter((b: MeetingBrief) => {
            const d = (b.createdAt || "").substring(0, 10);
            return d >= date_from;
          });
        }
        if (date_to) {
          briefs = briefs.filter((b: MeetingBrief) => {
            const d = (b.createdAt || "").substring(0, 10);
            return d && d <= date_to;
          });
        }

        if (limit) {
          briefs = briefs.slice(0, limit);
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(briefs, null, 2),
            },
          ],
        };
      }

      case "get-meeting-brief": {
        const { id } = GetMeetingBriefSchema.parse(args);
        const response = await client.getMeetingBrief(id);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        };
      }

      case "create-task-from-action-item": {
        const { recording_id, action_item_id } =
          CreateTaskFromActionItemSchema.parse(args);
        const result = await client.createTaskFromActionItem(
          recording_id,
          action_item_id,
        );

        return {
          content: [
            {
              type: "text",
              text: `Task created from action item (recording: ${recording_id}, item: ${action_item_id})`,
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Akiflow MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
