import React from "react";
import { useTranslation } from "@/hooks/useTranslation";
import LegalWebViewScreen from "./LegalWebViewScreen";

interface TermsConditionsScreenProps {
  onBack?: () => void;
}

export default function TermsConditionsScreen({ onBack }: TermsConditionsScreenProps) {
  const { t } = useTranslation();

  return (
    <LegalWebViewScreen
      page="terms"
      title={t('settings.termsOfService')}
      onBack={onBack}
    />
  );
}
