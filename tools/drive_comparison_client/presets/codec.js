export async function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  const hidden = document.createElement("textarea");
  hidden.value = text;
  hidden.setAttribute("readonly", "");
  hidden.style.position = "fixed";
  hidden.style.opacity = "0";
  document.body.appendChild(hidden);
  hidden.select();
  let copied = false;
  try {
    copied = document.execCommand("copy");
  } finally {
    document.body.removeChild(hidden);
  }
  return copied;
}

export async function readFromClipboard() {
  if (!(navigator.clipboard && window.isSecureContext)) return "";
  try {
    return (await navigator.clipboard.readText()) || "";
  } catch {
    return "";
  }
}

export function bytesToBase64(bytes) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

export function base64ToBytes(text) {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export async function gzipBytes(bytes) {
  if (typeof CompressionStream !== "function") return null;
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function gunzipBytes(bytes) {
  if (typeof DecompressionStream !== "function") return null;
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function serializePayloadObject(object) {
  const jsonText = JSON.stringify(object);
  const sourceBytes = new TextEncoder().encode(jsonText);
  const gzipped = await gzipBytes(sourceBytes);
  if (gzipped) return `ticp1:${bytesToBase64(gzipped)}`;
  return `tijp1:${bytesToBase64(sourceBytes)}`;
}

export async function formatExportPayloadObject(object, format) {
  if (format === "json") return JSON.stringify(object, null, 2);
  return serializePayloadObject(object);
}

export async function parsePresetPayload(payloadText) {
  const payload = String(payloadText || "").trim();
  if (!payload) throw new Error("empty");

  if (payload.startsWith("ticp1:")) {
    const compressed = base64ToBytes(payload.slice("ticp1:".length));
    const plain = await gunzipBytes(compressed);
    if (!plain) throw new Error("no-gunzip");
    return JSON.parse(new TextDecoder().decode(plain));
  }

  if (payload.startsWith("tijp1:")) {
    const plain = base64ToBytes(payload.slice("tijp1:".length));
    return JSON.parse(new TextDecoder().decode(plain));
  }

  return JSON.parse(payload);
}
