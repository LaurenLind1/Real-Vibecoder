import { createRootRoute, Outlet } from "@tanstack/react-router";
import "../style.css"; // <-- This points to the CSS file!

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <Outlet />
    </div>
  );
}
