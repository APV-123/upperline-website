export function relationshipFromScore(
    score: number
) {
    if (score >= 200) {
        return {
            label: "Exceptional",
            color: "#56D4FF",
        };
    }

    if (score >= 150) {
        return {
            label: "Healthy",
            color: "#45D483",
        };
    }

    if (score >= 100) {
        return {
            label: "Active",
            color: "#6FC8FF",
        };
    }

    if (score >= 60) {
        return {
            label: "Watching",
            color: "#F7C948",
        };
    }

    if (score >= 25) {
        return {
            label: "Needs Attention",
            color: "#FF9F43",
        };
    }

    return {
        label: "Dormant",
        color: "#FF6B6B",
    };
}