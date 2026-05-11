import { ContentSection } from "../components/content-section";
import { PasswordForm } from "./password-form";

export function SettingsPassword() {
  return (
    <ContentSection
      title="Change Password"
      desc="Update your password to keep your account secure."
    >
      <PasswordForm />
    </ContentSection>
  );
}
