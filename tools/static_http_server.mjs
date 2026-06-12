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
const CHROMIUM_UNSAFE_PORTS = new Set([
  1, 7, 9, 11, 13, 15, 17, 19, 20, 21, 22, 23, 25, 37, 42, 43, 53, 69,
  77, 79, 87, 95, 101, 102, 103, 104, 109, 110, 111, 113, 115, 117, 119,
  123, 135, 137, 139, 143, 161, 179, 389, 427, 465, 512, 513, 514, 515,
  526, 530, 531, 532, 540, 548, 554, 556, 563, 587, 601, 636, 989, 990,
  993, 995, 1719, 1720, 1723, 2049, 3659, 4045, 5060, 5061, 6000, 6566,
  6665, 6666, 6667, 6668, 6669, 6697, 10080,
]);

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

function listenOnEphemeralPort(server) {
  return new Promise(resolveListen => server.listen(0, "127.0.0.1", resolveListen));
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

  let address;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await listenOnEphemeralPort(server);
    address = server.address();
    if (!CHROMIUM_UNSAFE_PORTS.has(address.port)) break;
    await new Promise(resolveClose => server.close(resolveClose));
    address = null;
  }
  if (!address) {
    throw new Error("Failed to bind a browser-safe local port");
  }
  const baseUrl = `http://127.0.0.1:${address.port}/`;
  return {
    baseUrl,
    close: () => new Promise(resolveClose => server.close(resolveClose)),
  };
}
