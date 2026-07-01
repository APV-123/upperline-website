export function formatActivityDate(
    value: string | null
) {
    if (!value) return "";

    const date = new Date(value);
    const now = new Date();

    if (
        date.toDateString() ===
        now.toDateString()
    ) {
        return `Today · ${date.toLocaleTimeString(
            "en-US",
            {
                hour: "numeric",
                minute: "2-digit",
            }
        )}`;
    }

    return new Intl.DateTimeFormat(
        "en-US",
        {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
        }
    ).format(date);
}
export function formatCurrency(value: number) {
    return value.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
    });
}