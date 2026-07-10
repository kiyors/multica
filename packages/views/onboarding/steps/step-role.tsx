"use client";

import {
  Briefcase,
  Code2,
  GraduationCap,
  Megaphone,
  MoreHorizontal,
  Palette,
  PenLine,
  Rocket,
  Search,
  Settings2,
} from "lucide-react";
import type { QuestionnaireAnswers, Role } from "@multica/core/onboarding";
import { StepQuestion, type QuestionOption } from "./step-question";
import { useT } from "../../i18n";

/**
 * Step 2 — "Which best describes you?" Primary signal for the
 * onboarding assistant.
 */
export function StepRole({
  answers,
  onChange,
  onAdvance,
  onSkip,
  onBack,
}: {
  answers: QuestionnaireAnswers;
  onChange: (patch: Partial<QuestionnaireAnswers>) => void;
  onAdvance: () => void;
  onSkip: () => void;
  onBack?: () => void;
}) {
  const { t } = useT("onboarding");

  const options: QuestionOption[] = [
    { slug: "engineer", icon: <Code2 className="h-4 w-4" />, label: t(($) => $.questions.role.engineer) },
    { slug: "product", icon: <Briefcase className="h-4 w-4" />, label: t(($) => $.questions.role.product) },
    { slug: "designer", icon: <Palette className="h-4 w-4" />, label: t(($) => $.questions.role.designer) },
    { slug: "founder", icon: <Rocket className="h-4 w-4" />, label: t(($) => $.questions.role.founder) },
    { slug: "marketing", icon: <Megaphone className="h-4 w-4" />, label: t(($) => $.questions.role.marketing) },
    { slug: "creative", icon: <Palette className="h-4 w-4" />, label: t(($) => $.questions.role.creative) },
    { slug: "graphic_designer", icon: <Palette className="h-4 w-4" />, label: t(($) => $.questions.role.graphic_designer) },
    { slug: "marketing_team", icon: <Megaphone className="h-4 w-4" />, label: t(($) => $.questions.role.marketing_team) },
    { slug: "social_media", icon: <Megaphone className="h-4 w-4" />, label: t(($) => $.questions.role.social_media) },
    { slug: "video_writer", icon: <PenLine className="h-4 w-4" />, label: t(($) => $.questions.role.video_writer) },
    { slug: "videographer", icon: <Rocket className="h-4 w-4" />, label: t(($) => $.questions.role.videographer) },
    { slug: "writer", icon: <PenLine className="h-4 w-4" />, label: t(($) => $.questions.role.writer) },
    { slug: "research", icon: <Search className="h-4 w-4" />, label: t(($) => $.questions.role.research) },
    { slug: "ops", icon: <Settings2 className="h-4 w-4" />, label: t(($) => $.questions.role.ops) },
    { slug: "student", icon: <GraduationCap className="h-4 w-4" />, label: t(($) => $.questions.role.student) },
    { slug: "other", icon: <MoreHorizontal className="h-4 w-4" />, label: t(($) => $.questions.role.other), isOther: true },
  ];

  let selectedSlugs: string[] = [];
  if (Array.isArray(answers.role)) {
    selectedSlugs = [...answers.role];
  } else if (answers.role) {
    selectedSlugs = [answers.role];
  }
  if (answers.role_other && !selectedSlugs.includes("other")) {
    selectedSlugs.push("other");
  }

  return (
    <StepQuestion
      step="role"
      number={2}
      eyebrow={t(($) => $.questions.eyebrow_about_you)}
      question={t(($) => $.questions.role.question)}
      options={options}
      selectedSlugs={selectedSlugs}
      otherValue={answers.role_other ?? ""}
      onOtherChange={(v) => onChange({ role_other: v })}
      otherPlaceholder={t(($) => $.questions.role.other_placeholder)}
      multiSelect={true}
      onAnswer={(slug) => {
        let newSlugs = [...selectedSlugs];
        if (newSlugs.includes(slug)) {
          newSlugs = newSlugs.filter((s) => s !== slug);
        } else {
          if (newSlugs.length >= 3) return; // max 3
          newSlugs.push(slug);
        }

        const hasOther = newSlugs.includes("other");
        const roles = newSlugs.filter((s) => s !== "other") as Role[];

        onChange({
          role: roles.length > 0 ? (roles.length === 1 ? roles[0] : roles) : null,
          role_other: hasOther ? answers.role_other : null,
          role_skipped: false,
        });
      }}
      onAdvance={onAdvance}
      onSkip={() => {
        onChange({ role: null, role_other: null, role_skipped: true });
        onSkip();
      }}
      onBack={onBack}
    />
  );
}

StepRole.displayName = "StepRole";
