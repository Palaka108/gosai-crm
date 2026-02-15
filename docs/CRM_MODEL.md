# GOSAI CRM — Data Model & Flows

## Entity Overview

The CRM follows a Salesforce-style outbound sales model with four primary entities:

```
Lead → (Convert) → Account + Contact + Opportunity
```

### Entities

| Entity | Table | Description |
|--------|-------|-------------|
| Lead | `crm_leads` | Unqualified prospect, pre-conversion |
| Account | `crm_accounts` | Company/organization |
| Contact | `crm_contacts` | Person at an account |
| Opportunity | `crm_opportunities` | Deal being tracked through pipeline |
| Activity | `crm_activities` | Logged actions (emails, calls, updates) |
| Task | `crm_tasks` | To-do items with priority and due dates |
| Note | `crm_notes` | Free-text notes on any entity |
| Pipeline | `crm_pipelines` | Configurable stage definitions |

---

## Lead (`crm_leads`)

**Statuses:** New, Working, Nurturing, Qualified, Disqualified

| Field | Type | Description |
|-------|------|-------------|
| first_name | text | Required |
| last_name | text | |
| company_name | text | Pre-conversion company |
| email | text | |
| phone | text | |
| title | text | Job title |
| source | text | Apollo, inbound, referral, etc. |
| status | text | Lead lifecycle stage |
| industry | text | |
| company_size | text | |
| region | text | Assembled from city/state/country |
| linkedin_url | text | |
| notes | text | |
| converted_account_id | uuid | Set on conversion |
| converted_contact_id | uuid | Set on conversion |
| converted_opportunity_id | uuid | Set on conversion |
| converted_at | timestamptz | Set on conversion |

---

## Account (`crm_accounts`)

**Types:** Prospect, Customer, Partner, Other
**Stages:** Prospecting, Active, Dormant

| Field | Type | Description |
|-------|------|-------------|
| name | text | Required |
| website | text | |
| industry | text | |
| size | text | Company size |
| phone | text | |
| email | text | |
| address | text | |
| type | text | Account classification |
| stage | text | Account lifecycle |
| region | text | |

---

## Contact (`crm_contacts`)

**Statuses:** lead, prospect, client, inactive, churned

| Field | Type | Description |
|-------|------|-------------|
| first_name | text | Required |
| last_name | text | |
| email | text | |
| phone | text | |
| account_id | uuid | FK to crm_accounts |
| title | text | Job title |
| source | text | |
| status | text | Contact lifecycle |
| linkedin_url | text | |

---

## Opportunity (`crm_opportunities`)

**Stages:** Prospecting, Qualification, Proposal/Quote, Negotiation/Review, Closed Won, Closed Lost
**Types:** New Business, Expansion, Renewal

| Field | Type | Description |
|-------|------|-------------|
| name | text | Required |
| amount | numeric | Deal value |
| currency | text | Default USD |
| stage | text | Pipeline stage |
| probability | integer | Win probability % |
| contact_id | uuid | FK to crm_contacts |
| primary_contact_id | uuid | FK to crm_contacts |
| account_id | uuid | FK to crm_accounts |
| source | text | |
| type | text | Business type |
| next_step | text | |
| close_date | date | Expected close |
| proposal_notes | text | Free-text proposal details |
| custom_fields | jsonb | Contains questionnaire answers |
| won_at | timestamptz | Set when moved to Closed Won |
| lost_at | timestamptz | Set when moved to Closed Lost |
| lost_reason | text | |

### Discovery Questionnaire

Stored in `custom_fields.questionnaire` as a JSON object with keys:
- `budget` — Budget range
- `timeline` — When they need a solution
- `decision_maker` — Who makes the final decision
- `pain_points` — Problems they're trying to solve
- `current_solution` — What they use today
- `requirements` — Key must-haves

---

## Relationships

```
Account 1──* Contact
Account 1──* Opportunity
Contact 1──* Opportunity
Lead ──convert──> Account + Contact + Opportunity
```

---

## Apollo CSV Import Flow

1. User uploads CSV on `/import` page
2. PapaParse parses with header detection
3. Columns auto-mapped to lead fields:
   - First Name, Last Name, Title, Company, Email, Phone
   - LinkedIn Url, Industry, # Employees, City/State/Country
4. Preview first 5 rows with column mapping display
5. Duplicate check by email against existing leads
6. Batch insert (chunks of 50) into `crm_leads` with:
   - `source = "Apollo"`
   - `status = "New"`
   - `region` assembled from City + State + Country
7. Activity logged for the import event

---

## Lead Conversion Flow

1. On Lead detail page, click "Convert Lead"
2. Modal pre-fills:
   - Account name from lead's `company_name`
   - Contact from lead's name/email/phone/title
3. Optional: create Opportunity with stage "Prospecting"
4. On confirm:
   - Creates `crm_accounts` record
   - Creates `crm_contacts` record (linked to new account)
   - Optionally creates `crm_opportunities` record
   - Updates lead: `status = "Qualified"`, sets `converted_*` fields and `converted_at`
   - Logs conversion activity

---

## Dashboard Charts

- **Pipeline by Stage** — Bar chart showing $ amount per stage
- **Opportunities by Stage** — Donut chart showing count per stage
- **Leads by Source** — Horizontal bar chart
- **Leads by Status** — Donut chart

Charts use the Pesto Tech palette:
- Primary green: `#2F6F5E`
- Accent green: `#3A7D6A`
- Link blue: `#2563EB`
- Warning amber: `#F59E0B`
- Error red: `#EF4444`
- Purple: `#8B5CF6`
- Success green: `#22C55E`

---

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, TailwindCSS
- **Backend:** Supabase (Postgres + Auth + RLS)
- **State:** React Query (TanStack)
- **Charts:** Recharts
- **CSV Parsing:** PapaParse
- **Icons:** Lucide React
- **Notifications:** Sonner
