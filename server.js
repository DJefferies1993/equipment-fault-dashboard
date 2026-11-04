import http from "node:http";
import {readFile} from "node:fs/promises";

// SECTION 1 — Static file allowlist
// Serve only the application files, never arbitrary paths from the computer.
const files = {
  "/": ["index.html", "text/html"],
  "/index.html": ["index.html", "text/html"],
  "/style.css": ["style.css", "text/css"],
  "/app.js": ["app.js", "text/javascript"],
  "/model.js": ["model.js", "text/javascript"]
};

// SECTION 2 — Local development server
const server = http.createServer(async (request, response) => {
  const file = files[new URL(request.url, "http://localhost").pathname];
  if (!file || !["GET", "HEAD"].includes(request.method)) {
    response.writeHead(404); response.end("Not found"); return;
  }
  try {
    const content = await readFile(new URL(file[0], import.meta.url));
    response.writeHead(200, {"Content-Type": `${file[1]}; charset=utf-8`, "X-Content-Type-Options": "nosniff"});
    response.end(request.method === "HEAD" ? undefined : content);
  } catch { response.writeHead(500); response.end("Could not read application file."); }
});
server.on("error", error => { console.error(error.message); process.exitCode = 1; });
server.listen(4173, "127.0.0.1", () => console.log("Dashboard: http://127.0.0.1:4173"));
