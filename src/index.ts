import { Hono } from "hono"
import { serveStatic } from "hono/bun"

const app = new Hono()
app.get("/", serveStatic({ path: "./public/index.html" }))

export default app
