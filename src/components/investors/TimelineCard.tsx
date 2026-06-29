import {
    Mail,
    FileText,
    NotebookPen,
    CalendarDays,
    CheckSquare,
    ArrowRightLeft,
    CircleDollarSign,
} from "lucide-react";

import { TimelineEvent } from "./types";
import styles from "./InvestorWorkspace.module.css";

type TimelineCardProps = {
    event: TimelineEvent;
};

export default function TimelineCard({
    event,
}: TimelineCardProps) {

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
                {event.timestamp}
            </span>

        </div>

        <div className={styles.eventTitle}>
            {event.title}
        </div>

        <div className={styles.eventDescription}>
            {event.description}
        </div>

        {event.actor && (

            <div className={styles.eventMeta}>
                {event.actor}
            </div>

        )}

    </div>
);
}