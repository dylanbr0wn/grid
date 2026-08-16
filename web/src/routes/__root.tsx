import { useEffect } from "react";
import {
  Outlet,
  createRootRoute,
  useNavigate,
} from "@tanstack/react-router";
import App from "@/App";
import AppWrapper from "@/components/app-wrapper";

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: NotFoundRedirect,
});

function RootComponent() {
  return (
    <AppWrapper>
      <App />
      <Outlet />
    </AppWrapper>
  );
}

function NotFoundRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    void navigate({ to: "/" });
  }, [navigate]);
  return null;
}
