import http from "node:http";
import net from "node:net";
import dns from "node:dns/promises";
import ipaddr from "ipaddr.js";

export function publicIP(address) {
  try {
    return ipaddr.process(address).range() === "unicast";
  } catch {
    return false;
  }
}

// Resolve once and connect to the validated literal IP. Chromium never resolves
// upstream destinations itself; this also covers HTTPS inside CONNECT tunnels.
export async function destination(
  hostname,
  port,
  privateHosts = new Set(),
  ports = new Set([80, 443]),
) {
  hostname = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!ports.has(port) || !hostname || hostname.includes("%"))
    throw new Error("Destination denied");
  const addresses = net.isIP(hostname)
    ? [{ address: hostname }]
    : await dns.lookup(hostname, { all: true, verbatim: true });
  if (
    !addresses.length ||
    (!privateHosts.has(hostname) && addresses.some((a) => !publicIP(a.address)))
  )
    throw new Error("Private/reserved destination denied");
  return (addresses.find((a) => net.isIP(a.address) === 4) || addresses[0])
    .address;
}

export async function createProxy(privateHosts, ports) {
  const sockets = new Set();
  let closing = false;
  const proxy = http.createServer(async (req, res) => {
    try {
      const u = new URL(req.url);
      if (u.protocol !== "http:" || u.username || u.password)
        throw new Error("Protocol denied");
      const port = Number(u.port || 80),
        address = await destination(u.hostname, port, privateHosts, ports);
      if (closing || req.destroyed) throw new Error("Proxy closed");
      const headers = { ...req.headers, host: u.host };
      delete headers["proxy-authorization"];
      delete headers["proxy-connection"];
      const upstream = http.request(
        {
          host: address,
          port,
          method: req.method,
          path: u.pathname + u.search,
          headers,
          agent: false,
        },
        (response) => {
          res.writeHead(response.statusCode, response.headers);
          response.pipe(res);
        },
      );
      upstream.setTimeout(15000, () => upstream.destroy());
      upstream.on("error", () => res.destroy());
      req.on("aborted", () => upstream.destroy());
      res.on("close", () => upstream.destroy());
      req.pipe(upstream);
    } catch {
      res.writeHead(403);
      res.end("Destination denied");
    }
  });
  proxy.on("connect", async (req, client, head) => {
    client.on("error", () => {});
    try {
      const u = new URL("https://" + req.url);
      if (u.username || u.password || u.pathname !== "/")
        throw new Error("Invalid tunnel");
      const port = Number(u.port || 443),
        address = await destination(u.hostname, port, privateHosts, ports);
      if (closing || client.destroyed) throw new Error("Proxy closed");
      const upstream = net.connect({ host: address, port });
      sockets.add(upstream);
      upstream.on("close", () => sockets.delete(upstream));
      upstream.setTimeout(20000, () => upstream.destroy());
      upstream.on("connect", () => {
        client.write("HTTP/1.1 200 Connection Established\r\n\r\n");
        if (head.length) upstream.write(head);
        client.pipe(upstream);
        upstream.pipe(client);
      });
      upstream.on("error", () => client.destroy());
      client.on("error", () => upstream.destroy());
      client.on("close", () => upstream.destroy());
    } catch {
      client.end("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
    }
  });
  proxy.on("connection", (s) => {
    sockets.add(s);
    s.on("close", () => sockets.delete(s));
    s.setTimeout(25000, () => s.destroy());
  });
  proxy.on("upgrade", (_req, socket) => socket.destroy());
  proxy.headersTimeout = 5000;
  await new Promise((resolve) => proxy.listen(0, "127.0.0.1", resolve));
  return {
    url: `http://127.0.0.1:${proxy.address().port}`,
    close: () => {
      closing = true;
      for (const s of sockets) s.destroy();
      proxy.close();
    },
  };
}
