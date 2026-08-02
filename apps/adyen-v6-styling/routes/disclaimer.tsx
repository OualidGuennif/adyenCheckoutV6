import { DisclaimerPage, PlaygroundWordmark } from "@suite/ui/components.tsx";
import { define } from "../utils.ts";

const REPOSITORY = "https://github.com/OualidGuennif/adyenCheckoutV6";

export default define.page(function Disclaimer() {
  return (
    <main class="styling-main" id="main-content">
      {
        /* This app has no shared shell, so the page carries its own header —
          otherwise there is no way back to the playground. */
      }
      <div class="styling-toolbar">
        <a class="styling-brand" href="/" aria-label="Back to the playground">
          <PlaygroundWordmark label="Drop-in Styling" />
        </a>
        <a class="button button--quiet button--small" href="/">Back to the playground</a>
      </div>
      <div class="legal-shell">
        <DisclaimerPage appName="Adyen V6 Styling" repositoryUrl={REPOSITORY} />
      </div>
    </main>
  );
});
