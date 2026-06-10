import { createRootRoute } from "@tanstack/react-router";
import { Outlet, ScrollRestoration, Meta, Links } from "@tanstack/react-router";
import styles from "../styles.css?url";

export const route = createRootRoute({
  head: () => ({
    meta: [
      { charset: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "AI Model Switcher Workspace" },
    ],
    links: [{ rel: "stylesheet", href: styles }],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <html lang="en">
      <head>
        <Meta />
        <Links />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Outlet />
        <ScrollRestoration />
      </body>
    </html>
  );
}
