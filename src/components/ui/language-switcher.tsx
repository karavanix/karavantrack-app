import { useTranslation } from "react-i18next";
import { useLocaleStore } from "@/stores/locale-store";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe } from "lucide-react";

const LOCALES = [
  { code: "en" as const, label: "EN — English" },
  { code: "ru" as const, label: "RU — Русский" },
  { code: "uz" as const, label: "UZ — O'zbekcha" },
];

export function LanguageSwitcher() {
  const { t } = useTranslation();
  const { locale, setLocale } = useLocaleStore();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 text-xs font-medium">
          <Globe size={15} className="text-muted-foreground" />
          {t(`lang_${locale}`)}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {LOCALES.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => setLocale(l.code)}
            className={locale === l.code ? "bg-accent font-semibold" : ""}
          >
            {l.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
