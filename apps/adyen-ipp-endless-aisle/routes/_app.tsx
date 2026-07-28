import { define } from "../utils.ts";

export default define.page(function App({ Component }) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="theme-color" content="#ffffff" />
        <meta name="robots" content="noindex,nofollow" />
        <title>IPP Endless Aisle — TEST Playground</title>
      </head>
      <body>
        <Component />
      </body>
    </html>
  );
});
