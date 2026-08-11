import { useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { AlertCircle, Check, Copy, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { getApiErrorMessage } from "@/lib/api";

interface CopyLinkResult {
  url: string;
  /** Optional helper text shown under the link, e.g. an expiry notice. */
  note?: string;
}

interface CopyLinkPanelProps {
  /** Short explanation of what generating the link does. */
  description?: string;
  /** Label for the "generate" button before a link exists. */
  generateLabel: string;
  /** Label for the button shown once a link already exists, to make a new one. */
  regenerateLabel?: string;
  onGenerate: () => Promise<CopyLinkResult>;
}

/**
 * Shared "generate a shareable link, then copy it" interaction — used by both
 * the carrier invite-link flow and the public tracking-link flow.
 */
export function CopyLinkPanel({
  description,
  generateLabel,
  regenerateLabel,
  onGenerate,
}: CopyLinkPanelProps) {
  const { t } = useTranslation();
  const [url, setUrl] = useState("");
  const [note, setNote] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await onGenerate();
      setUrl(result.url);
      setNote(result.note);
      setCopied(false);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(t("copy_link_copied"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("copy_link_copy_failed"));
    }
  };

  return (
    <div className="space-y-3">
      {description && <p className="text-sm text-muted-foreground">{description}</p>}

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle size={16} className="shrink-0" />
          {error}
        </div>
      )}

      {url ? (
        <>
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={url}
              onFocus={(e) => e.target.select()}
              className="font-mono text-xs"
            />
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={handleCopy}
              className="shrink-0"
              aria-label={t("copy_link_copy")}
            >
              {copied ? <Check size={16} className="text-success" /> : <Copy size={16} />}
            </Button>
          </div>
          {note && <p className="text-xs text-muted-foreground">{note}</p>}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleGenerate}
            disabled={loading}
            className="gap-1.5"
          >
            {loading && <Spinner size={14} />}
            {regenerateLabel ?? t("copy_link_regenerate")}
          </Button>
        </>
      ) : (
        <Button type="button" onClick={handleGenerate} disabled={loading} className="gap-1.5">
          {loading ? (
            <Spinner size={14} className="text-primary-foreground" />
          ) : (
            <Link2 size={14} />
          )}
          {generateLabel}
        </Button>
      )}
    </div>
  );
}
