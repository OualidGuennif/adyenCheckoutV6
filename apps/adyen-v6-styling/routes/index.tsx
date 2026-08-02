import StylingPlayground from "../islands/StylingPlayground.tsx";
import { define } from "../utils.ts";

export default define.page(function Home() {
  return (
    <main class="styling-main" id="main-content">
      <StylingPlayground />
      {
        /* The only place on the deployed site that says what this is and who
          carries the obligations if someone copies it. */
      }
      <footer class="styling-footer">
        <span>© 2026 Adyen TEST playgrounds · TEST environment only</span>
        <a href="/disclaimer">Disclaimer</a>
      </footer>
    </main>
  );
});
