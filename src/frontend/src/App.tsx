import { AuthenticatedApp } from "@/components/InternetIdentity";
import { Layout } from "@/components/Layout";
import { BluetoothProvider } from "@/hooks/useBluetooth";
import BluetoothPage from "@/pages/BluetoothPage";
import HistoryPage from "@/pages/HistoryPage";
import HomePage from "@/pages/HomePage";
import IrrigationPage from "@/pages/IrrigationPage";
import MonitoringPage from "@/pages/MonitoringPage";
import PlantsPage from "@/pages/PlantsPage";
import SettingsPage from "@/pages/SettingsPage";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";

const rootRoute = createRootRoute({
  component: () => (
    <Layout>
      <Outlet />
    </Layout>
  ),
});

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
});
const bluetoothRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/bluetooth",
  component: BluetoothPage,
});
const monitoringRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/monitoreo",
  component: MonitoringPage,
});
const irrigationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/riego",
  component: IrrigationPage,
});
const plantsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/plantas",
  component: PlantsPage,
});
const historyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/historial",
  component: HistoryPage,
});
const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/configuracion",
  component: SettingsPage,
});

const routeTree = rootRoute.addChildren([
  homeRoute,
  bluetoothRoute,
  monitoringRoute,
  irrigationRoute,
  plantsRoute,
  historyRoute,
  settingsRoute,
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return (
    <AuthenticatedApp
      title="Monitoreg"
      description="Inicia sesión con Internet Identity para monitorear y regar tus plantas."
    >
      <BluetoothProvider>
        <RouterProvider router={router} />
      </BluetoothProvider>
    </AuthenticatedApp>
  );
}
