import test from "node:test";
import assert from "node:assert/strict";
import { publicIP, destination } from "../network.mjs";

test("denies loopback, metadata, private, mapped and reserved destinations", async () => {
  for (const ip of [
    "127.0.0.1",
    "0.0.0.0",
    "10.1.2.3",
    "172.16.0.1",
    "192.168.1.1",
    "169.254.169.254",
    "100.64.0.1",
    "224.0.0.1",
    "::1",
    "::",
    "fc00::1",
    "fe80::1",
    "::ffff:127.0.0.1",
    "::ffff:169.254.169.254",
    "2001:db8::1",
  ]) {
    assert.equal(publicIP(ip), false, ip);
    await assert.rejects(destination(ip, 443), undefined, ip);
  }
  assert.equal(publicIP("1.1.1.1"), true);
  assert.equal(publicIP("2606:4700:4700::1111"), true);
  await assert.rejects(destination("localhost", 80));
  await assert.rejects(destination("1.1.1.1", 22));
  assert.equal(
    await destination("127.0.0.1", 80, new Set(["127.0.0.1"])),
    "127.0.0.1",
  );
});
