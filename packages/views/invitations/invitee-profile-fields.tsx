"use client";

import { Input } from "@multica/ui/components/ui/input";
import { Label } from "@multica/ui/components/ui/label";
import { useT } from "../i18n";
import type { Role } from "@multica/core/onboarding";

export interface InviteeProfileFieldsProps {
  name: string;
  email: string;
  role: string;
  onNameChange: (value: string) => void;
  onRoleChange: (value: string) => void;
}

/** Profile details collected only for a user's first workspace invitation. */
export function InviteeProfileFields({
  name,
  email,
  role,
  onNameChange,
  onRoleChange,
}: InviteeProfileFieldsProps) {
  const { t } = useT("invite");
  const { t: tOnboarding } = useT("onboarding");

  const roles: Role[] = [
    "engineer",
    "product",
    "designer",
    "founder",
    "marketing",
    "creative",
    "graphic_designer",
    "marketing_team",
    "social_media",
    "video_writer",
    "video_editor",
    "videographer",
    "content_writer",
    "writer",
    "research",
    "ops",
    "student",
    "other",
  ];

  return (
    <div className="w-full space-y-3 rounded-md border border-border bg-muted/20 p-4 text-left">
      <div>
        <h3 className="text-sm font-medium">{t(($) => $.profile.title)}</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {t(($) => $.profile.description)}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="invitee-name" className="text-xs text-muted-foreground">
            {t(($) => $.profile.name_label)}
          </Label>
          <Input
            id="invitee-name"
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            autoComplete="name"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="invitee-email" className="text-xs text-muted-foreground">
            {t(($) => $.profile.email_label)}
          </Label>
          <Input
            id="invitee-email"
            type="email"
            value={email}
            readOnly
            aria-readonly="true"
            className="mt-1 bg-muted/40 text-muted-foreground"
          />
        </div>
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">
          {tOnboarding(($) => $.questions.role.question)}
        </Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {roles.map((r) => {
            const isSelected = role === r;
            return (
              <button
                key={r}
                type="button"
                onClick={() => onRoleChange(r)}
                className={`inline-flex items-center justify-center rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  isSelected
                    ? "border-transparent bg-primary text-primary-foreground shadow"
                    : "border-border bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                {tOnboarding(($) => $.questions.role[r] as string)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function inviteeProfileDescription(role: string): string {
  return `Role: ${role.trim()}`;
}
