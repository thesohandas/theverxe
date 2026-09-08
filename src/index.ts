import { Hono } from "hono"
import { serveStatic } from "hono/bun"
import { validator } from "hono/validator"
import { contactSchema } from "../schemas"
import { getENV } from "./env"

const app = new Hono()
app.get("/", serveStatic({ path: "./public/index.html" }))

app.post(
  "/api/contact",
  validator("json", (value, c) => {
    const parsed = contactSchema.safeParse(value)
    if (!parsed.success) {
      console.error({
        code: "CONTACT_VALIDATION_FAILED",
        message: "Contact form payload failed validation",
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          code: issue.code,
          message: issue.message,
        })),
      })
      return c.text("Invalid", 400)
    }
    return parsed.data
  }),
  async (c) => {
    const envResult = getENV(c)
    if (!envResult.success) {
      console.error(envResult.error.observability)
      return c.text(envResult.error.userFriendlyMessage, 500)
    }

    const { TELEGRAM_API_KEY, TELEGRAM_BOT_ID, TELEGRAM_CHAT_ID } =
      envResult.data

    const body = c.req.valid("json")
    const text = `name: ${body.name}\nphone: ${body.phone}\nmessage: ${body.message}`

    let res: Response
    try {
      res = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_ID}:${TELEGRAM_API_KEY}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text }),
        },
      )
    } catch (error) {
      console.error({
        code: "TELEGRAM_REQUEST_FAILED",
        message: "Failed to reach Telegram API",
        error: error instanceof Error ? error.message : String(error),
      })
      return c.text("Unknown error occurred", 502)
    }

    let data: unknown
    try {
      data = await res.json()
    } catch (error) {
      console.error({
        code: "TELEGRAM_RESPONSE_INVALID",
        message: "Telegram API returned a non-JSON response",
        status: res.status,
        error: error instanceof Error ? error.message : String(error),
      })
      return c.text("Unknown error occurred", 502)
    }

    const telegramOk =
      typeof data === "object" &&
      data !== null &&
      "ok" in data &&
      data.ok === true

    if (!res.ok || !telegramOk) {
      console.error({
        code: "TELEGRAM_SEND_FAILED",
        message: "Telegram API rejected sendMessage",
        status: res.status,
        response: data,
      })
      return c.text("Unknown error occurred", 502)
    }

    console.info({
      code: "CONTACT_SUBMITTED",
      message: "Contact message sent via Telegram",
    })

    return c.text("OK", 200)
  },
)

export default app
