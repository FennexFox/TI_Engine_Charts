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

function responseStatus(response, status, body) {
  response.writeHead(status, { "content-type": "text/plain; charset=utf-8" });
  response.end(body);
}

function resolveRequestPath(root, requestUrl) {
  const url = new URL(requestUrl || "/", "http://127.0.0.1");
  const decoded = decodeURIComponent(url.pathname).replace(/^\/+/, "");
  const filePath = resolve(root, decoded || "index.html");
  const rootPrefix = root.endsWith(sep) ? root : `${root}${sep}`;
  if (filePath !== root && !filePath.startsWith(rootPrefix)) return null;
  return filePath;
}

export async function startStaticHttpServer(root = process.cwd()) {
  const serverRoot = resolve(root);
  const server = createServer((request, response) => {
    const filePath = resolveRequestPath(serverRoot, request.url);
    if (!filePath) {
      responseStatus(response, 403, "Forbidden");
      return;
    }

    let stat;
    try {
      stat = statSync(filePath);
    } catch {
      responseStatus(response, 404, "Not found");
      return;
    }
    if (!stat.isFile()) {
      responseStatus(response, 404, "Not found");
      return;
    }

    response.writeHead(200, {
      "content-length": stat.size,
      "content-type": MIME_TYPES[extname(filePath).toLowerCase()] || "application/octet-stream",
    });
    createReadStream(filePath).pipe(response);
  });

  await new Promise(resolveListen => server.listen(0, "127.0.0.1", resolveListen));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}/`;
  return {
    baseUrl,
    close: () => new Promise(resolveClose => server.close(resolveClose)),
  };
}
