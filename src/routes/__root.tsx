import { createRootRoute, Outlet } from "@tanstack/react-router";

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return (
    <>
      {/* This Outlet acts like a window that renders our index page or project page dynamically */}
      <Outlet />
    </>
  );
}
