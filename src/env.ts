import type { Context } from "hono"
import { env } from "hono/adapter"
import { z } from "zod/v4"

const REQUIRED_ENV_KEYS = [
  "TELEGRAM_BOT_ID",
  "TELEGRAM_API_KEY",
  "TELEGRAM_CHAT_ID",
  "APP_PUBLIC_URL",
] as const

type EnvKey = (typeof REQUIRED_ENV_KEYS)[number]

const envSchema = z.object({
  TELEGRAM_BOT_ID: z.string().min(1),
  TELEGRAM_API_KEY: z.string().min(1),
  TELEGRAM_CHAT_ID: z.string().min(1),
  APP_PUBLIC_URL: z.httpUrl(),
})

type ENV = z.infer<typeof envSchema>

type EnvObservability = {
  code: "ENV_MISSING_OR_EMPTY"
  message: string
  missing: EnvKey[]
}

type GetENVResult =
  | { success: true; data: ENV }
  | {
      success: false
      error: {
        userFriendlyMessage: string
        observability: EnvObservability
      }
    }

const getENV = (c: Context): GetENVResult => {
  const raw = env<Partial<Record<EnvKey, string | undefined>>>(c)
  const parsed = envSchema.safeParse(raw)

  if (parsed.success) return { success: true, data: parsed.data }

  const missing = REQUIRED_ENV_KEYS.filter((key) => {
    const value = raw[key]
    return typeof value !== "string" || value.length === 0
  })

  return {
    success: false,
    error: {
      userFriendlyMessage: "Unknown error occurred",
      observability: {
        code: "ENV_MISSING_OR_EMPTY",
        message: "Required environment variables are missing or empty",
        missing,
      },
    },
  }
}

export { type ENV, type GetENVResult, getENV }
