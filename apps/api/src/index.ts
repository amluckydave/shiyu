import { createApp } from "./app.js"
import { resolvePort } from "./config.js"

const app = createApp()
const port = resolvePort()

app.listen(port, () => {
  console.log(`[api] listening on port ${port}`)
})
