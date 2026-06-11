import { ContentSection } from "../components/content-section";
import { SystemAIConfigCard } from "./system-ai-config-card";

export function SettingsSystemAI() {
  return (
    <ContentSection
      title="System AI Configuration"
      desc="Configure the AI models used by the wiki ingestion pipeline. These credentials are used server-side and are separate from your personal AI providers."
    >
      <div className="space-y-4">
        <SystemAIConfigCard
          purpose="pipeline_text"
          title="Pipeline Text Model"
          description="LLM used for knowledge extraction, planning, and wiki content generation."
        />
        <SystemAIConfigCard
          purpose="pipeline_embedding"
          title="Pipeline Embedding Model"
          description="Embedding model used to vectorize wiki content for semantic search in Ask AI."
        />
      </div>
    </ContentSection>
  );
}
