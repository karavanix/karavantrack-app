import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCompanyStore } from "@/stores/company-store";
import { getApiErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Building2, AlertCircle, ArrowLeft } from "lucide-react";

export default function CreateCompanyPage() {
  const navigate = useNavigate();
  const { createCompany } = useCompanyStore();
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (name.trim().length < 2) {
      setError("Company name must be at least 2 characters");
      return;
    }

    setIsLoading(true);
    try {
      await createCompany({ name: name.trim() });
      navigate("/", { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
        <ArrowLeft size={16} />
        Back
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Building2 size={20} />
            </div>
            <div>
              <CardTitle>Create Company</CardTitle>
              <CardDescription>Set up a new company to manage loads</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle size={16} className="shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="company-name">Company name</Label>
              <Input
                id="company-name"
                placeholder="My Logistics Company"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                maxLength={255}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                This will be visible to carriers and team members.
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Spinner size={16} className="text-primary-foreground" />
                  Creating...
                </>
              ) : (
                "Create Company"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
