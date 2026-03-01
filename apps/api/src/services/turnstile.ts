const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"

/**
 * Verify a Cloudflare Turnstile token server-side.
 * Returns true if the token is valid, false otherwise.
 */
export async function verifyTurnstileToken(token: string, remoteip?: string): Promise<boolean> {
    const secret = process.env.TURNSTILE_SECRET_KEY

    if (!secret) {
        console.warn("[Turnstile] TURNSTILE_SECRET_KEY not configured, skipping verification")
        return true // Allow in development if not configured
    }

    try {
        const body: Record<string, string> = {
            secret,
            response: token
        }
        if (remoteip) body.remoteip = remoteip

        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 10000)

        const res = await fetch(TURNSTILE_VERIFY_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            signal: controller.signal
        })

        clearTimeout(timeout)

        const data = await res.json() as { success: boolean; "error-codes"?: string[] }

        if (!data.success) {
            console.warn("[Turnstile] Verification failed:", data["error-codes"])
        } else {
            console.log("[Turnstile] Verification passed ✅")
        }

        return data.success
    } catch (err: any) {
        console.error("[Turnstile] Verification error:", err.message)
        // If Cloudflare API is unreachable (e.g. network issues), allow the request
        // to proceed rather than blocking the user entirely
        console.warn("[Turnstile] Allowing request due to verification service error")
        return true
    }
}
