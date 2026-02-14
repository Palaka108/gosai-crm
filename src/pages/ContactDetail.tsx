import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { GosaiContact, GosaiNote, GosaiActivity } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { NotesSection } from "@/components/shared/NotesSection";
import { ArrowLeft, Mail, Phone, Building2, User } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function ContactDetail() {
  const { id } = useParams<{ id: string }>();

  const { data: contact, isLoading } = useQuery({
    queryKey: ["contact", id],
    queryFn: async () => {
      const { data } = await supabase.from("gosai_contacts").select("*, gosai_companies(id, name)").eq("id", id!).single();
      return data as GosaiContact;
    },
    enabled: !!id,
  });

  const { data: activities = [] } = useQuery({
    queryKey: ["contact-activities", id],
    queryFn: async () => {
      const { data } = await supabase.from("gosai_activities").select("*").eq("linked_type", "contact").eq("linked_id", id!).order("created_at", { ascending: false });
      return (data ?? []) as GosaiActivity[];
    },
    enabled: !!id,
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!contact) return <div className="text-center py-16 text-muted-foreground">Contact not found</div>;

  return (
    <div className="space-y-6">
      <Link to="/contacts" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft size={16} />Back to Contacts
      </Link>

      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center text-xl font-medium text-primary">
          {contact.first_name.charAt(0)}{contact.last_name?.charAt(0) || ""}
        </div>
        <div>
          <h1 className="text-2xl font-semibold">{contact.first_name} {contact.last_name}</h1>
          <div className="flex items-center gap-3 mt-1">
            {contact.title && <span className="text-sm text-muted-foreground">{contact.title}</span>}
            <Badge variant={contact.status === "client" ? "success" : contact.status === "prospect" ? "warning" : "info"}>{contact.status}</Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <NotesSection linkedType="contact" linkedId={id!} />

          <Card>
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Activity</h3>
            <div className="space-y-3">
              {activities.map((a) => (
                <div key={a.id} className="flex gap-3 py-1.5 border-b border-border/50 last:border-0">
                  <div className="flex-1">
                    <p className="text-sm">{a.description || a.type}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(a.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
              {activities.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No activity yet</p>}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Details</h3>
            <div className="space-y-3">
              {contact.email && <div className="flex items-center gap-2 text-sm"><Mail size={14} className="text-muted-foreground" />{contact.email}</div>}
              {contact.phone && <div className="flex items-center gap-2 text-sm"><Phone size={14} className="text-muted-foreground" />{contact.phone}</div>}
              {contact.gosai_companies && (
                <Link to={`/companies/${contact.gosai_companies.id}`} className="flex items-center gap-2 text-sm hover:text-primary transition-colors">
                  <Building2 size={14} className="text-muted-foreground" />{contact.gosai_companies.name}
                </Link>
              )}
              {contact.source && <div className="flex items-center gap-2 text-sm"><User size={14} className="text-muted-foreground" />Source: {contact.source}</div>}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
