import {
    Eye,
    MousePointerClick,
    Reply,
    X,
} from "lucide-react";

import { formatActivityDate } from "./formatters";
import styles from "./InvestorWorkspace.module.css";
import { TimelineEvent } from "./types";
import { useEffect, useState } from "react";


function formatStatus(status?: unknown) {
    if (typeof status !== "string") return "Unknown";

    switch (status.toLowerCase()) {
        case "sent":
            return "Sent";

        case "draft":
            return "Draft";

        case "scheduled":
            return "Scheduled";

        case "delivered":
            return "Delivered";

        case "completed":
            return "Completed";

        case "failed":
            return "Failed";

        default:
            return status;
    }
}

export default function EmailDrawer({
    event,
    onClose,
}: {
    event: TimelineEvent;
    onClose: () => void;

}) {

    const [loading, setLoading] =
        useState(false);

    const [emailHtml, setEmailHtml] =
        useState<string | null>(null);

    useEffect(() => {
        async function loadEmail() {
            if (!event.id) return;

            setLoading(true);

            try {
                const res = await fetch(
                    `/api/communications/${event.id}`
                );

                if (!res.ok) return;

                const data = await res.json();

                setEmailHtml(
                    data.bodyHtml ?? null
                );
                setGraphWebLink(
                    data.graphWebLink ?? null
                );

            } finally {
                setLoading(false);
            }
        }

        loadEmail();

    }, [event.id]);

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

                        <div className={styles.drawerSubject}>
                            {event.description}
                        </div>
                    </div>

                    <div className={styles.drawerSection}>
                        <div className={styles.drawerLabel}>
                            Status
                        </div>

                        <div className={styles.drawerStatus}>
                            {formatStatus(event.metadata?.status)}
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
                    <div className={styles.drawerDivider} />
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
                    <div className={styles.drawerDivider} />
                    <div className={styles.drawerSection}>
                        <div className={styles.drawerLabel}>
                            Message
                        </div>

                        <div className={styles.drawerPreview}>
                            {loading ? (
                                "Loading email..."
                            ) : emailHtml ? (
                                <div
                                    dangerouslySetInnerHTML={{
                                        __html: emailHtml,
                                    }}
                                />
                            ) : (
                                event.metadata?.notes ??
                                "Email preview will appear here once this message has been synchronized with Outlook."
                            )}
                        </div>
                    </div>
                    <div className={styles.drawerFooter}>

                        {graphWebLink && (
                            <button
                                className={styles.drawerPrimaryButton}
                                onClick={() =>
                                    window.open(
                                        graphWebLink,
                                        "_blank",
                                        "noopener,noreferrer"
                                    )
                                }
                            >
                                Open in Outlook
                            </button>
                        )}

                    </div>
                </div>

            </aside>
        </>
    );
}