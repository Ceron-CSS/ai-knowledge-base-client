import assert from "node:assert/strict"
import { Buffer } from "node:buffer"
import path from "node:path"
import { fileURLToPath } from "node:url"
import * as esbuild from "esbuild"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, "..")

const result = await esbuild.build({
  absWorkingDir: projectRoot,
  bundle: true,
  entryPoints: ["src/features/auth/authStorage.ts"],
  format: "esm",
  platform: "browser",
  write: false,
})

const moduleUrl = `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`
const authStorage = await import(moduleUrl)

const store = new Map()
globalThis.localStorage = {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key),
}
globalThis.window = new EventTarget()

function makeToken(payload) {
  const encode = (value) =>
    Buffer.from(JSON.stringify(value))
      .toString("base64url")
      .replace(/=+$/, "")

  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode(payload)}.signature`
}

function resetStorage() {
  store.clear()
}

function test(name, fn) {
  try {
    resetStorage()
    fn()
    console.log(`ok - ${name}`)
  } catch (error) {
    console.error(`not ok - ${name}`)
    throw error
  }
}

test("getAccessToken drops an expired JWT instead of treating it as logged in", () => {
  const expiredToken = makeToken({
    userId: "user-1",
    username: "alice",
    exp: Math.floor(Date.now() / 1000) - 60,
  })

  localStorage.setItem("akb_access_token", expiredToken)

  assert.equal(authStorage.getAccessToken(), null)
  assert.equal(localStorage.getItem("akb_access_token"), null)
})

test("clearAccessToken emits an auth storage event in the same tab", () => {
  let eventCount = 0
  window.addEventListener(authStorage.AUTH_STORAGE_EVENT, () => {
    eventCount += 1
  })

  authStorage.setAccessToken(makeToken({ userId: "user-1", username: "alice", exp: Math.floor(Date.now() / 1000) + 60 }))
  eventCount = 0

  authStorage.clearAccessToken()

  assert.equal(eventCount, 1)
})
