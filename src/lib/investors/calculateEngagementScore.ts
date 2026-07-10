export type EngagementActivity = {
    activity_type: string;
    activity_at: string;
};

export type EngagementCommunication = {
    open_count: number | null;
    click_count: number | null;
    replied_at: string | null;
};

export function calculateEngagementScore(
    activities: EngagementActivity[],
communications: EngagementCommunication[]
) {
    let score = 0;
    const signals: string[] = [];
    
    const caCount =
    activities.filter(
        (a) =>
            a.activity_type ===
            "ca_completed"
    ).length;

if (caCount) {
    score += caCount * 25;
    signals.push("CA Executed");
}

    const imViews =
    activities.filter(
        (a) =>
            a.activity_type ===
            "im_viewed"
    ).length;

if (imViews) {
    score += imViews * 20;

    signals.push(
        `${imViews} IM View${
            imViews === 1 ? "" : "s"
        }`
    );
}

    const modelDownloads =
    activities.filter(
        (a) =>
            a.activity_type ===
            "financial_model_downloaded"
    ).length;

if (modelDownloads) {
    score += modelDownloads * 30;

    signals.push(
        `${modelDownloads} Model Download${
            modelDownloads === 1
                ? ""
                : "s"
        }`
    );
}

const commitments =
    activities.filter(
        a =>
            a.activity_type ===
            "commitment_created"
    ).length;

if (commitments) {
    score += commitments * 100;

    signals.push(
        `${commitments} Commitment${
            commitments === 1
                ? ""
                : "s"
        }`
    );
}

    score += communications.reduce(
        (total, c) =>
            total + (c.open_count ?? 0) * 3,
        0
    );

    score += communications.reduce(
        (total, c) =>
            total + (c.click_count ?? 0) * 8,
        0
    );

    const replies =
    communications.filter(
        (c) => !!c.replied_at
    ).length;

if (replies) {
    score += replies * 50;

    signals.push(
        `${replies} Repl${
            replies === 1
                ? "y"
                : "ies"
        }`
    );
}
const totalOpens =
    communications.reduce(
        (t, c) => t + (c.open_count ?? 0),
        0
    );

if (totalOpens) {
    signals.push(
        `${totalOpens} Email Open${
            totalOpens === 1 ? "" : "s"
        }`
    );
}

const totalClicks =
    communications.reduce(
        (t, c) => t + (c.click_count ?? 0),
        0
    );

if (totalClicks) {
    signals.push(
        `${totalClicks} Link Click${
            totalClicks === 1 ? "" : "s"
        }`
    );
}

// Recency bonus
const lastActivity =
    activities
        .map((a) =>
            new Date(
                a.activity_at
            ).getTime()
        )
        .sort((a, b) => b - a)[0];

if (lastActivity) {
    const days =
        (Date.now() - lastActivity) /
        1000 /
        60 /
        60 /
        24;

    if (days <= 3) {
        score += 20;
    } else if (days <= 7) {
        score += 10;
    } else if (days <= 30) {
        score += 5;
    }
}

return {
    score,
    signals,
};
}