import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ФинПилот",
    short_name: "ФинПилот",
    description: "Финансовый учёт малого бизнеса",
    start_url: "/wayfin/",
    scope: "/wayfin/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#0b1739",
    lang: "ru",
    icons: [{ src: "/pwa-icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" }],
  };
}
