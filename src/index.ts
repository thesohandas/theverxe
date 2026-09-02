import { Hono } from "hono"
import { serveStatic } from "hono/bun"
import { validator } from "hono/validator"
import { contactSchema } from "@/schemas"
import { getENV } from "./env"

const app = new Hono()
app.get("/", serveStatic({ path: "./public/index.html" }))

app.post(
  "/api/contact",
  validator("json", (value, c) => {
    const parsed = contactSchema.safeParse(value)
    if (!parsed.success) {
      console.error(parsed.error)
      return c.text("Invalid", 401)
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

    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_ID}:${TELEGRAM_API_KEY}/sendMessage`
    const text = `name: ${body.name}\nphone: ${body.phone}\nmessage: ${body.message}`

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text }),
    })
    const data = await res.json()
    console.log(data)

    return c.text("OK" /* code */)
  },
)

export default app
