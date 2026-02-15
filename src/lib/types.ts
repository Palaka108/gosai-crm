// Types matching the crm_* Supabase tables (Salesforce-style CRM model)

// ── Lead ────────────────────────────────────────────────────────
export type LeadStatus = "New" | "Working" | "Nurturing" | "Qualified" | "Disqualified";
export type SourceType = "Apollo" | "inbound" | "event" | "referral" | "cold" | "linkedin" | "website" | "other";

export interface CrmLead {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string | null;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  title: string | null;
  source: string | null;
  status: LeadStatus;
  owner: string | null;
  industry: string | null;
  company_size: string | null;
  region: string | null;
  linkedin_url: string | null;
  notes: string | null;
  converted_account_id: string | null;
  converted_contact_id: string | null;
  converted_opportunity_id: string | null;
  converted_at: string | null;
  created_at: string;
  updated_at: string;
}

// ── Account ─────────────────────────────────────────────────────
export type AccountType = "Prospect" | "Customer" | "Partner" | "Other";
export type AccountStage = "Prospecting" | "Active" | "Dormant";

export interface CrmAccount {
  id: string;
  user_id: string;
  name: string;
  website: string | null;
  industry: string | null;
  size: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  type: AccountType;
  region: string | null;
  stage: AccountStage;
  custom_fields: Record<string, unknown>;
  owner: string | null;
  notes_count: number;
  deals_count: number;
  created_at: string;
  updated_at: string;
}

// ── Contact ─────────────────────────────────────────────────────
export type ContactStatus = "lead" | "prospect" | "client" | "inactive" | "churned";

export interface CrmContact {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  account_id: string | null;
  title: string | null;
  source: string | null;
  status: ContactStatus;
  owner: string | null;
  avatar_url: string | null;
  linkedin_url: string | null;
  custom_fields: Record<string, unknown>;
  last_contacted_at: string | null;
  notes_count: number;
  deals_count: number;
  created_at: string;
  updated_at: string;
  // Joined
  crm_accounts?: CrmAccount | null;
}

// ── Opportunity ─────────────────────────────────────────────────
export type OpportunityStage =
  | "Prospecting"
  | "Qualification"
  | "Proposal/Quote"
  | "Negotiation/Review"
  | "Closed Won"
  | "Closed Lost";

export type OpportunityType = "New Business" | "Expansion" | "Renewal";

export interface CrmOpportunity {
  id: string;
  user_id: string;
  name: string;
  amount: number | null;
  currency: string;
  pipeline_id: string | null;
  stage: string;
  probability: number;
  contact_id: string | null;
  primary_contact_id: string | null;
  account_id: string | null;
  owner: string | null;
  close_date: string | null;
  source: string | null;
  type: string | null;
  next_step: string | null;
  proposal_notes: string | null;
  won_at: string | null;
  lost_at: string | null;
  lost_reason: string | null;
  custom_fields: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  // Joined
  crm_contacts?: CrmContact | null;
  crm_accounts?: CrmAccount | null;
}

// ── Pipeline ────────────────────────────────────────────────────
export interface CrmPipeline {
  id: string;
  user_id: string;
  name: string;
  stages: { order: number; name: string; probability: number }[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

// ── Activity ────────────────────────────────────────────────────
export type EntityType = "lead" | "account" | "contact" | "opportunity";
export type ActivityType =
  | "email"
  | "call"
  | "meeting"
  | "task"
  | "note"
  | "stage_change"
  | "status_change"
  | "created"
  | "updated"
  | "converted";

export interface CrmActivity {
  id: string;
  user_id: string;
  type: string;
  description: string | null;
  linked_type: EntityType;
  linked_id: string;
  who_id: string | null;
  what_id: string | null;
  metadata: Record<string, unknown>;
  scheduled_at: string | null;
  completed_at: string | null;
  owner: string | null;
  created_at: string;
}

// ── Task ────────────────────────────────────────────────────────
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled";

export interface CrmTask {
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

// ── Note ────────────────────────────────────────────────────────
export interface CrmNote {
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
