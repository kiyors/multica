"use client";

import { ActorAvatar as ActorAvatarBase } from "@multica/ui/components/common/actor-avatar";
import { useActorName } from "@multica/core/workspace/hooks";
import { cn } from "@multica/ui/lib/utils";
import type { IssueActorRef } from "@multica/core/types";
import { type AvatarSize, AVATAR_SIZE_PX } from "@multica/ui/lib/avatar-size";

interface ActorAvatarStackProps {
  actors: readonly IssueActorRef[];
  size?: AvatarSize;
  max?: number;
  opacity?: "full" | "half";
  className?: string;
}

export function ActorAvatarStack({
  actors,
  size = "sm",
  max = 3,
  opacity = "full",
  className,
}: ActorAvatarStackProps) {
  const { getActorName, getActorInitials, getActorAvatarUrl } = useActorName();
  if (actors.length === 0) return null;

  const visible = actors.slice(0, max);
  const overflow = actors.length - visible.length;
  const sizePx = AVATAR_SIZE_PX[size];
  const overlap = Math.round(sizePx * 0.3);

  return (
    <span
      className={cn(
        "inline-flex items-center",
        opacity === "half" && "opacity-50",
        className,
      )}
      style={{ paddingLeft: 0 }}
    >
      {visible.map((actor, i) => (
        <span
          key={`${actor.type}:${actor.id}`}
          style={{ marginLeft: i === 0 ? 0 : -overlap }}
          className="ring-2 ring-background rounded-full inline-flex"
        >
          <ActorAvatarBase
            name={getActorName(actor.type, actor.id)}
            initials={getActorInitials(actor.type, actor.id)}
            avatarUrl={getActorAvatarUrl(actor.type, actor.id)}
            isAgent={actor.type === "agent"}
            isSquad={actor.type === "squad"}
            size={size}
          />
        </span>
      ))}
      {overflow > 0 && (
        <span
          style={{
            marginLeft: -overlap,
            width: sizePx,
            height: sizePx,
            fontSize: Math.max(9, Math.round(sizePx * 0.45)),
          }}
          className="ring-2 ring-background rounded-full bg-muted text-muted-foreground inline-flex items-center justify-center font-medium tabular-nums z-10"
          aria-label={`${overflow} more`}
        >
          +{overflow}
        </span>
      )}
    </span>
  );
}
