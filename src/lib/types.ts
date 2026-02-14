// Types matching the gosai_* Supabase tables

export type ContactStatus = "lead" | "prospect" | "client" | "inactive" | "churned";
export type DealStage = "New Lead" | "Qualified" | "Proposal Sent" | "Negotiation" | "Closed Won" | "Closed Lost";
export type ProjectStatus = "planning" | "active" | "on_hold" | "completed" | "cancelled";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled";
export type EntityType = "contact" | "company" | "deal" | "project";
export type ActivityType = "email" | "call" | "meeting" | "task" | "note" | "stage_change" | "status_change" | "created" | "updated";

export interface GosaiCompany {
  id: string;
  user_id: string;
  name: string;
  domain: string | null;
  industry: string | null;
  size: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  custom_fields: Record<string, unknown>;
  owner: string | null;
  notes_count: number;
  deals_count: number;
  created_at: string;
  updated_at: string;
}

export interface GosaiContact {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  company_id: string | null;
  title: string | null;
  source: string | null;
  status: ContactStatus;
  owner: string | null;
  avatar_url: string | null;
  custom_fields: Record<string, unknown>;
  last_contacted_at: string | null;
  notes_count: number;
  deals_count: number;
  created_at: string;
  updated_at: string;
  // Joined
  gosai_companies?: GosaiCompany | null;
}

export interface GosaiPipeline {
  id: string;
  user_id: string;
  name: string;
  stages: { order: number; name: string; probability: number }[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface GosaiDeal {
  id: string;
  user_id: string;
  title: string;
  value: number | null;
  currency: string;
  pipeline_id: string | null;
  stage: string;
  probability: number;
  contact_id: string | null;
  company_id: string | null;
  owner: string | null;
  close_date: string | null;
  won_at: string | null;
  lost_at: string | null;
  lost_reason: string | null;
  custom_fields: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  // Joined
  gosai_contacts?: GosaiContact | null;
  gosai_companies?: GosaiCompany | null;
}

export interface GosaiProject {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  client_contact_id: string | null;
  client_company_id: string | null;
  deal_id: string | null;
  status: ProjectStatus;
  start_date: string | null;
  end_date: string | null;
  budget: number | null;
  owner: string | null;
  custom_fields: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface GosaiNote {
  id: string;
  user_id: string;
  content: string;
  linked_type: EntityType;
  linked_id: string;
  author: string | null;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface GosaiActivity {
  id: string;
  user_id: string;
  type: string;
  description: string | null;
  linked_type: EntityType;
  linked_id: string;
  metadata: Record<string, unknown>;
  scheduled_at: string | null;
  completed_at: string | null;
  owner: string | null;
  created_at: string;
}

export interface GosaiTask {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  linked_type: EntityType | null;
  linked_id: string | null;
  due_date: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  assigned_to: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}
