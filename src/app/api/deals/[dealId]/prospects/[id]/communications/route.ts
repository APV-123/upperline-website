import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { supabaseServer } from "@/lib/SupabaseServer";

type Params = {
    dealId: string;
    id: string;
};

export async function POST(
    req: NextRequest,
    context: {
        params: Params | Promise<Params>;
    }
) {
    const { dealId, id: contactId } =
        await context.params;

    const token = await getToken({
        req,
        secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
        return NextResponse.json(
            {
                ok: false,
                error: "Unauthorized",
            },
            { status: 401 }
        );
    }

    const {
        subject,
        body,
        recipientEmail,
    } = await req.json();

    //
    // Find the deal's raise_id
    //
    const { data: deal, error: dealError } =
        await supabaseServer
            .from("deals")
            .select("raise_id")
            .eq("id", dealId)
            .single();

    if (dealError || !deal?.raise_id) {
        return NextResponse.json(
            {
                ok: false,
                error: "Deal not found",
            },
            { status: 404 }
        );
    }

    //
    // Find the raise subscription
    //
    const {
        data: subscription,
        error: subscriptionError,
    } = await supabaseServer
        .from("raise_subscriptions")
        .select("id")
        .eq("raise_id", deal.raise_id)
        .eq("contact_id", contactId)
        .single();

    if (
        subscriptionError ||
        !subscription
    ) {
        return NextResponse.json(
            {
                ok: false,
                error:
                    "Raise subscription not found",
            },
            { status: 404 }
        );
    }

    //
    // Create communication
    //
    const {
        data: communication,
        error: insertError,
    } = await supabaseServer
        .from(
            "raise_subscription_communications"
        )
        .insert({
            raise_subscription_id:
                subscription.id,

            status: "draft",

            direction: "outbound",

            communication_type: "email",

            subject,

            notes: body,

            recipient_email:
                recipientEmail,

            created_by:
                (token as { email?: string })
                    .email ?? null,

            draft_created_at:
                new Date().toISOString(),
        })
        .select("id")
        .single();

    if (insertError) {
        console.error(
            "[CREATE COMMUNICATION]",
            insertError
        );

        return NextResponse.json(
            {
                ok: false,
                error:
                    insertError.message,
            },
            { status: 500 }
        );
    }

    return NextResponse.json({
        ok: true,
        communicationId:
            communication.id,
    });
}