export function relationshipFromScore(
    score: number
) {
    if (score >= 200) {
        return {
            label: "Exceptional",
            color: "blue",
        };
    }

    if (score >= 150) {
        return {
            label: "Healthy",
            color: "green",
        };
    }

    if (score >= 100) {
        return {
            label: "Active",
            color: "teal",
        };
    }

    if (score >= 60) {
        return {
            label: "Watching",
            color: "yellow",
        };
    }

    if (score >= 25) {
        return {
            label: "Needs Attention",
            color: "orange",
        };
    }

    return {
        label: "Dormant",
        color: "red",
    };
}