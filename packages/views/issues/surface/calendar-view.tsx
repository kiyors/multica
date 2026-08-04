import { useMemo } from "react";
import {
  Calendar,
  momentLocalizer,
  Views,
  type EventProps,
  type ToolbarProps,
  type View,
} from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import moment from "moment";
import { ChevronLeft, ChevronRight } from "lucide-react";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import "./calendar-view.css";
import type { Issue } from "@multica/core/types";
import { useViewStore, useViewStoreApi } from "@multica/core/issues/stores/view-store-context";
import { Button } from "@multica/ui/components/ui/button";
import { cn } from "@multica/ui/lib/utils";
import { useT } from "../../i18n";
import {
  calendarInteractionToIssueDates,
  issueToCalendarEvent,
  type IssueCalendarEvent,
} from "./calendar-adapter";

const localizer = momentLocalizer(moment);
const DnDCalendar = withDragAndDrop<IssueCalendarEvent>(Calendar);

const CALENDAR_VIEWS = [Views.MONTH, Views.WEEK, Views.DAY] as const;

function CalendarToolbar({ label, view, onNavigate, onView }: ToolbarProps<IssueCalendarEvent>) {
  const { t } = useT("issues");
  const showCompleted = useViewStore((state) => state.ganttShowCompleted);
  const actions = useViewStoreApi().getState();
  const viewLabels: Record<(typeof CALENDAR_VIEWS)[number], string> = {
    month: t(($) => $.gantt.zoom_month),
    week: t(($) => $.gantt.zoom_week),
    day: t(($) => $.gantt.zoom_day),
  };

  return (
    <div className="flex min-h-10 flex-wrap items-center gap-2 border-b px-3 py-1.5">
      <div className="inline-flex items-center rounded-md border border-foreground/10 p-0.5">
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          aria-label={t(($) => $.calendar_view.previous)}
          onClick={() => onNavigate("PREV")}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-caption"
          onClick={() => onNavigate("TODAY")}
        >
          {t(($) => $.schedule_period.today)}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          aria-label={t(($) => $.calendar_view.next)}
          onClick={() => onNavigate("NEXT")}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <span className="min-w-36 flex-1 text-center text-body font-semibold">
        {label}
      </span>

      <Button
        size="sm"
        variant={showCompleted ? "secondary" : "outline"}
        className={cn(
          "h-7 text-caption",
          !showCompleted && "text-muted-foreground",
        )}
        onClick={actions.toggleGanttShowCompleted}
      >
        {t(($) => $.gantt.show_completed)}
      </Button>

      <div className="inline-flex items-center rounded-md border border-foreground/10 p-0.5">
        {CALENDAR_VIEWS.map((option) => (
          <Button
            key={option}
            size="sm"
            variant={view === option ? "secondary" : "ghost"}
            className={cn(
              "h-7 px-2 text-caption",
              view !== option && "text-muted-foreground",
            )}
            onClick={() => onView(option as View)}
          >
            {viewLabels[option]}
          </Button>
        ))}
      </div>
    </div>
  );
}

function CalendarEvent({ event }: EventProps<IssueCalendarEvent>) {
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <span className="size-1.5 shrink-0 rounded-full bg-current opacity-70" />
      <span className="truncate">{event.title}</span>
    </span>
  );
}

export interface CalendarViewProps {
  issues: Issue[];
  onIssueMove?: (issueId: string, startDate: string, dueDate: string) => void;
  onIssueClick?: (issueId: string) => void;
}

export function CalendarView({ issues, onIssueMove, onIssueClick }: CalendarViewProps) {
  const events = useMemo(() => {
    return issues
      .map(issueToCalendarEvent)
      .filter((event): event is IssueCalendarEvent => event !== null);
  }, [issues]);

  const handleEventDrop = ({ event, start, end }: any) => {
    emitIssueDates(event as IssueCalendarEvent, start as Date, end as Date);
  };

  const handleEventResize = ({ event, start, end }: any) => {
    emitIssueDates(event as IssueCalendarEvent, start as Date, end as Date);
  };

  const emitIssueDates = (event: IssueCalendarEvent, start: Date, exclusiveEnd: Date) => {
    const { startDate, dueDate } = calendarInteractionToIssueDates(
      start,
      exclusiveEnd,
    );
    onIssueMove?.(event.issue.id, startDate, dueDate);
  };

  const handleSelectEvent = (event: object) => {
    onIssueClick?.((event as IssueCalendarEvent).issue.id);
  };

  return (
    <div className="h-full w-full p-4 bg-background">
      <DnDCalendar
        localizer={localizer}
        events={events}
        onEventDrop={handleEventDrop}
        onSelectEvent={handleSelectEvent}
        resizable={true}
        onEventResize={handleEventResize}
        defaultView={Views.MONTH}
        views={[...CALENDAR_VIEWS]}
        components={{ toolbar: CalendarToolbar, event: CalendarEvent }}
        style={{ height: "100%", width: "100%" }}
        className="shadcn-big-calendar"
      />
    </div>
  );
}
