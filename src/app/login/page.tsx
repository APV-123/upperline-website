"use client";

import { useEffect } from "react";
import { signIn } from "next-auth/react";

export default function LoginPage() {
    useEffect(() => {
        let triggered = false;

        if (!triggered) {
            triggered = true;
            signIn("azure-ad");
        }
    }, []);


    return (
        <div
            style={{
                height: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
                color: "#6b7280",
                fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
            }}
        >
            Redirecting to Microsoft…
        </div>
    );
}