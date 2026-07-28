import StylingPlayground from "../islands/StylingPlayground.tsx";
import { define } from "../utils.ts";

export default define.page(function Home() {
  return (
    <main class="styling-main" id="main-content">
      <StylingPlayground />
    </main>
  );
});
