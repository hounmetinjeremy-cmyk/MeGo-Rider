const http = require("http");
const crypto = require("crypto");

// Petit portier devant Ollama : seul le site MeGo (Cloudflare Pages), qui connait AI_SECRET, peut utiliser le modele.
// Sans cela, l'adresse publique Fly permettrait a n'importe qui d'utiliser ton processeur gratuitement.
const SECRET = process.env.AI_SECRET || "";

function authorized(req) {
  const given = Buffer.from(String(req.headers["x-ai-key"] || ""));
  const wanted = Buffer.from(SECRET);
  return wanted.length > 0 && given.length === wanted.length && crypto.timingSafeEqual(given, wanted);
}

http
  .createServer(function (req, res) {
    if (req.url === "/health") {
      res.writeHead(200);
      return res.end("ok");
    }
    if (req.method !== "POST" || req.url !== "/api/generate") {
      res.writeHead(404);
      return res.end("not found");
    }
    if (!authorized(req)) {
      res.writeHead(401);
      return res.end("unauthorized");
    }
    const proxy = http.request(
      { host: "127.0.0.1", port: 11434, path: "/api/generate", method: "POST", headers: { "content-type": "application/json" } },
      function (r) {
        res.writeHead(r.statusCode, { "content-type": "application/json" });
        r.pipe(res);
      }
    );
    proxy.on("error", function () {
      res.writeHead(502);
      res.end("ollama indisponible");
    });
    req.pipe(proxy);
  })
  .listen(8080, "0.0.0.0");
