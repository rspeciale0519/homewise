export class RequestBodyTooLargeError extends Error {
  constructor() {
    super("Request body is too large");
    this.name = "RequestBodyTooLargeError";
  }
}

export class InvalidJsonBodyError extends Error {
  constructor() {
    super("Request body is not valid JSON");
    this.name = "InvalidJsonBodyError";
  }
}

export class InvalidTextBodyError extends Error {
  constructor() {
    super("Request body is not valid UTF-8 text");
    this.name = "InvalidTextBodyError";
  }
}

export class InvalidFormDataBodyError extends Error {
  constructor() {
    super("Request body is not valid form data");
    this.name = "InvalidFormDataBodyError";
  }
}

async function readBodyBytesWithLimit(
  request: Request,
  maxBytes: number,
): Promise<Uint8Array> {
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new RequestBodyTooLargeError();
  }

  const reader = request.body?.getReader();
  if (!reader) {
    return new Uint8Array();
  }

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;

    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      await reader.cancel().catch(() => undefined);
      throw new RequestBodyTooLargeError();
    }
    chunks.push(value);
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return body;
}

export async function readTextBodyWithLimit(
  request: Request,
  maxBytes: number,
): Promise<string> {
  const body = await readBodyBytesWithLimit(request, maxBytes);

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(body);
  } catch {
    throw new InvalidTextBodyError();
  }
}

export async function readJsonBodyWithLimit(
  request: Request,
  maxBytes: number,
): Promise<unknown> {
  try {
    const text = await readTextBodyWithLimit(request, maxBytes);
    return JSON.parse(text) as unknown;
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      throw error;
    }
    throw new InvalidJsonBodyError();
  }
}

export async function readFormDataBodyWithLimit(
  request: Request,
  maxBytes: number,
): Promise<FormData> {
  const body = await readBodyBytesWithLimit(request, maxBytes);
  const ownedBody = new Uint8Array(body.byteLength);
  ownedBody.set(body);

  try {
    const limitedRequest = new Request(request.url, {
      method: "POST",
      headers: {
        "content-type": request.headers.get("content-type") ?? "",
      },
      body: ownedBody.buffer,
    });
    return await limitedRequest.formData();
  } catch {
    throw new InvalidFormDataBodyError();
  }
}
