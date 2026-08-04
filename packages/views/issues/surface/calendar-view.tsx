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
import "react-big-calendar/lib/css/react-big-calendar.css";
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
    <div className="flex min-h-10 flex-wrap items-center gap-2 border-b px-2 py-1.5 md:px-3">
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

      <span className="order-first w-full text-center text-body font-semibold sm:order-none sm:min-w-36 sm:flex-1 sm:w-auto">
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
  const { t } = useT("issues");
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
    <div className="h-full w-full overflow-auto bg-background p-2 md:p-4">
      <div className="relative h-full min-h-[32rem] min-w-[42rem] overflow-hidden rounded-lg border bg-background max-sm:min-w-[36rem]">
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
          popup
        />
        {events.length === 0 && (
          <div className="pointer-events-none absolute inset-x-0 top-1/2 z-10 mx-auto w-fit -translate-y-1/2 rounded-lg border bg-background/95 px-5 py-4 text-center shadow-sm backdrop-blur">
            <p className="text-body font-medium">{t(($) => $.calendar_view.empty_title)}</p>
            <p className="mt-1 text-caption text-muted-foreground">{t(($) => $.calendar_view.empty_hint)}</p>
          </div>
        )}
      </div>
    </div>
  );
}
