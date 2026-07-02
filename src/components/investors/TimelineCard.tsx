import {
    Mail,
    FileText,
    NotebookPen,
    CalendarDays,
    CheckSquare,
    ArrowRightLeft,
    CircleDollarSign,
    Eye,
    MousePointerClick,
    Reply,
} from "lucide-react";

import { TimelineEvent } from "./types";
import { formatActivityDate } from "./formatters";
import styles from "./InvestorWorkspace.module.css";

type TimelineCardProps = {
    event: TimelineEvent;

    employeeDirectory: Record<
        string,
        {
            displayName: string;
            initials: string;
        }
    >;
};

export default function TimelineCard({
    event,
    employeeDirectory,
}: TimelineCardProps) {
    const employee =
        event.actor
            ? employeeDirectory[event.actor]
            : null;
    let Icon = FileText;
    let accentClass = styles.document;
    let badge = "Document";
    switch (event.type) {
        case "email":
            Icon = Mail;
            accentClass = styles.email;
            badge = "Email";
            break;

        case "note":
            Icon = NotebookPen;
            accentClass = styles.note;
            badge = "Note";
            break;

        case "meeting":
            Icon = CalendarDays;
            accentClass = styles.meeting;
            badge = "Meeting";
            break;

        case "task":
            Icon = CheckSquare;
            accentClass = styles.task;
            badge = "Task";
            break;

        case "stage":
            Icon = ArrowRightLeft;
            accentClass = styles.stage;
            badge = "Stage";
            break;

        case "commitment":
            Icon = CircleDollarSign;
            accentClass = styles.commitment;
            badge = "Commitment";
            break;
    }
    return (
        <div
            className={`${styles.timelineEvent} ${accentClass}`}
        >
            <div className={styles.eventTop}>

                <span className={styles.eventBadge}>
                    <Icon size={13} />
                    {badge}
                </span>

                <span className={styles.eventTime}>
                    {formatActivityDate(event.timestamp)}
                </span>

            </div>

            <div className={styles.eventTitle}>
                {event.title}
            </div>

            <div className={styles.eventDescription}>
                {event.description}
            </div>
            {event.type === "email" && (
                <div className={styles.emailMetrics}>
                    {Number(event.metadata?.opens ?? 0) > 0 && (
                        <span className={styles.emailMetric}>
                            <Eye size={12} />
                            Opened: {event.metadata?.opens}×
                        </span>
                    )}

                    {Number(event.metadata?.clicks ?? 0) > 0 && (
                        <span className={styles.emailMetric}>
                            <MousePointerClick size={12} />
                            Clicked: {event.metadata?.clicks}×
                        </span>
                    )}

                    {event.metadata?.replied && (
                        <span className={styles.emailMetric}>
                            <Reply size={12} />
                            Replied
                        </span>
                    )}
                </div>
            )}

            {(event.actor || event.source === 'portal') && (
                <div className={styles.eventMeta}>
                    {event.source === 'portal'
                        ? 'Portal'
                        : employee?.displayName ??
                        event.actor}
                </div>
            )}

        </div>
    );
}