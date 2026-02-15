import { useState, useRef, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import Papa from "papaparse";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, X, ArrowRight } from "lucide-react";

const USER_ID = "47f2407b-67b9-4aa1-9a58-50bc0d461059";

// Apollo CSV column mappings → crm_leads fields
const COLUMN_MAP: Record<string, string> = {
  "First Name": "first_name",
  "Last Name": "last_name",
  "Title": "title",
  "Company": "company_name",
  "Company Name for Emails": "company_name",
  "Email": "email",
  "Phone": "phone",
  "LinkedIn Url": "linkedin_url",
  "LinkedIn URL": "linkedin_url",
  "Industry": "industry",
  "# Employees": "company_size",
  "Employees": "company_size",
  "City": "_city",
  "State": "_state",
  "Country": "_country",
  "Website": "_website",
  "Person Linkedin Url": "linkedin_url",
  "Company Linkedin Url": "_company_linkedin",
};

type Step = "upload" | "preview" | "importing" | "done";

interface ParsedRow {
  [key: string]: string;
}

interface MappedLead {
  first_name: string;
  last_name: string | null;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  title: string | null;
  industry: string | null;
  company_size: string | null;
  region: string | null;
  linkedin_url: string | null;
}

function mapRow(row: ParsedRow, headers: string[]): MappedLead {
  const mapped: Record<string, string | null> = {};
  let city = "";
  let state = "";
  let country = "";

  for (const header of headers) {
    const field = COLUMN_MAP[header];
    if (!field) continue;
    const val = row[header]?.trim() || null;

    if (field === "_city") { city = val || ""; continue; }
    if (field === "_state") { state = val || ""; continue; }
    if (field === "_country") { country = val || ""; continue; }
    if (field === "_website" || field === "_company_linkedin") continue;

    if (!mapped[field]) mapped[field] = val;
  }

  const regionParts = [city, state, country].filter(Boolean);

  return {
    first_name: mapped.first_name || "Unknown",
    last_name: mapped.last_name || null,
    company_name: mapped.company_name || null,
    email: mapped.email || null,
    phone: mapped.phone || null,
    title: mapped.title || null,
    industry: mapped.industry || null,
    company_size: mapped.company_size || null,
    region: regionParts.length > 0 ? regionParts.join(", ") : null,
    linkedin_url: mapped.linkedin_url || null,
  };
}

export default function ApolloImport() {
  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState("");
  const [rawRows, setRawRows] = useState<ParsedRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mappedLeads, setMappedLeads] = useState<MappedLead[]>([]);
  const [importCount, setImportCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const matchedColumns = headers.filter((h) => COLUMN_MAP[h]);

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith(".csv")) {
      toast.error("Please upload a CSV file");
      return;
    }
    setFileName(file.name);

    Papa.parse<ParsedRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data.length === 0) {
          toast.error("CSV file is empty");
          return;
        }
        const hdrs = results.meta.fields || [];
        setHeaders(hdrs);
        setRawRows(results.data);

        const leads = results.data.map((row) => mapRow(row, hdrs));
        setMappedLeads(leads);
        setStep("preview");
        toast.success(`Parsed ${results.data.length} rows`);
      },
      error: (err) => {
        toast.error(`Parse error: ${err.message}`);
      },
    });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const importMutation = useMutation({
    mutationFn: async () => {
      setStep("importing");
      let imported = 0;
      let errors = 0;
      let duplicates = 0;

      // Check for existing leads by email to skip duplicates
      const emails = mappedLeads.map((l) => l.email).filter(Boolean) as string[];
      let existingEmails = new Set<string>();
      if (emails.length > 0) {
        const { data: existing } = await supabase
          .from("crm_leads")
          .select("email")
          .in("email", emails);
        existingEmails = new Set((existing ?? []).map((e) => e.email?.toLowerCase()));
      }

      // Batch insert in chunks of 50
      const BATCH_SIZE = 50;
      for (let i = 0; i < mappedLeads.length; i += BATCH_SIZE) {
        const batch = mappedLeads.slice(i, i + BATCH_SIZE);
        const toInsert = batch
          .filter((lead) => {
            if (lead.email && existingEmails.has(lead.email.toLowerCase())) {
              duplicates++;
              return false;
            }
            return true;
          })
          .map((lead) => ({
            user_id: USER_ID,
            first_name: lead.first_name,
            last_name: lead.last_name,
            company_name: lead.company_name,
            email: lead.email,
            phone: lead.phone,
            title: lead.title,
            source: "Apollo",
            status: "New",
            industry: lead.industry,
            company_size: lead.company_size,
            region: lead.region,
            linkedin_url: lead.linkedin_url,
          }));

        if (toInsert.length === 0) continue;

        const { error } = await supabase.from("crm_leads").insert(toInsert);
        if (error) {
          errors += toInsert.length;
        } else {
          imported += toInsert.length;
        }
      }

      setImportCount(imported);
      setErrorCount(errors);
      setDuplicateCount(duplicates);

      // Log activity
      if (imported > 0) {
        await supabase.from("crm_activities").insert({
          user_id: USER_ID,
          type: "created",
          description: `Imported ${imported} leads from Apollo CSV (${fileName})`,
          linked_type: "lead",
          linked_id: USER_ID,
          metadata: { source: "Apollo CSV", file: fileName, imported, duplicates, errors },
        });
      }

      return { imported, errors, duplicates };
    },
    onSuccess: () => {
      setStep("done");
    },
    onError: (e) => {
      toast.error(`Import failed: ${e.message}`);
      setStep("preview");
    },
  });

  const reset = () => {
    setStep("upload");
    setFileName("");
    setRawRows([]);
    setHeaders([]);
    setMappedLeads([]);
    setImportCount(0);
    setErrorCount(0);
    setDuplicateCount(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Apollo Import</h1>
        <p className="text-sm text-muted-foreground mt-1">Import leads from Apollo CSV exports</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {(["upload", "preview", "done"] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            {i > 0 && <ArrowRight size={12} />}
            <span className={step === s || (step === "importing" && s === "preview")
              ? "text-primary font-medium"
              : step === "done" || (s === "upload" && step !== "upload")
                ? "text-success"
                : ""}>
              {s === "upload" ? "Upload CSV" : s === "preview" ? "Preview & Import" : "Complete"}
            </span>
          </div>
        ))}
      </div>

      {/* UPLOAD STEP */}
      {step === "upload" && (
        <Card>
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`flex flex-col items-center justify-center py-16 text-center rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200 ${
              isDragging
                ? "border-primary bg-primary/5 scale-[1.01]"
                : "border-border/60 hover:border-primary/40 hover:bg-muted/20"
            }`}
          >
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-colors ${
              isDragging ? "bg-primary/20" : "bg-primary/10"
            }`}>
              <Upload size={32} className="text-primary" />
            </div>
            <h3 className="text-lg font-medium mb-2">Upload Apollo CSV</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Drag and drop your Apollo export CSV file here, or click to browse.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Supports columns: First Name, Last Name, Company, Email, Phone, Title, LinkedIn, Industry
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </div>
        </Card>
      )}

      {/* PREVIEW STEP */}
      {(step === "preview" || step === "importing") && (
        <>
          {/* File info */}
          <Card>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileSpreadsheet size={20} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    {rawRows.length} rows &middot; {matchedColumns.length} of {headers.length} columns mapped
                  </p>
                </div>
              </div>
              <button onClick={reset} className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                <X size={16} />
              </button>
            </div>
          </Card>

          {/* Column mapping info */}
          <Card>
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">Column Mapping</h3>
            <div className="flex flex-wrap gap-1.5">
              {headers.map((h) => (
                <Badge key={h} variant={COLUMN_MAP[h] ? "success" : "default"} className="text-[10px]">
                  {h} {COLUMN_MAP[h] ? `→ ${COLUMN_MAP[h]}` : "(skipped)"}
                </Badge>
              ))}
            </div>
            {matchedColumns.length === 0 && (
              <div className="flex items-center gap-2 mt-3 text-sm text-warning">
                <AlertTriangle size={14} />
                No Apollo columns detected. Make sure your CSV has standard Apollo column headers.
              </div>
            )}
          </Card>

          {/* Preview table */}
          <Card>
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Preview (first 5 rows)
            </h3>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">#</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Name</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Company</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Email</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Title</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Industry</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Region</th>
                  </tr>
                </thead>
                <tbody>
                  {mappedLeads.slice(0, 5).map((lead, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-2 font-medium">{lead.first_name} {lead.last_name || ""}</td>
                      <td className="px-3 py-2 text-muted-foreground">{lead.company_name || "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{lead.email || "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{lead.title || "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{lead.industry || "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{lead.region || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {mappedLeads.length > 5 && (
              <p className="text-xs text-muted-foreground mt-2">
                ... and {mappedLeads.length - 5} more rows
              </p>
            )}
          </Card>

          {/* Import button */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Ready to import <span className="font-medium text-foreground">{mappedLeads.length}</span> leads with source "Apollo" and status "New"
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={reset} disabled={step === "importing"}>
                Cancel
              </Button>
              <Button
                onClick={() => importMutation.mutate()}
                disabled={step === "importing" || mappedLeads.length === 0}
              >
                {step === "importing" ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>Import {mappedLeads.length} Leads</>
                )}
              </Button>
            </div>
          </div>
        </>
      )}

      {/* DONE STEP */}
      {step === "done" && (
        <Card>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-success/10 flex items-center justify-center mb-4">
              <CheckCircle2 size={32} className="text-success" />
            </div>
            <h3 className="text-lg font-medium mb-2">Import Complete</h3>
            <div className="space-y-1 mb-6">
              <p className="text-sm">
                <span className="font-medium text-success">{importCount}</span> leads imported successfully
              </p>
              {duplicateCount > 0 && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-warning">{duplicateCount}</span> duplicates skipped (email already exists)
                </p>
              )}
              {errorCount > 0 && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-destructive">{errorCount}</span> errors
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={reset}>
                Import Another
              </Button>
              <Button onClick={() => window.location.href = "/leads"}>
                View Leads
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
