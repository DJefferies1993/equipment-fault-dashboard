import test from "node:test";
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {request} from "node:http";
import {fileURLToPath} from "node:url";

// SECTION 1 — HTTP test helper
// Send the exact request path so malformed input reaches the server unchanged.
function send(port, path, method = "GET") {
  return new Promise((resolve, reject) => {
    const outgoing = request({hostname: "127.0.0.1", port, path, method}, incoming => {
      let body = "";
      incoming.setEncoding("utf8");
      incoming.on("data", chunk => { body += chunk; });
      incoming.on("end", () => resolve({status: incoming.statusCode, body, headers: incoming.headers}));
    });
    outgoing.on("error", reject);
    outgoing.end();
  });
}

// SECTION 2 — Local server behaviour
// Use an available port and stop the test server even when an assertion fails.
test("server handles normal, unsupported and malformed requests", {timeout: 10000}, async context => {
  const child = spawn(process.execPath, [fileURLToPath(new URL("server.js", import.meta.url))], {
    env: {...process.env, PORT: "0"}, stdio: ["ignore", "pipe", "pipe"]
  });
  context.after(() => { child.kill(); });
  const port = await new Promise((resolve, reject) => {
    let output = "";
    child.on("error", reject);
    child.on("exit", code => reject(new Error(`Server exited before readiness: ${code}`)));
    child.stdout.on("data", chunk => {
      output += chunk.toString();
      const address = output.match(/127\.0\.0\.1:(\d+)/);
      if (address) resolve(Number(address[1]));
    });
  });
  assert.equal((await send(port, "/")).status, 200);
  const head = await send(port, "/style.css", "HEAD");
  assert.equal(head.status, 200);
  assert.equal(head.body, "");
  assert.match(head.headers["content-type"], /text\/css/);
  assert.equal((await send(port, "/README.md")).status, 404);
  assert.equal((await send(port, "/", "POST")).status, 404);
  assert.equal((await send(port, "//[")).status, 400);
  assert.equal((await send(port, "/")).status, 200);
});
