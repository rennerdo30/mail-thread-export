import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import starlightThemeGalaxy from "starlight-theme-galaxy";

export default defineConfig({
  site: "https://rennerdo30.github.io/mail-thread-export",
  base: "/mail-thread-export",
  integrations: [
    starlight({
      title: "Mail Thread Export",
      description:
        "Chrome MV3 extension that exports the open Gmail conversation to PDF or PNG, entirely in the browser.",
      plugins: [starlightThemeGalaxy()],
      customCss: ["./src/styles/custom.css"],
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/rennerdo30/mail-thread-export",
        },
      ],
      sidebar: [
        {
          label: "Getting Started",
          items: [
            { label: "Introduction", slug: "index" },
            { label: "Installation", slug: "getting-started/installation" },
            { label: "Configuration", slug: "getting-started/configuration" },
          ],
        },
        {
          label: "Guides",
          items: [
            { label: "Usage", slug: "guides/usage" },
            { label: "Architecture", slug: "guides/architecture" },
            { label: "Development", slug: "guides/development" },
            { label: "Fonts", slug: "guides/fonts" },
            { label: "Privacy & Permissions", slug: "guides/privacy" },
          ],
        },
      ],
    }),
  ],
});
