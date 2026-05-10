import { ContentSection } from "../components/content-section";
import { AIProvidersPanel } from "./ai-providers-panel";

export function SettingsAIProviders() {
  return (
    <ContentSection
      title="AI Providers"
      desc="Connect your AI service accounts to enable chat, document analysis, and search features."
    >
      <AIProvidersPanel />
    </ContentSection>
  );
}
