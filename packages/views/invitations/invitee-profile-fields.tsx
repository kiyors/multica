"use client";

import { Input } from "@multica/ui/components/ui/input";
import { Label } from "@multica/ui/components/ui/label";
import { useT } from "../i18n";

export interface InviteeProfileFieldsProps {
  name: string;
  email: string;
  department: string;
  onNameChange: (value: string) => void;
  onDepartmentChange: (value: string) => void;
}

/** Profile details collected only for a user's first workspace invitation. */
export function InviteeProfileFields({
  name,
  email,
  department,
  onNameChange,
  onDepartmentChange,
}: InviteeProfileFieldsProps) {
  const { t } = useT("invite");

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
        <Label htmlFor="invitee-department" className="text-xs text-muted-foreground">
          {t(($) => $.profile.department_label)}
        </Label>
        <Input
          id="invitee-department"
          value={department}
          onChange={(event) => onDepartmentChange(event.target.value)}
          placeholder={t(($) => $.profile.department_placeholder)}
          autoComplete="organization-title"
          className="mt-1"
        />
      </div>
    </div>
  );
}

export function inviteeProfileDescription(department: string): string {
  return `Department / role: ${department.trim()}`;
}
