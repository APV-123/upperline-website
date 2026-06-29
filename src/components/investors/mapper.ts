import { Investor } from "./types";

type SubscriptionRow = {
    id: string;
    contact_id: string;
    contact_name: string;
    contact_email: string;
    status: string;
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

export function mapInvestor(
    subscription: SubscriptionRow
): Investor {

    return {
    id: subscription.contact_id,

    name: subscription.contact_name,

    email: subscription.contact_email,

    company: null,

    title: null,

    initials: getInitials(
        subscription.contact_name
    ),

    stage: subscription.status,

    amount: 0,

    relationship: 'Healthy',

    lastTouch: '',

    lastUpdated:
        subscription.last_activity_at ?? '',
};

}