import {
    Eye,
    MousePointerClick,
    Reply,
    X,
} from "lucide-react";

import { formatActivityDate } from "./formatters";
import styles from "./InvestorWorkspace.module.css";
import { TimelineEvent } from "./types";

export default function EmailDrawer({
    event,
    onClose,
}: {
    event: TimelineEvent;
    onClose: () => void;
}) {
    return (
        <>
            <div
                className={styles.drawerBackdrop}
                onClick={onClose}
            />

            <aside className={styles.drawer}>

                <div className={styles.drawerHeader}>

                    <h2>Email Details</h2>

                    <button onClick={onClose}>
                        <X size={20} />
                    </button>

                </div>

                <div className={styles.drawerBody}>

                    <div className={styles.drawerSection}>
                        <div className={styles.drawerLabel}>
                            Subject
                        </div>

                        <div className={styles.drawerValue}>
                            {event.description}
                        </div>
                    </div>

                    <div className={styles.drawerSection}>
                        <div className={styles.drawerLabel}>
                            Status
                        </div>

                        <div className={styles.drawerValue}>
                            {event.metadata?.status ?? "Unknown"}
                        </div>
                    </div>

                    <div className={styles.drawerSection}>
                        <div className={styles.drawerLabel}>
                            Direction
                        </div>

                        <div className={styles.drawerValue}>
                            {event.metadata?.direction ?? "—"}
                        </div>
                    </div>

                    <div className={styles.drawerSection}>
                        <div className={styles.drawerLabel}>
                            From
                        </div>

                        <div className={styles.drawerValue}>
                            {event.metadata?.senderEmail ?? "—"}
                        </div>
                    </div>

                    <div className={styles.drawerSection}>
                        <div className={styles.drawerLabel}>
                            To
                        </div>

                        <div className={styles.drawerValue}>
                            {event.metadata?.recipientEmail ?? "—"}
                        </div>
                    </div>

                    <div className={styles.drawerSection}>
                        <div className={styles.drawerLabel}>
                            Sent
                        </div>

                        <div className={styles.drawerValue}>
                            {formatActivityDate(
                                event.metadata?.sentAt ?? event.timestamp
                            )}
                        </div>
                    </div>

                    <div className={styles.drawerSection}>
                        <div className={styles.drawerLabel}>
                            Engagement
                        </div>

                        <div className={styles.emailMetrics}>

                            {Number(event.metadata?.opens ?? 0) > 0 && (
                                <span className={styles.emailMetric}>
                                    <Eye size={13} />
                                    Opened: {event.metadata?.opens}
                                </span>
                            )}

                            {Number(event.metadata?.clicks ?? 0) > 0 && (
                                <span className={styles.emailMetric}>
                                    <MousePointerClick size={13} />
                                    Clicked: {event.metadata?.clicks}
                                </span>
                            )}

                            {event.metadata?.replied && (
                                <span className={styles.emailMetric}>
                                    <Reply size={13} />
                                    Replied
                                </span>
                            )}

                        </div>
                    </div>

                    <div className={styles.drawerSection}>
                        <div className={styles.drawerLabel}>
                            Notes
                        </div>

                        <div className={styles.drawerValue}>
                            {event.metadata?.notes ?? "—"}
                        </div>
                    </div>

                </div>

            </aside>
        </>
    );
}