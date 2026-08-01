import { useMemo } from "react";
import { Calendar, momentLocalizer, Views, type Event } from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import moment from "moment";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import "./calendar-view.css";
import type { Issue } from "@multica/core/types";

const localizer = momentLocalizer(moment);
const DnDCalendar = withDragAndDrop(Calendar);

export interface CalendarViewProps {
  issues: Issue[];
  onIssueMove?: (issueId: string, start: Date, end: Date) => void;
  onIssueClick?: (issueId: string) => void;
}

interface CalendarEvent extends Event {
  issue: Issue;
}

export function CalendarView({ issues, onIssueMove, onIssueClick }: CalendarViewProps) {
  const events = useMemo(() => {
    return issues
      .filter((i) => i.start_date || i.due_date)
      .map((issue) => {
        const start = issue.start_date ? new Date(issue.start_date) : new Date(issue.due_date!);
        const end = issue.due_date ? new Date(issue.due_date) : new Date(issue.start_date!);
        return {
          title: issue.title,
          start,
          end,
          allDay: true,
          issue,
        } as CalendarEvent;
      });
  }, [issues]);

  const handleEventDrop = ({ event, start, end }: any) => {
    onIssueMove?.(event.issue.id, start, end);
  };

  const handleEventResize = ({ event, start, end }: any) => {
    onIssueMove?.(event.issue.id, start, end);
  };

  const handleSelectEvent = (event: object) => {
    onIssueClick?.((event as CalendarEvent).issue.id);
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
        views={[Views.MONTH, Views.WEEK, Views.DAY]}
        style={{ height: "100%", width: "100%" }}
        className="shadcn-big-calendar"
      />
    </div>
  );
}
