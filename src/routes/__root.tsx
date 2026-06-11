import { createRootRoute, Outlet } from "@tanstack/react-router";
import "../index.css"; // <-- This is the magic line we are missing!

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return (
    <>
      <Outlet />
    </>
  );
}
