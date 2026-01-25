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
  doc?: TaskDoc;
  calendar_id?: string | null;
  time_slot_id?: string | null;
  links?: TaskLink[];
  content?: TaskContent;
  trashed_at?: string | null;
  plan_unit?: string | null;
  plan_period?: string | null;
  global_list_id_updated_at?: string;
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

export class AkiflowClient {
  private refreshToken: string;
  private accessToken: string = "";
  private tokenPromise: Promise<void> | null = null;

  private readonly TASKS_URL = "https://api.akiflow.com/v5/tasks";
  private readonly PROJECTS_URL = "https://api.akiflow.com/v5/labels";
  private readonly TAGS_URL = "https://api.akiflow.com/v5/tags";
  private readonly EVENTS_URL = "https://api.akiflow.com/v5/events";
  private readonly CALENDARS_URL = "https://api.akiflow.com/v5/calendars";
  private readonly TOKEN_URL = "https://web.akiflow.com/oauth/refreshToken";

  private headers = {
    "Akiflow-Platform": "mac",
    Authorization: "",
    Referer:
      "https://web.akiflow.com/app/stable/29a83ee24d87ff96/static/js/801.chunk.js",
    "Akiflow-Client-Id": "b4edaac3-5dc7-4b20-bf58-de51efc2bec4",
    "Akiflow-Version": "2.66.3",
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
   * Create a new task
   */
  async createTask(task: Task): Promise<Task> {
    if (!task.title) {
      throw new Error("'title' is required for creating a task");
    }
    this.validateTask(task);
    return this.request("POST", this.TASKS_URL, task);
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
}
