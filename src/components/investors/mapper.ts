import { Investor } from "./types";
import { formatActivityDate } from "./formatters";

type SubscriptionRow = {
    id: string;
    contact_id: string;
    contact_name: string;
    contact_email: string;
    status: string;
    amount?: number;
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
    photo?: string | null;

    dealName?: string | null;

    hubspotDealId?: string | null;
    raiseSubscriptionId?: string | null;
    hubspotStageId?: string | null;
};

export function mapInvestor(
    subscription: SubscriptionRow,
    contact: HubSpotContact
): Investor {

    return {
    id: subscription.contact_id,

    name: subscription.contact_name,

    dealName: contact.dealName ?? "",

    email: subscription.contact_email,

    company: contact.company ?? null,

    title: contact.jobtitle ?? null,

    avatarUrl: contact.photo ?? null,

    hubspotDealId:
        contact.hubspotDealId ?? null,

    raiseSubscriptionId:
        contact.raiseSubscriptionId ?? null,

    hubspotStageId:
        contact.hubspotStageId ?? null,

    initials: getInitials(
        subscription.contact_name
    ),

    stage: contact.hubspotStageId ?? '',

    relationship: 'Healthy',

    lastTouch: formatActivityDate(
    subscription.last_activity_at),

    lastUpdated: formatActivityDate(
    subscription.last_activity_at),
};

}