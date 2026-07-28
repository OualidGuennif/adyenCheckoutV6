const [appDirectory, expectedText] = Deno.args;

if (!appDirectory || !expectedText) {
  throw new Error(
    "Usage: assert-built-ssr.ts <app-directory> <expected-text>",
  );
}

// Keep build-time checks isolated from persistent application storage.
Deno.env.set("DATABASE_PATH", ":memory:");

const entrypoint = new URL(
  `../${appDirectory}/_fresh/server.js`,
  import.meta.url,
);
const server = (await import(entrypoint.href)).default as {
  fetch(request: Request): Response | Promise<Response>;
};

const response = await server.fetch(
  new Request("http://localhost/", {
    headers: { accept: "text/html" },
  }),
);
const html = await response.text();

if (
  response.status !== 200 ||
  !html.includes("<main") ||
  !html.includes("TEST") ||
  !html.includes(expectedText)
) {
  throw new Error(
    `Invalid SSR output for ${appDirectory}: status=${response.status}, bytes=${html.length}`,
  );
}

console.log(
  `SSR assertion passed for ${appDirectory} (${html.length} bytes).`,
);
