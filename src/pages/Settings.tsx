import { Card } from "@/components/ui/Card";
import { Settings as SettingsIcon } from "lucide-react";

export default function Settings() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Application settings</p>
      </div>

      <Card>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
            <SettingsIcon size={24} className="text-primary" />
          </div>
          <div>
            <p className="font-medium">GOSAI CRM</p>
            <p className="text-sm text-muted-foreground">v1.0.0</p>
          </div>
        </div>

        <div className="space-y-3 border-t border-border pt-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium">Environment</p>
              <p className="text-xs text-muted-foreground">Production — crm.gosai.dev</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
