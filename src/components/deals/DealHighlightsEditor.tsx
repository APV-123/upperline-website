'use client';

import { useEffect, useState } from 'react';

export default function DealHighlightsEditor({
    dealId,
}: {
    dealId: string;
}) {
    const [highlights, setHighlights] = useState([]);

    useEffect(() => {
        async function load() {
            const res = await fetch(
                `/api/deals/${dealId}/highlights`
            );

            const json = await res.json();

            setHighlights(json.highlights ?? []);
        }

        load();
    }, [dealId]);

    return (
        <pre>
            {JSON.stringify(highlights, null, 2)}
        </pre>
    );
}