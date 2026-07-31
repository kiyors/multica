"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type {
  Agent,
  AgentRuntime,
  MemberWithUser,
} from "@multica/core/types";
import {
  AGENT_DESCRIPTION_MAX_LENGTH,
  AGENT_MAX_CONCURRENT_TASKS_MAX,
  AGENT_MAX_CONCURRENT_TASKS_MIN,
} from "@multica/core/agents";
import { runtimeModelsOptions } from "@multica/core/runtimes";
import { isImeComposing } from "@multica/core/utils";
import { Input } from "@multica/ui/components/ui/input";
import { Textarea } from "@multica/ui/components/ui/textarea";
import { AvatarUploadControl } from "../../common/avatar-upload-control";
import {
  SettingsCard,
  SettingsRow,
  SettingsSaveState,
  SettingsSection,
} from "../../settings/components/settings-layout";
import { useAutoSave } from "../../settings/components/use-auto-save";
import { useT } from "../../i18n";
import { CharCounter } from "./char-counter";
import { ResourceLabelPicker } from "../../labels/resource-label-picker";
import { ModelPicker } from "./inspector/model-picker";
import {
  buildModelChangeUpdate,
  type ModelCatalog,
} from "./inspector/model-change-cleanup";
import { RuntimePicker } from "./inspector/runtime-picker";
import { ThinkingSettingField } from "./inspector/thinking-prop-row";
import { ServiceTierSettingField } from "./inspector/service-tier-setting-field";

interface InspectorProps {
  agent: Agent;
  runtime: AgentRuntime | null;
  runtimes: AgentRuntime[];
  members: MemberWithUser[];
  currentUserId: string | null;
  canEdit: boolean;
  onUpdate: (id: string, data: Record<string, unknown>) => Promise<void>;
}

interface ProfileDraft {
  name: string;
  description: string;
}

function profileDraftsEqual(left: ProfileDraft, right: ProfileDraft) {
  return left.name === right.name && left.description === right.description;
}

/**
 * Full-width General settings form. Every editable value is presented as an
 * explicit field; compact inspector chips are used only through their
 * settings-field variants, where the whole control is a visible click target.
 */
export function AgentDetailInspector({
  agent,
  runtime,
  runtimes,
  members,
  currentUserId,
  canEdit,
  onUpdate,
}: InspectorProps) {
  const { t } = useT("agents");
  const { t: ts } = useT("settings");
  const update = useCallback(
    (data: Record<string, unknown>) => onUpdate(agent.id, data),
    [agent.id, onUpdate],
  );

  const [name, setName] = useState(agent.name);
  const [description, setDescription] = useState(agent.description ?? "");

  useEffect(() => {
    setName(agent.name);
    setDescription(agent.description ?? "");
    // Reset only when moving to another agent. Cache updates from this form
    // must not erase a newer local draft while an autosave is in flight.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent.id]);

  const profileDraft = useMemo(
    () => ({ name: name.trim(), description }),
    [description, name],
  );
  const savedProfile = useMemo(
    () => ({
      name: agent.name,
      description: agent.description ?? "",
    }),
    [agent.description, agent.name],
  );
  const saveProfile = useCallback(
    async (next: ProfileDraft) => {
      await update({ name: next.name, description: next.description });
    },
    [update],
  );
  const profileAutoSave = useAutoSave({
    value: profileDraft,
    savedValue: savedProfile,
    onSave: saveProfile,
    enabled:
      canEdit &&
      profileDraft.name.length > 0 &&
      profileDraft.description.length <= AGENT_DESCRIPTION_MAX_LENGTH,
    isEqual: profileDraftsEqual,
  });

  const isOnline = runtime?.status === "online";
  const nameInvalid = name.trim().length === 0;

  // Same query the Thinking / Speed fields already use, so switching model
  // costs no extra request. `null` = not authoritative (offline runtime, still
  // loading, or discovery failed) and must not trigger any clearing.
  const modelsQuery = useQuery(
    runtimeModelsOptions(isOnline ? agent.runtime_id : null),
  );
  const modelCatalog = useMemo<ModelCatalog>(
    () =>
      modelsQuery.isSuccess
        ? modelsQuery.data.supported
          ? modelsQuery.data.models
          : []
        : null,
    [modelsQuery.data, modelsQuery.isSuccess],
  );
  const handleModelChange = useCallback(
    (model: string) =>
      update(
        buildModelChangeUpdate({
          model,
          thinkingLevel: agent.thinking_level ?? "",
          serviceTier: agent.service_tier ?? "",
          catalog: modelCatalog,
        }),
      ),
    [agent.service_tier, agent.thinking_level, modelCatalog, update],
  );

  return (
    <div className="space-y-8">
      <SettingsSection
        title={t(($) => $.inspector.section_profile)}
        description={t(($) => $.inspector.section_profile_hint)}
        action={
          <SettingsSaveState
            status={profileAutoSave.status}
            savingLabel={ts(($) => $.auto_save.saving)}
            savedLabel={ts(($) => $.auto_save.saved)}
            errorLabel={ts(($) => $.auto_save.failed)}
          />
        }
      >
        <SettingsCard>
          <SettingsRow
            label={t(($) => $.inspector.avatar_label)}
            description={t(($) => $.inspector.avatar_hint)}
            size="none"
          >
            <div className="flex justify-start sm:justify-end">
              <AvatarUploadControl
                variant="agent"
                value={agent.avatar_url ?? null}
                name={agent.name}
                size={56}
                disabled={!canEdit}
                onUploaded={(url) => update({ avatar_url: url })}
                onEmojiSelected={(value) => update({ avatar_url: value })}
              />
            </div>
          </SettingsRow>

          <SettingsRow
            label={t(($) => $.inspector.name_label)}
            size="text"
          >
            <div>
              <Input
                type="text"
                name="agent-name"
                autoComplete="off"
                aria-label={t(($) => $.inspector.name_label)}
                value={name}
                onChange={(event) => setName(event.target.value)}
                onBlur={profileAutoSave.flush}
                disabled={!canEdit}
                aria-invalid={nameInvalid || undefined}
              />
              {nameInvalid ? (
                <p className="mt-1 text-caption text-destructive">
                  {t(($) => $.inspector.rename_required)}
                </p>
              ) : null}
            </div>
          </SettingsRow>

          <SettingsRow
            label={t(($) => $.inspector.description_label)}
            size="text"
            align="start"
          >
            <div>
              <Textarea
                name="agent-description"
                autoComplete="off"
                aria-label={t(($) => $.inspector.description_label)}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                onBlur={profileAutoSave.flush}
                disabled={!canEdit}
                rows={5}
                maxLength={AGENT_DESCRIPTION_MAX_LENGTH}
                className="resize-y"
                placeholder={t(($) => $.inspector.description_placeholder)}
              />
              <CharCounter
                length={[...description].length}
                max={AGENT_DESCRIPTION_MAX_LENGTH}
              />
            </div>
          </SettingsRow>
          <SettingsRow
            label={t(($) => $.inspector.labels_label)}
            description={t(($) => $.inspector.labels_hint)}
            size="text"
            align="start"
          >
            <ResourceLabelPicker
              resourceType="agent"
              resourceId={agent.id}
              canEdit={canEdit}
            />
          </SettingsRow>
        </SettingsCard>
      </SettingsSection>

      <SettingsSection
        title={t(($) => $.inspector.section_execution)}
        description={t(($) => $.inspector.section_execution_hint)}
      >
        <SettingsCard>
          <SettingsRow
            label={t(($) => $.inspector.prop_runtime)}
            size="select-wide"
          >
            <RuntimePicker
              variant="field"
              showLabel={false}
              value={agent.runtime_id}
              runtimes={runtimes}
              members={members}
              currentUserId={currentUserId}
              canEdit={canEdit}
              // Model, thinking level, and service tier are runtime/model
              // native. Clear them together so the new runtime resolves its
              // own defaults instead of inheriting incompatible tokens.
              onChange={(id) =>
                update({
                  runtime_id: id,
                  model: "",
                  thinking_level: "",
                  service_tier: "",
                })
              }
            />
          </SettingsRow>
          <SettingsRow
            label={t(($) => $.inspector.prop_model)}
            size="select-wide"
          >
            <ModelPicker
              variant="field"
              showLabel={false}
              runtimeId={agent.runtime_id}
              runtimeOnline={!!isOnline}
              value={agent.model ?? ""}
              canEdit={canEdit}
              onChange={handleModelChange}
            />
          </SettingsRow>
          <ThinkingSettingField
            label={t(($) => $.inspector.prop_thinking)}
            runtimeId={agent.runtime_id}
            runtimeOnline={!!isOnline}
            provider={runtime?.provider ?? ""}
            model={agent.model ?? ""}
            value={agent.thinking_level ?? ""}
            canEdit={canEdit}
            onChange={(thinkingLevel) =>
              update({ thinking_level: thinkingLevel })
            }
          />
          <ServiceTierSettingField
            label={t(($) => $.inspector.prop_speed)}
            runtimeId={agent.runtime_id}
            runtimeOnline={!!isOnline}
            model={agent.model ?? ""}
            value={agent.service_tier ?? ""}
            canEdit={canEdit}
            onChange={(serviceTier) => update({ service_tier: serviceTier })}
          />
        </PropRow>
      </Section>

      {/* Details — read-only (no hover, no chip styling — these aren't clickable) */}
      <Section label={t(($) => $.inspector.section_details)}>
        {owner && (
          <PropRow label={t(($) => $.inspector.prop_owner)} interactive={false}>
            <span className="flex min-w-0 items-center gap-1.5">
              <ActorAvatar
                actorType="member"
                actorId={owner.user_id}
                size={14}
              />
              <span className="truncate">{owner.name}</span>
            </span>
          </PropRow>
        )}
        <PropRow label={t(($) => $.inspector.prop_created)} interactive={false}>
          <span className="text-muted-foreground">
            {timeAgo(agent.created_at)}
          </span>
        </PropRow>
        <PropRow label={t(($) => $.inspector.prop_updated)} interactive={false}>
          <span className="text-muted-foreground">
            {timeAgo(agent.updated_at)}
          </span>
        </PropRow>
      </Section>

      {/* Skills */}
      <div className="flex flex-col border-b px-5 py-4">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {t(($) => $.inspector.section_skills)}
          </span>
          <span className="font-mono text-[10px] tabular-nums text-muted-foreground/70">
            {agent.skills.length}
          </span>
        </div>
        <div className="flex flex-wrap gap-1">
          {agent.skills.map((s) => (
            <span
              key={s.id}
              className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground"
            >
              {s.name}
            </span>
          ))}
          <SkillAttach agent={agent} canEdit={canEdit} />
        </div>
      </div>

      {/* Integrations — surfaces external-channel bind entry points
          (Lark + Slack today; Discord in the future). Each bind button
          self-hides when its server-side install capability gate is
          closed, so this section may render empty on deployments without
          a configured channel — that's intentional and matches the
          "don't surface a flow that will fail" guarantee. We only mount
          it for editors: viewers shouldn't see a CTA they can't action. */}
      {canEdit && (
        <div className="flex flex-col px-5 py-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {t(($) => $.inspector.section_integrations)}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <LarkAgentBindButton
              agentId={agent.id}
              agentName={agent.name}
              onShowConnectedDetails={onShowIntegrations}
            />
            <SlackAgentBindButton
              agentId={agent.id}
              agentName={agent.name}
              onShowConnectedDetails={onShowIntegrations}
            />
          </div>
        </div>
      )}
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Layout helpers
// ---------------------------------------------------------------------------

function Section({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="border-b px-5 py-4">
      <div className="mb-1 -mx-2 px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5">
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Identity — avatar / name / description editors
// ---------------------------------------------------------------------------

function AvatarEditor({
  agent,
  canEdit,
  onUpdate,
}: {
  agent: Agent;
  canEdit: boolean;
  onUpdate: (data: Record<string, unknown>) => Promise<void>;
}) {
  const { t } = useT("agents");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { upload, uploading } = useFileUpload(api);

  if (!canEdit) {
    return (
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg">
        <ActorAvatar
          actorType="agent"
          actorId={agent.id}
          size={56}
          className="rounded-none"
        />
      </div>
    );
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    try {
      const result = await upload(file);
      if (!result) return;
      await onUpdate({ avatar_url: result.markdownLink || result.link });
      toast.success(t(($) => $.inspector.avatar_updated_toast));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t(($) => $.inspector.avatar_upload_failed_toast));
    }
  };

  return (
    <>
      <button
        type="button"
        // rounded-lg matches the standard agent avatar treatment used in
        // list rows. Avoid rounded-full — circles are reserved for humans.
        className="group relative h-14 w-14 shrink-0 overflow-hidden rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        aria-label={t(($) => $.inspector.change_avatar_aria)}
      >
        <ActorAvatar
          actorType="agent"
          actorId={agent.id}
          size={56}
          className="rounded-none"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin text-white" />
          ) : (
            <Camera className="h-4 w-4 text-white" />
          )}
        </div>
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
    </>
  );
}

function NameAndDescription({
  agent,
  canEdit,
  onUpdate,
}: {
  agent: Agent;
  canEdit: boolean;
  onUpdate: (data: Record<string, unknown>) => Promise<void>;
}) {
  const { t } = useT("agents");
  if (!canEdit) {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-base font-semibold leading-tight">
          {agent.name}
        </span>
        {agent.description ? (
          <span className="text-xs leading-relaxed text-muted-foreground">
            {agent.description}
          </span>
        ) : (
          <span className="text-xs italic leading-relaxed text-muted-foreground/50">
            {t(($) => $.inspector.no_description_placeholder)}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <InlineEditPopover
        value={agent.name}
        onSave={(v) => onUpdate({ name: v.trim() })}
        kind="input"
        title={t(($) => $.inspector.rename_title)}
        placeholder={t(($) => $.inspector.rename_placeholder)}
        validate={(v) => (v.trim().length > 0 ? null : t(($) => $.inspector.rename_required))}
      >
        {(triggerProps) => (
          <button
            type="button"
            {...triggerProps}
            className="group -mx-1 inline-flex items-center gap-1.5 self-start rounded px-1 text-left text-base font-semibold leading-tight transition-colors hover:bg-accent/50"
          >
            <ConcurrencyField
              value={agent.max_concurrent_tasks}
              canEdit={canEdit}
              onSave={(next) => update({ max_concurrent_tasks: next })}
            />
          </SettingsRow>
        </SettingsCard>
      </SettingsSection>
    </div>
  );
}

function ConcurrencyField({
  value,
  canEdit,
  onSave,
}: {
  value: number;
  canEdit: boolean;
  onSave: (next: number) => Promise<void>;
}) {
  const { t } = useT("agents");
  const [draft, setDraft] = useState(String(value));

  useEffect(() => setDraft(String(value)), [value]);

  const commit = () => {
    const next = Number(draft);
    if (
      !Number.isInteger(next) ||
      next < AGENT_MAX_CONCURRENT_TASKS_MIN ||
      next > AGENT_MAX_CONCURRENT_TASKS_MAX
    ) {
      setDraft(String(value));
      return;
    }
    if (next !== value) void onSave(next);
  };

  return (
    <div>
      <Input
        id="agent-concurrency"
        type="number"
        name="agent-concurrency"
        autoComplete="off"
        inputMode="numeric"
        min={AGENT_MAX_CONCURRENT_TASKS_MIN}
        max={AGENT_MAX_CONCURRENT_TASKS_MAX}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (isImeComposing(event)) return;
          if (event.key === "Enter") {
            event.preventDefault();
            commit();
          }
        }}
        disabled={!canEdit}
        aria-label={t(($) => $.inspector.prop_concurrency)}
        className="font-mono tabular-nums"
      />
      <p className="mt-1 text-caption text-muted-foreground">
        {t(($) => $.pickers.concurrency_range, {
          min: AGENT_MAX_CONCURRENT_TASKS_MIN,
          max: AGENT_MAX_CONCURRENT_TASKS_MAX,
        })}
      </p>
    </div>
  );
}
