/**
 * Akiflow API Client
 * Adapted from Raycast extension by @shrimpwtf
 */

import axios, { AxiosResponse } from "axios";

export interface TaskDoc {
  parent_task_id?: string | null;
  parent_task_name?: string | null;
  team_id?: string;
  team_name?: string;
  space_id?: string;
  space_name?: string;
  folder_id?: string | null;
  folder_name?: string | null;
  list_id?: string;
  list_name?: string;
  url?: string;
  local_url?: string;
  created_at?: string;
  updated_at?: string;
  hash?: string;
  identifier?: string;
  title?: string;
  status?: string;
  priority_label?: string;
  project_id?: string;
  project_name?: string;
  assignee_id?: string;
  assignee_name?: string;
  labels?: string[];
  due_at?: string;
  mutable_id?: string;
}

export interface TaskContent {
  preventAutoCalendarLock?: boolean;
  aiListId?: string | null;
  aiListIdPredictedAt?: number;
  aiMethod?: number | null;
  shouldMarkAsDoneRemote?: boolean;
}

export interface TaskLink {
  url?: string;
  title?: string;
}

export interface Task {
  id?: string;
  user_id?: number;
  recurring_id?: string | null;
  title?: string;
  description?: string | null;
  date?: string | null; // YYYY-MM-DD
  datetime?: string | null; // ISO 8601 with timezone
  datetime_tz?: string; // Timezone identifier
  original_date?: string | null;
  original_datetime?: string | null;
  duration?: number | null; // Seconds
  recurrence?: string | null;
  recurrence_version?: string | null;
  status?: number; // 1=Inbox, 2=Planned, 4=Snoozed, 7=Someday, 10=Scheduled
  priority?: number | null; // -1=goal, 1=high, 2=medium, 3=low, null=none
  dailyGoal?: number | null;
  done?: boolean;
  done_at?: string | null;
  read_at?: string | null;
  listId?: string | null; // Project UUID
  section_id?: string | null;
  tags_ids?: string[] | null; // Tag UUIDs
  sorting?: number;
  sorting_label?: number | null;
  origin?: string | null;
  due_date?: string | null; // YYYY-MM-DD
  connector_id?: string | null;
  origin_id?: string | null;
  origin_account_id?: string | null;
  akiflow_account_id?: string | null;
  doc?: TaskDoc | null;
  calendar_id?: string | null;
  time_slot_id?: string | null;
  links?: TaskLink[];
  content?: TaskContent | null;
  trashed_at?: string | null;
  plan_unit?: string | null;
  plan_period?: string | null;
  search_text?: string;
  global_list_id_updated_at?: string | null;
  global_tags_ids_updated_at?: string | null;
  global_created_at?: string;
  global_updated_at?: string;
  data?: Record<string, unknown>;
  deleted_at?: string | null;
}

export interface Project {
  id: string;
  user_id: number;
  parent_id: string | null;
  title: string | null;
  icon: string | null;
  color: string | null;
  sorting: number | null;
  type: "folder" | null; // "folder" = folder, null = project/label
  global_created_at: string;
  global_updated_at: string;
  data: Record<string, unknown>;
  deleted_at: string | null;
}

export interface Tag {
  id: string;
  user_id: number;
  title: string;
  sorting: number;
  global_created_at: string;
  global_updated_at: string;
  data: Record<string, unknown>;
  deleted_at: string | null;
}

// Calendar types (from /v5/calendars)
export interface CalendarContent {
  colorId: string;
  freeBusy: boolean;
  backgroundColor: string;
  foregroundColor: string;
}

export interface CalendarSettings {
  visible?: boolean;
  notificationsEnabled?: boolean;
  visibleMobile?: boolean;
  notificationsEnabledMobile?: boolean;
}

export interface CalendarFingerprints {
  colorId: string;
  backgroundColor: string;
  foregroundColor: string;
}

export interface Calendar {
  id: string;
  user_id: number;
  origin_id: string;
  connector_id: string;
  akiflow_account_id: string;
  origin_account_id: string;
  etag: string;
  title: string;
  description: string | null;
  content: CalendarContent;
  primary: boolean;
  akiflow_primary: boolean;
  read_only: boolean;
  url: string;
  color: string;
  icon: unknown;
  sync_status: unknown;
  settings: CalendarSettings;
  webhook_id: string | null;
  webhook_resource_id: string | null;
  global_updated_at: string;
  global_created_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: unknown;
  timezone: string;
  last_synced_at: string | null;
  webhook_updated_at: string | null;
  sync_token: string | null;
  fingerprints: CalendarFingerprints;
  hidden_at: unknown;
  clear_job_id: unknown;
  stored_visible_any: boolean;
  data: string;
  change_id: number;
}

// Time Slot types (from /v5/time_slots)
export interface TimeSlot {
  id: string;
  user_id?: number;
  recurring_id?: string | null;
  calendar_id: string;
  label_id?: string | null;
  section_id?: string | null;
  status?: string;
  title: string;
  description?: string | null;
  original_start_time?: string | null;
  start_time: string;
  end_time: string;
  start_datetime_tz?: string;
  recurrence?: string | null;
  color?: string | null;
  content?: Record<string, unknown>;
  global_label_id_updated_at?: string | null;
  global_created_at?: string;
  global_updated_at?: string;
  data?: Record<string, unknown>;
  deleted_at?: string | null;
}

// V5 Event types (from /v5/events)
export interface EventAttendee {
  email: string;
  name?: string;
  response_status?: string;
  self?: boolean;
  organizer?: boolean;
}

export interface EventRecurrence {
  rule?: string;
  exceptions?: string[];
}

export interface Event {
  id: string;
  user_id: number;
  calendar_id: string;
  origin_id: string;
  connector_id: string;
  akiflow_account_id: string;
  origin_account_id: string;
  etag?: string;
  title: string;
  description: string | null;
  location?: string | null;
  start_datetime: string;
  end_datetime: string;
  start_date?: string | null;
  end_date?: string | null;
  timezone?: string;
  all_day: boolean;
  status?: string;
  visibility?: string;
  busy?: boolean;
  recurring_id?: string | null;
  recurrence?: EventRecurrence | null;
  attendees?: EventAttendee[];
  organizer?: EventAttendee;
  html_link?: string;
  content?: Record<string, unknown>;
  global_created_at: string;
  global_updated_at: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  change_id?: number;
}

// Recording types (from aki.akiflow.com/api/v1/recordings)
export interface TranscriptTimestamp {
  absolute: string;
  relative: number;
}

export interface TranscriptEntry {
  duration: number;
  paragraph: string;
  speakerId: string;
  speakerName: string;
  startTimestamp: TranscriptTimestamp;
  endTimestamp: TranscriptTimestamp;
}

export interface ActionItem {
  id: string;
  title: string;
  dueDate?: string | null;
}

export interface RecordingData {
  title: string;
  startTime: string;
  endTime: string;
  summary?: string | null;
  transcript?: TranscriptEntry[];
  actionItems?: ActionItem[];
}

export interface FeedItem {
  id: string;
  userId: number;
  referenceType: string;
  referenceId: string;
  contentUpdatedAt: string;
  readAt: string | null;
  archiveAt: string;
  clearAt: string;
  lifecycleRules?: Record<string, unknown>;
  version: number;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  etag: string;
}

export interface Recording {
  id: string;
  userId: number;
  recallEventId: string;
  originEventId: string;
  akiflowAccountId: string;
  botId: string;
  data: RecordingData;
  duration: number;
  trashedAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  etag: string;
  feedItem: FeedItem;
}

// Meeting Brief / Research types (from aki.akiflow.com/api/v1/researches)
export interface MeetingBrief {
  id: string;
  userId?: number;
  originEventId?: string;
  akiflowAccountId?: string;
  data?: Record<string, unknown>;
  feedItem?: FeedItem;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  etag?: string;
}

// Paginated response wrapper for aki.akiflow.com endpoints
export interface AkiPaginatedResponse<T> {
  data: T[];
  next_cursor?: string | null;
}

export class AkiflowClient {
  private refreshToken: string;
  private accessToken: string = "";
  private tokenPromise: Promise<void> | null = null;

  private readonly TASKS_URL = "https://api.akiflow.com/v5/tasks";
  private readonly PROJECTS_URL = "https://api.akiflow.com/v5/labels";
  private readonly TAGS_URL = "https://api.akiflow.com/v5/tags";
  private readonly EVENTS_URL = "https://api.akiflow.com/v5/events";
  private readonly CALENDARS_URL = "https://api.akiflow.com/v5/calendars";
  private readonly TIME_SLOTS_URL = "https://api.akiflow.com/v5/time_slots";
  private readonly AKI_API_URL = "https://aki.akiflow.com/api/v1";
  private readonly TOKEN_URL = "https://web.akiflow.com/oauth/refreshToken";

  private headers = {
    "Akiflow-Platform": "mac",
    Authorization: "",
    Referer:
      "https://web.akiflow.com/app/stable/29a83ee24d87ff96/static/js/801.chunk.js",
    "Akiflow-Client-Id": "b4edaac3-5dc7-4b20-bf58-de51efc2bec4",
    "Akiflow-Version": "2.71.5",
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36",
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  public projects: Record<string, Project> = {};
  public tags: Record<string, Tag> = {};

  constructor(refreshToken: string) {
    this.refreshToken = refreshToken;
  }

  /**
   * Get access token from refresh token
   */
  private async getAccessToken(): Promise<string> {
    const response = await axios.post(
      this.TOKEN_URL,
      {
        client_id: "10",
        refresh_token: this.refreshToken,
      },
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      },
    );

    if (response.status === 200 && response.data.access_token) {
      return response.data.access_token;
    }

    throw new Error(`Failed to get access token: ${response.status}`);
  }

  /**
   * Ensure we have a valid access token
   */
  private async ensureToken(): Promise<void> {
    if (!this.tokenPromise) {
      this.tokenPromise = (async () => {
        this.accessToken = await this.getAccessToken();
        this.headers.Authorization = `Bearer ${this.accessToken}`;
      })();
    }
    await this.tokenPromise;
  }

  /**
   * Make authenticated API request with auto-retry on 401
   */
  private async request<T = any>(
    method: string,
    url: string,
    data?: any,
  ): Promise<T> {
    await this.ensureToken();

    try {
      const response: AxiosResponse<T> = await axios.request({
        method,
        url,
        headers: this.headers,
        data,
      });
      return response.data;
    } catch (error: any) {
      // Token expired, refresh and retry once
      if (error.response?.status === 401) {
        this.tokenPromise = null;
        await this.ensureToken();

        const response: AxiosResponse<T> = await axios.request({
          method,
          url,
          headers: this.headers,
          data,
        });
        return response.data;
      }
      throw error;
    }
  }

  /**
   * Validate task parameters
   */
  private validateTask(task: Task): void {
    if (
      task.priority !== undefined &&
      task.priority !== null &&
      ![-1, 1, 2, 3].includes(task.priority)
    ) {
      throw new Error(
        `Invalid priority: ${task.priority}. Valid: -1 (goal), 1 (high), 2 (medium), 3 (low), null (none)`,
      );
    }

    if (task.status !== undefined && ![1, 2, 4, 7, 10].includes(task.status)) {
      throw new Error(
        `Invalid status: ${task.status}. Valid: 1 (Inbox), 2 (Planned), 4 (Snoozed), 7 (Someday), 10 (Scheduled)`,
      );
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (task.date && !dateRegex.test(task.date)) {
      throw new Error(
        `Invalid date format: ${task.date}. Expected: YYYY-MM-DD`,
      );
    }

    if (task.due_date && !dateRegex.test(task.due_date)) {
      throw new Error(
        `Invalid due_date format: ${task.due_date}. Expected: YYYY-MM-DD`,
      );
    }
  }

  /**
   * Get all tasks
   */
  async getTasks(): Promise<{ data: Task[] }> {
    return this.request("GET", `${this.TASKS_URL}?limit=2500`);
  }

  /**
   * Create a new task (uses PATCH with client-side generated UUID)
   */
  async createTask(task: Task): Promise<Task[]> {
    if (!task.title) {
      throw new Error("'title' is required for creating a task");
    }
    this.validateTask(task);

    const now = new Date();
    const nowISO = now.toISOString();
    const sorting = now.getTime();

    const newTask: Task = {
      id: crypto.randomUUID(),
      status: task.status ?? 1,
      title: task.title,
      sorting,
      sorting_label: sorting,
      duration: task.duration ?? 0,
      date: task.date ?? null,
      datetime: task.datetime ?? null,
      plan_unit: null,
      plan_period: null,
      tags_ids: task.tags_ids ?? null,
      time_slot_id: null,
      links: [],
      done: false,
      done_at: null,
      datetime_tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      data: {},
      original_date: null,
      original_datetime: null,
      recurring_id: null,
      recurrence: null,
      search_text: "",
      due_date: task.due_date ?? null,
      calendar_id: null,
      recurrence_version: null,
      content: null,
      origin: null,
      connector_id: null,
      origin_id: null,
      origin_account_id: null,
      doc: null,
      trashed_at: null,
      global_created_at: nowISO,
      deleted_at: null,
      global_updated_at: nowISO,
      global_list_id_updated_at: null,
      global_tags_ids_updated_at: null,
      // Optional fields from input
      ...(task.description && { description: task.description }),
      ...(task.priority !== undefined && { priority: task.priority }),
      ...(task.listId && { listId: task.listId }),
    };

    return this.request("PATCH", this.TASKS_URL, [newTask]);
  }

  /**
   * Update existing task(s)
   */
  async updateTasks(tasks: Task[]): Promise<Task[]> {
    for (const task of tasks) {
      if (!task.id) {
        throw new Error("'id' is required for updating a task");
      }
      this.validateTask(task);
    }
    return this.request("PATCH", this.TASKS_URL, tasks);
  }

  /**
   * Update a single task
   */
  async updateTask(task: Task): Promise<Task[]> {
    return this.updateTasks([task]);
  }

  /**
   * Mark task as done
   */
  async markTaskDone(taskId: string): Promise<Task[]> {
    const now = new Date().toISOString();
    return this.updateTask({
      id: taskId,
      done: true,
      done_at: now,
      global_updated_at: now,
    });
  }

  /**
   * Get all projects (labels)
   */
  async getProjects(): Promise<{ data: Project[] }> {
    const response = await this.request<{ data: Project[] }>(
      "GET",
      `${this.PROJECTS_URL}?limit=2500`,
    );

    // Build projects cache
    this.projects = {};
    for (const project of response.data) {
      if (project.deleted_at === null) {
        this.projects[project.id] = project;
      }
    }

    return response;
  }

  /**
   * Get all tags
   */
  async getTags(): Promise<{ data: Tag[] }> {
    const response = await this.request<{ data: Tag[] }>(
      "GET",
      `${this.TAGS_URL}?limit=2500`,
    );

    // Build tags cache
    this.tags = {};
    for (const tag of response.data) {
      if (tag.deleted_at === null) {
        this.tags[tag.id] = tag;
      }
    }

    return response;
  }

  /**
   * Get calendar events (v5)
   */
  async getEvents(): Promise<{ data: Event[] }> {
    return this.request("GET", `${this.EVENTS_URL}?per_page=2500`);
  }

  /**
   * Create a new event (uses PATCH with client-side generated UUID)
   */
  async createEvent(event: {
    title: string;
    calendar_id: string;
    start_datetime: string;
    end_datetime: string;
    description?: string | null;
    location?: string | null;
    all_day?: boolean;
    attendees?: EventAttendee[] | null;
  }): Promise<Event[]> {
    if (!event.title) {
      throw new Error("'title' is required for creating an event");
    }
    if (!event.calendar_id) {
      throw new Error("'calendar_id' is required for creating an event");
    }
    if (!event.start_datetime) {
      throw new Error("'start_datetime' is required for creating an event");
    }
    if (!event.end_datetime) {
      throw new Error("'end_datetime' is required for creating an event");
    }

    const nowISO = new Date().toISOString();
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const newEvent = {
      id: crypto.randomUUID(),
      origin_id: null,
      custom_origin_id: null,
      connector_id: "google",
      akiflow_account_id: null,
      origin_account_id: null,
      recurring_id: null,
      origin_recurring_id: null,
      calendar_id: event.calendar_id,
      origin_calendar_id: null,
      creator_id: null,
      organizer_id: null,
      original_start_time: null,
      original_start_date: null,
      start_time: event.start_datetime,
      end_time: event.end_datetime,
      start_date: event.all_day ? event.start_datetime.split("T")[0] : null,
      end_date: event.all_day ? event.end_datetime.split("T")[0] : null,
      start_datetime_tz: timezone,
      end_datetime_tz: null,
      origin_updated_at: null,
      etag: null,
      title: event.title,
      description: event.description ?? null,
      content: { sendUpdates: "all" },
      attendees: event.attendees ?? null,
      recurrence: null,
      recurrence_exception: false,
      declined: false,
      read_only: false,
      hidden: false,
      url: null,
      meeting_status: null,
      meeting_url: null,
      meeting_icon: null,
      meeting_solution: null,
      color: null,
      calendar_color: null,
      task_id: null,
      time_slot_id: null,
      status: "confirmed",
      recurrence_exception_delete: false,
      deleted_at: null,
      global_updated_at: nowISO,
      global_created_at: nowISO,
      ...(event.location && { location: event.location }),
    };

    return this.request("PATCH", this.EVENTS_URL, [newEvent]);
  }

  /**
   * Update event(s)
   */
  async updateEvents(events: Partial<Event>[]): Promise<Event[]> {
    for (const event of events) {
      if (!event.id) {
        throw new Error("'id' is required for updating an event");
      }
    }
    return this.request("PATCH", this.EVENTS_URL, events);
  }

  /**
   * Update a single event
   */
  async updateEvent(event: Partial<Event>): Promise<Event[]> {
    return this.updateEvents([event]);
  }

  /**
   * Get calendars
   */
  async getCalendars(): Promise<{ data: Calendar[] }> {
    return this.request(
      "GET",
      `${this.CALENDARS_URL}?per_page=2500&with_deleted=false`,
    );
  }

  /**
   * Get time slots
   */
  async getTimeSlots(): Promise<{ data: TimeSlot[] }> {
    return this.request("GET", `${this.TIME_SLOTS_URL}?limit=2500`);
  }

  /**
   * Create a new time slot (uses PATCH with client-side generated UUID)
   */
  async createTimeSlot(slot: {
    title: string;
    calendar_id: string;
    start_time: string;
    end_time: string;
    label_id?: string | null;
  }): Promise<TimeSlot[]> {
    if (!slot.title) {
      throw new Error("'title' is required for creating a time slot");
    }
    if (!slot.calendar_id) {
      throw new Error("'calendar_id' is required for creating a time slot");
    }
    if (!slot.start_time) {
      throw new Error("'start_time' is required for creating a time slot");
    }
    if (!slot.end_time) {
      throw new Error("'end_time' is required for creating a time slot");
    }

    const nowISO = new Date().toISOString();
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const newSlot = {
      id: crypto.randomUUID(),
      title: slot.title,
      start_time: slot.start_time,
      end_time: slot.end_time,
      calendar_id: slot.calendar_id,
      start_datetime_tz: timezone,
      status: "confirmed",
      data: {},
      recurring_id: null,
      label_id: slot.label_id ?? null,
      section_id: null,
      recurrence: null,
      global_created_at: nowISO,
      deleted_at: null,
      global_updated_at: nowISO,
      global_label_id_updated_at: null,
    };

    return this.request("PATCH", this.TIME_SLOTS_URL, [newSlot]);
  }

  /**
   * Update time slot(s)
   */
  async updateTimeSlots(slots: Partial<TimeSlot>[]): Promise<TimeSlot[]> {
    for (const slot of slots) {
      if (!slot.id) {
        throw new Error("'id' is required for updating a time slot");
      }
    }
    return this.request("PATCH", this.TIME_SLOTS_URL, slots);
  }

  /**
   * Update a single time slot
   */
  async updateTimeSlot(slot: Partial<TimeSlot>): Promise<TimeSlot[]> {
    return this.updateTimeSlots([slot]);
  }

  async getRecordings(
    cursor?: string,
    perPage: number = 100,
  ): Promise<AkiPaginatedResponse<Recording>> {
    const params = new URLSearchParams({ per_page: String(perPage) });
    if (cursor) params.set("cursor", cursor);
    return this.request(
      "GET",
      `${this.AKI_API_URL}/recordings?${params.toString()}`,
    );
  }

  async getAllRecordings(): Promise<Recording[]> {
    const all: Recording[] = [];
    let cursor: string | undefined;
    const seen = new Set<string>();

    for (;;) {
      const response = await this.getRecordings(cursor);
      const items = response.data ?? [];
      all.push(...items);

      cursor = response.next_cursor ?? undefined;
      if (!cursor || seen.has(cursor)) break;
      seen.add(cursor);
    }

    return all;
  }

  async getRecording(id: string): Promise<{ data: Recording }> {
    return this.request("GET", `${this.AKI_API_URL}/recordings/${id}`);
  }

  async getRecordingAudio(id: string): Promise<ArrayBuffer> {
    await this.ensureToken();
    const response = await (await import("axios")).default.get(
      `${this.AKI_API_URL}/recordings/audio/${id}`,
      { headers: this.headers, responseType: "arraybuffer" },
    );
    return response.data;
  }

  async createTaskFromActionItem(
    recordingId: string,
    actionItemId: string,
  ): Promise<unknown> {
    return this.request(
      "POST",
      `${this.AKI_API_URL}/recordings/createTaskFromActionItem/${recordingId}/${actionItemId}`,
    );
  }

  async generateFollowupEmail(
    recordingId: string,
    data?: Record<string, unknown>,
  ): Promise<unknown> {
    return this.request(
      "POST",
      `${this.AKI_API_URL}/recordings/generateFollowupEmail/${recordingId}`,
      data,
    );
  }

  async getMeetingBriefs(
    cursor?: string,
    perPage: number = 100,
  ): Promise<AkiPaginatedResponse<MeetingBrief>> {
    const params = new URLSearchParams({ per_page: String(perPage) });
    if (cursor) params.set("cursor", cursor);
    return this.request(
      "GET",
      `${this.AKI_API_URL}/researches?${params.toString()}`,
    );
  }

  async getAllMeetingBriefs(): Promise<MeetingBrief[]> {
    const all: MeetingBrief[] = [];
    let cursor: string | undefined;
    const seen = new Set<string>();

    for (;;) {
      const response = await this.getMeetingBriefs(cursor);
      const items = response.data ?? [];
      all.push(...items);

      cursor = response.next_cursor ?? undefined;
      if (!cursor || seen.has(cursor)) break;
      seen.add(cursor);
    }

    return all;
  }

  async getMeetingBrief(id: string): Promise<{ data: MeetingBrief }> {
    return this.request("GET", `${this.AKI_API_URL}/researches/${id}`);
  }
}
