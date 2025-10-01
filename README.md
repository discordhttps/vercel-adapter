# Vercel Adapter

[![npm version](https://img.shields.io/npm/v/@discordhttps/vercel-adapter.svg)](https://www.npmjs.com/package/@discordhttps/vercel-adapter)
[![License](https://img.shields.io/npm/l/@discordhttps/vercel-adapter.svg)](LICENSE)
[![Downloads](https://img.shields.io/npm/dm/@discordhttps/vercel-adapter.svg)](https://www.npmjs.com/package/@discordhttps/vercel-adapter)

**@discordhttps/vercel-adapter** is an adapter for integrating [**discordhttps**](https://www.npmjs.com/package/discordhttps) with [**Vercel**](https://vercel.com).

## Installation

```bash
npm install @discordhttps/vercel-adapter discordhttps
```

## Usage

```typescript
import Client from "discordhttps";
import VercelAdapter from "@discordhttps/vercel-adapter";

const adapter = new VercelAdapter();

export default async function handler(req, res) {
  const client = new Client({
    token: process.env.DISCORD_BOT_TOKEN,
    publicKey: process.env.DISCORD_PUBLIC_KEY,
    httpAdapter: adapter,
    debug: true,
  });

  // Mount routers
  client.register(UtilityRoute, HelloRoute);

  // Handle Discord interactions on the "/interactions" endpoint
  return await client.listen("interactions", req, res);
}
```
