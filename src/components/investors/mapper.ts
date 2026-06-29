import { Investor } from "./types";
import { formatActivityDate } from "./formatters";

type SubscriptionRow = {
    id: string;
    contact_id: string;
    contact_name: string;
    contact_email: string;
    status: string;
    amount: number | null;
    last_activity_at: string | null;
};

function getInitials(name: string) {
    return name
        .split(" ")
        .map(part => part[0])
        .join("")
        .substring(0, 2)
        .toUpperCase();
}

type HubSpotContact = {
    company?: string | null;
    jobtitle?: string | null;
    hs_avatar_url?: string | null;
};

export function mapInvestor(
    subscription: SubscriptionRow,
    contact: HubSpotContact
): Investor {

    return {
    id: subscription.contact_id,

    name: subscription.contact_name,

    email: subscription.contact_email,

    company: contact.company ?? null,

    title: contact.jobtitle ?? null,

    avatarUrl: contact.hs_avatar_url ?? null,

    initials: getInitials(
        subscription.contact_name
    ),

    stage: subscription.status,

    amount: subscription.amount ?? 0,

    relationship: 'Healthy',

    lastTouch: formatActivityDate(
    subscription.last_activity_at),

    lastUpdated: formatActivityDate(
    subscription.last_activity_at),
};

}