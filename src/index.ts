import type { VercelRequest, VercelResponse } from "@vercel/node";
export interface HttpAdapter {
  listen(
    endpoint: string,
    handler: (req: any, res: any) => Promise<any>,
    ...args: any[]
  ): Promise<any> | any;

  getRequestBody(req: any): Promise<Uint8Array>;
}

export interface HttpAdapterRequest {
  method: string;
  url: string;
  headers: Record<string, string | string[]>;
}

export interface HttpAdapterSererResponse {
  headersSent: boolean;
  writeHead(status: number, headers?: Record<string, string>): void;
  end(chunk?: string | Uint8Array): void;
}

class VercelServerResponse implements HttpAdapterSererResponse {
  private statusCode = 200;
  private headers: Record<string, string> = {};
  private chunks: Uint8Array[] = [];

  public headersSent: boolean = false;
  private resolved = false;
  private resolveResponsePromise?: () => void;

  constructor(private response: VercelResponse) {
    this.response = response;
  }
  writeHead(status: number, headers?: Record<string, string>) {
    if (this.headersSent) {
      throw new Error("Cannot modify headers after they have been sent.");
    }
    this.statusCode = status;
    if (headers) Object.assign(this.headers, headers);
  }

  end(chunk?: string | Uint8Array) {
    if (this.headersSent) {
      throw new Error("Cannot send body after headers have been sent.");
    }
    if (chunk)
      this.chunks.push(
        typeof chunk === "string" ? new TextEncoder().encode(chunk) : chunk
      );
    this.headersSent = true;

    if (!this.resolved) {
      this.resolved = true;

      if (this.resolveResponsePromise) {
        this.resolveResponsePromise(); // promise revoled
      }
    }
  }

  toResponse() {
    // let body: Uint8Array | null = null;
    const totalLength = this.chunks.reduce((sum, c) => sum + c.length, 0);
    //  discord do support chunking but whatever
    Object.assign(this.headers, {
      "content-length": totalLength,
    });

    this.response.writeHead(this.statusCode, this.headers);
    for (const chunk of this.chunks) {
      this.response.write(chunk);
    }
    return this.response.end();
  }

  async waitForResponse(): Promise<void> {
    return new Promise((resolve) => {
      if (this.resolved) {
        resolve();
      } else {
        this.resolveResponsePromise = resolve; // Resolve when end() is called
      }
    });
  }
}

class VercelIncomingMessage implements HttpAdapterRequest {
  headers: Record<string, string | string[]> = {};
  url: string;
  method: string;
  constructor(private request: VercelRequest) {
    this.headers = request.headers as any;
    this.url = request.url ?? "";
    this.method = request.method ?? "GET";
    this.request = request;
  }
  async arrayBuffer(): Promise<ArrayBuffer> {
    // https://vercel.com/docs/functions/runtimes/node-js#request-body

    try {
      const contentType = this.headers["content-type"] as string | undefined;

      if (!contentType?.startsWith("application/json")) {
        // Instead of throwing, return an empty ArrayBuffer
        // or mark it as invalid so the handler can respond
        return new ArrayBuffer(0);
      }

      const json = this.request.body;

      if (!json || typeof json !== "object") {
        return new ArrayBuffer(0);
      }

      const encoded = new TextEncoder().encode(JSON.stringify(json));
      return encoded.buffer;
    } catch {
      // When the request body contains malformed JSON, accessing request.body will throw an error.
      return new ArrayBuffer(0);
    }
  }
}

/**
 * Adapter for using discord.https with vercel.
 *
 * This class implements the HttpAdapter interface and provides
 * methods to handle incoming requests and send responses in a
 * vercel node environment.
 *
 *
 *
 * @example
 * const adapter = new VercelAdapter();
 *
 * export default async function handler(req, res) {
 *     const client = new Client({
 *       token: process.env.DISCORD_BOT_TOKEN,
 *       publicKey: process.env.DISCORD_PUBLIC_KEY,
 *       httpAdapter: adapter,
 *       debug: true,
 *     });
 *
 *     // Register your routes
 *     client.register(UtilityRoute, HelloRoute);
 *
 *     // Handle Discord interactions on the "/interactions" endpoint
 *     return await client.listen("interactions", request, response);
 * }
 */

class VercelAdapter implements HttpAdapter {
  /**
   *
   *
   */
  async listen(
    endpoint: string,
    handler: (req: any, res: any) => Promise<void>,
    request: VercelRequest,
    response: VercelResponse
  ) {
    const req = new VercelIncomingMessage(request);
    const res = new VercelServerResponse(response);
    await handler(req, res);
    await res.waitForResponse();
    return res.toResponse();
  }

  /**
   *
   * Reads the request body as a Uint8Array.
   *
   */
  async getRequestBody(req: VercelIncomingMessage): Promise<Uint8Array> {
    return req.arrayBuffer().then((buffer) => new Uint8Array(buffer));
  }
}
export default VercelAdapter;
