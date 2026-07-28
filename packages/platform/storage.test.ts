import { assertEquals } from "@std/assert";
import { Repository } from "./storage.ts";

Deno.test("webhooks and lifecycle actions are deduplicated idempotently", () => {
  const repository = new Repository(":memory:");
  try {
    const webhook = {
      appId: "digital" as const,
      dedupeKey: "AUTHORISATION:PSP-1:true",
      correlationId: "order-1",
      eventType: "AUTHORISATION",
      pspReference: "PSP-1",
      hmacValid: true,
      payload: { apiKey: "never-persist-this" },
    };
    assertEquals(repository.recordWebhook(webhook).duplicate, false);
    assertEquals(repository.recordWebhook(webhook).duplicate, true);

    const action = {
      appId: "digital" as const,
      correlationId: "order-1",
      action: "capture",
      state: "requested",
      idempotencyKey: "capture-order-1",
      payload: { amount: { value: 1000, currency: "EUR" } },
    };
    assertEquals(repository.recordAction(action).duplicate, false);
    assertEquals(repository.recordAction(action).duplicate, true);

    const timeline = repository.timeline("order-1");
    assertEquals(timeline.length, 2);
    assertEquals(
      (timeline.find((entry) => entry.kind === "webhook")?.payload as Record<string, unknown>)
        .apiKey,
      "[redacted]",
    );
  } finally {
    repository.close();
  }
});

Deno.test("orders beyond the retained cap are purged per app on creation", () => {
  const repository = new Repository(":memory:");
  try {
    for (let index = 0; index < 75; index++) {
      repository.createOrder({
        appId: "digital",
        flow: "sessions-dropin",
        amount: { value: 1000, currency: "EUR" },
      });
    }
    assertEquals(repository.listOrders("digital", 200).length, 70);
  } finally {
    repository.close();
  }
});
