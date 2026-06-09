import { createServer } from "node:http";
import { createReadStream, statSync } from "node:fs";
import { extname, resolve, sep } from "node:path";

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".svg": "image/svg+xml",
};

const ALLOWED_METHODS = new Set(["GET", "HEAD"]);

function responseStatus(request, response, status, body, headers = {}) {
  response.writeHead(status, { "content-type": "text/plain; charset=utf-8", ...headers });
  response.end(request.method === "HEAD" ? undefined : body);
}

function resolveRequestPath(root, requestUrl) {
  let decoded;
  try {
    const url = new URL(requestUrl || "/", "http://127.0.0.1");
    decoded = decodeURIComponent(url.pathname).replace(/^\/+/, "");
  } catch {
    return { status: 400, body: "Bad request" };
  }
  const filePath = resolve(root, decoded || "index.html");
  const rootPrefix = root.endsWith(sep) ? root : `${root}${sep}`;
  if (filePath !== root && !filePath.startsWith(rootPrefix)) {
    return { status: 403, body: "Forbidden" };
  }
  return { filePath };
}

export async function startStaticHttpServer(root = process.cwd()) {
  const serverRoot = resolve(root);
  const server = createServer((request, response) => {
    if (!ALLOWED_METHODS.has(request.method)) {
      responseStatus(request, response, 405, "Method not allowed", { allow: "GET, HEAD" });
      return;
    }

    const resolved = resolveRequestPath(serverRoot, request.url);
    if (!resolved.filePath) {
      responseStatus(request, response, resolved.status, resolved.body);
      return;
    }

    let stat;
    try {
      stat = statSync(resolved.filePath);
    } catch {
      responseStatus(request, response, 404, "Not found");
      return;
    }
    if (!stat.isFile()) {
      responseStatus(request, response, 404, "Not found");
      return;
    }

    response.writeHead(200, {
      "content-length": stat.size,
      "content-type": MIME_TYPES[extname(resolved.filePath).toLowerCase()] || "application/octet-stream",
    });
    if (request.method === "HEAD") {
      response.end();
      return;
    }
    createReadStream(resolved.filePath).pipe(response);
  });

  await new Promise(resolveListen => server.listen(0, "127.0.0.1", resolveListen));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}/`;
  return {
    baseUrl,
    close: () => new Promise(resolveClose => server.close(resolveClose)),
  };
}
