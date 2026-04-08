import { Languages } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fallbackLanguage, supportedLanguages, type AppLanguage } from "@/i18n/resources";

const labels: Record<
  AppLanguage,
  { short: string; key: "languageSwitcher.english" | "languageSwitcher.hindi" | "languageSwitcher.telugu" }
> = {
  en: { short: "EN", key: "languageSwitcher.english" },
  hi: { short: "HI", key: "languageSwitcher.hindi" },
  te: { short: "TE", key: "languageSwitcher.telugu" },
};

interface LanguageSwitcherProps {
  className?: string;
  compact?: boolean;
}

const getLanguageValue = (language?: string): AppLanguage =>
  supportedLanguages.includes((language ?? fallbackLanguage).split("-")[0] as AppLanguage)
    ? ((language ?? fallbackLanguage).split("-")[0] as AppLanguage)
    : fallbackLanguage;

const LanguageSwitcher = ({ className = "", compact = false }: LanguageSwitcherProps) => {
  const { i18n, t } = useTranslation("common");
  const currentLanguage = getLanguageValue(i18n.resolvedLanguage ?? i18n.language);

  return (
    <div className={`flex items-center gap-2 ${className}`.trim()}>
      {!compact && <Languages className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
      <Select value={currentLanguage} onValueChange={(value) => void i18n.changeLanguage(value as AppLanguage)}>
        <SelectTrigger
          className={`bg-card/80 ${compact ? "h-9 min-w-[92px] px-2 text-xs" : "h-10 min-w-[148px]"}`}
          aria-label={t("languageSwitcher.label")}
        >
          <SelectValue placeholder={t("languageSwitcher.label")}>
            {compact ? labels[currentLanguage].short : t(labels[currentLanguage].key)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent align="end">
          {supportedLanguages.map((language) => (
            <SelectItem key={language} value={language}>
              <span className="flex items-center gap-2">
                <span className="inline-flex w-6 text-xs font-semibold text-muted-foreground">{labels[language].short}</span>
                <span>{t(labels[language].key)}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default LanguageSwitcher;
