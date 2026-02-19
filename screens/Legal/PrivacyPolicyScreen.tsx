import React from "react";
import { useTranslation } from "@/hooks/useTranslation";
import LegalWebViewScreen from "./LegalWebViewScreen";

interface PrivacyPolicyScreenProps {
  onBack?: () => void;
}

export default function PrivacyPolicyScreen({ onBack }: PrivacyPolicyScreenProps) {
  const { t } = useTranslation();

  return (
    <LegalWebViewScreen
      page="privacy"
      title={t('settings.privacyPolicy')}
      onBack={onBack}
    />
  );
}
