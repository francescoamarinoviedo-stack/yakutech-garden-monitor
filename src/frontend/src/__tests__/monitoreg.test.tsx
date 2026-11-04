import { renderWithActor } from "@/__tests__/test-utils";
import type { backendInterface } from "@/backend";
import {
  Actuator,
  ConnectionStatus,
  IrrigationMode,
  IrrigationOutcome,
  PlantStatus,
  SensorPresence,
} from "@/backend";
import { ConnectionBadge } from "@/components/ConnectionBadge";
import { BluetoothProvider } from "@/hooks/useBluetooth";
import BluetoothPage from "@/pages/BluetoothPage";
import HistoryPage from "@/pages/HistoryPage";
import HomePage from "@/pages/HomePage";
import IrrigationPage from "@/pages/IrrigationPage";
import MonitoringPage from "@/pages/MonitoringPage";
import PlantsPage from "@/pages/PlantsPage";
import SettingsPage from "@/pages/SettingsPage";
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

/* ------------------------------------------------------------------ */
/* Typed actor fake                                                    */
/* ------------------------------------------------------------------ */

type ActorMethods =
  | "getConnectionStatus"
  | "getPairedDevice"
  | "setPairedDevice"
  | "disconnectBluetooth"
  | "reportConnectionLost"
  | "getLatestMeasurement"
  | "getHistory"
  | "getPlantStatus"
  | "listPlants"
  | "getPlant"
  | "addPlant"
  | "updatePlant"
  | "deletePlant"
  | "getIrrigationConfig"
  | "setIrrigationConfig"
  | "getActiveActuator"
  | "startManualIrrigation"
  | "stopIrrigation"
  | "emergencyStopIrrigation"
  | "listIrrigationEvents"
  | "listAlerts"
  | "acknowledgeAlert";

type FakeActor = {
  [K in ActorMethods]: ReturnType<typeof vi.fn>;
};

function makeActor(overrides: Partial<FakeActor> = {}): FakeActor {
  const base: FakeActor = {
    getConnectionStatus: vi.fn(async () => ConnectionStatus.disconnected),
    getPairedDevice: vi.fn(async () => null),
    setPairedDevice: vi.fn(async () => undefined),
    disconnectBluetooth: vi.fn(async () => undefined),
    reportConnectionLost: vi.fn(async () => undefined),
    getLatestMeasurement: vi.fn(async () => null),
    getHistory: vi.fn(async () => []),
    getPlantStatus: vi.fn(async () => PlantStatus.healthy),
    listPlants: vi.fn(async () => []),
    getPlant: vi.fn(async () => null),
    addPlant: vi.fn(async () => ({
      id: 1n,
      name: "Albahaca",
      species: "Ocimum basilicum",
      photoFileHash: undefined,
      moistureNeed: 40n,
      careRecommendations: [],
      createdAt: 0n,
    })),
    updatePlant: vi.fn(async () => null),
    deletePlant: vi.fn(async () => true),
    getIrrigationConfig: vi.fn(async () => ({
      mode: IrrigationMode.manual,
      moistureThreshold: 40n,
      maxDurationSeconds: 60n,
    })),
    setIrrigationConfig: vi.fn(async () => undefined),
    getActiveActuator: vi.fn(async () => Actuator.none),
    startManualIrrigation: vi.fn(async () => undefined),
    stopIrrigation: vi.fn(async () => undefined),
    emergencyStopIrrigation: vi.fn(async () => undefined),
    listIrrigationEvents: vi.fn(async () => []),
    listAlerts: vi.fn(async () => []),
    acknowledgeAlert: vi.fn(async () => true),
  };
  return { ...base, ...overrides };
}

function renderPage(ui: React.ReactElement, actor: FakeActor) {
  return renderWithActor(
    <BluetoothProvider>{ui}</BluetoothProvider>,
    actor as unknown as Pick<backendInterface, ActorMethods>,
  );
}

/**
 * HomePage renders router `Link`s, so it needs a real router context. Build a
 * minimal memory-history router whose root renders the page under test.
 */
function renderWithRouter(ui: React.ReactElement, actor: FakeActor) {
  const rootRoute = createRootRoute({ component: () => ui });
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: () => ui,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  return renderWithActor(
    <BluetoothProvider>
      <RouterProvider router={router} />
    </BluetoothProvider>,
    actor as unknown as Pick<backendInterface, ActorMethods>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
});

/* ------------------------------------------------------------------ */
/* Bluetooth connection journey                                        */
/* ------------------------------------------------------------------ */

describe("Conexión Bluetooth", () => {
  it("shows the disconnected state and the paired device when the link is down", async () => {
    const actor = makeActor({
      getPairedDevice: vi.fn(async () => ({
        name: "HC-05 Jardín",
        address: "AA:BB:CC:DD:EE:FF",
      })),
    });
    renderPage(<BluetoothPage />, actor);

    expect(await screen.findByText("Desconectado")).toBeInTheDocument();
    expect(screen.getByText("Sin conexión")).toBeInTheDocument();
    expect(
      await screen.findByText("Último dispositivo: HC-05 Jardín"),
    ).toBeInTheDocument();
    // The remembered device is merged into the selectable list.
    expect(await screen.findByText("HC-05 Jardín")).toBeInTheDocument();
    expect(screen.getByText("AA:BB:CC:DD:EE:FF")).toBeInTheDocument();
  });

  it("shows the connected state and disconnects through the backend", async () => {
    const actor = makeActor({
      getConnectionStatus: vi.fn(async () => ConnectionStatus.connected),
      getPairedDevice: vi.fn(async () => ({
        name: "HC-06 Invernadero",
        address: "11:22:33:44:55:66",
      })),
    });
    renderPage(<BluetoothPage />, actor);

    expect(await screen.findByText("Conectado")).toBeInTheDocument();
    expect(
      screen.getByText("Recibiendo mediciones del jardín."),
    ).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByTestId("bluetooth.disconnect_button"));

    await waitFor(() => {
      expect(actor.disconnectBluetooth).toHaveBeenCalledTimes(1);
    });
  });

  it("warns and offers a reconnect path when the link drops", async () => {
    const getConnectionStatus = vi
      .fn()
      .mockResolvedValueOnce(ConnectionStatus.connected)
      .mockResolvedValue(ConnectionStatus.disconnected);
    const actor = makeActor({ getConnectionStatus });
    const { queryClient } = renderPage(<BluetoothPage />, actor);

    expect(await screen.findByText("Conectado")).toBeInTheDocument();

    await queryClient.invalidateQueries({ queryKey: ["connectionStatus"] });

    expect(
      await screen.findByTestId("bluetooth.lost_state"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/se perdió la comunicación con el arduino/i),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("bluetooth.reconnect_button"),
    ).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ */
/* Connection badge: live link state in the header                     */
/* ------------------------------------------------------------------ */

describe("Indicador de conexión", () => {
  it("shows the connected label when the link is up", async () => {
    const actor = makeActor({
      getConnectionStatus: vi.fn(async () => ConnectionStatus.connected),
    });
    renderPage(<ConnectionBadge />, actor);

    expect(await screen.findByText("Conectado")).toBeInTheDocument();
  });

  it("shows the disconnected label when the link is down", async () => {
    const actor = makeActor();
    renderPage(<ConnectionBadge />, actor);

    expect(await screen.findByText("Desconectado")).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ */
/* Monitoring: no fictitious data when offline                         */
/* ------------------------------------------------------------------ */

describe("Monitoreo", () => {
  it("warns that no fictitious measurements are shown while disconnected", async () => {
    const actor = makeActor({
      getLatestMeasurement: vi.fn(async () => ({
        id: 1n,
        soilMoisture: 42n,
        temperature: 25n,
        ambientHumidity: 60n,
        soilPresence: SensorPresence.present,
        temperaturePresence: SensorPresence.present,
        ambientHumidityPresence: SensorPresence.present,
        recordedAt: 1_700_000_000_000_000_000n,
      })),
    });
    renderPage(<MonitoringPage />, actor);

    expect(
      await screen.findByTestId("monitoring.offline_state"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/no se muestran mediciones ficticias/i),
    ).toBeInTheDocument();
  });

  it("renders the latest sensor readings and last update time when connected", async () => {
    const actor = makeActor({
      getConnectionStatus: vi.fn(async () => ConnectionStatus.connected),
      getLatestMeasurement: vi.fn(async () => ({
        id: 1n,
        soilMoisture: 42n,
        temperature: 25n,
        ambientHumidity: 60n,
        soilPresence: SensorPresence.present,
        temperaturePresence: SensorPresence.present,
        ambientHumidityPresence: SensorPresence.present,
        recordedAt: 1_700_000_000_000_000_000n,
      })),
    });
    renderPage(<MonitoringPage />, actor);

    expect(await screen.findByText("Humedad suelo")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("25")).toBeInTheDocument();
    expect(screen.getByText("60")).toBeInTheDocument();
    expect(screen.queryByTestId("monitoring.offline_state")).toBeNull();
    expect(
      screen.getByTestId("monitoring.last_update_card"),
    ).toBeInTheDocument();
  });

  it("marks an absent sensor as Ausente and shows no reading", async () => {
    const actor = makeActor({
      getConnectionStatus: vi.fn(async () => ConnectionStatus.connected),
      getLatestMeasurement: vi.fn(async () => ({
        id: 1n,
        soilMoisture: 42n,
        soilPresence: SensorPresence.present,
        temperaturePresence: SensorPresence.absent,
        ambientHumidityPresence: SensorPresence.absent,
        recordedAt: 1_700_000_000_000_000_000n,
      })),
    });
    renderPage(<MonitoringPage />, actor);

    expect(await screen.findByText("Humedad suelo")).toBeInTheDocument();
    expect(screen.getAllByText("Ausente")).toHaveLength(2);
    expect(screen.getByText("Activo")).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ */
/* Irrigation: manual control, emergency stop, exclusivity             */
/* ------------------------------------------------------------------ */

describe("Riego", () => {
  it("starts manual irrigation on the selected actuator when connected", async () => {
    const actor = makeActor({
      getConnectionStatus: vi.fn(async () => ConnectionStatus.connected),
    });
    renderPage(<IrrigationPage />, actor);

    const start = await screen.findByTestId("irrigation.start_button");
    await waitFor(() => expect(start).toBeEnabled());

    const user = userEvent.setup();
    await user.click(screen.getByTestId("irrigation.actuator_option.valve"));
    await user.click(start);

    await waitFor(() => {
      expect(actor.startManualIrrigation).toHaveBeenCalledWith(Actuator.valve);
    });
  });

  it("disables manual irrigation while disconnected", async () => {
    const actor = makeActor();
    renderPage(<IrrigationPage />, actor);

    expect(
      await screen.findByTestId("irrigation.offline_state"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("irrigation.start_button")).toBeDisabled();
  });

  it("triggers the emergency stop", async () => {
    const actor = makeActor({
      getConnectionStatus: vi.fn(async () => ConnectionStatus.connected),
      getActiveActuator: vi.fn(async () => Actuator.pump),
    });
    renderPage(<IrrigationPage />, actor);

    const emergency = await screen.findByTestId("irrigation.emergency_button");
    const user = userEvent.setup();
    await user.click(emergency);

    await waitFor(() => {
      expect(actor.emergencyStopIrrigation).toHaveBeenCalledTimes(1);
    });
  });

  it("shows the active actuator and never both at once", async () => {
    const actor = makeActor({
      getConnectionStatus: vi.fn(async () => ConnectionStatus.connected),
      getActiveActuator: vi.fn(async () => Actuator.pump),
    });
    renderPage(<IrrigationPage />, actor);

    expect(await screen.findByText("Riego activo")).toBeInTheDocument();
    const state = screen.getByTestId("irrigation.actuator_state");
    expect(within(state).getByText("Bomba")).toBeInTheDocument();
    expect(
      within(state).getByText(/nunca se activan a la vez/i),
    ).toBeInTheDocument();
  });

  it("toggles automatic mode through the backend config", async () => {
    const actor = makeActor({
      getConnectionStatus: vi.fn(async () => ConnectionStatus.connected),
    });
    renderPage(<IrrigationPage />, actor);

    const toggle = await screen.findByTestId("irrigation.automatic_switch");
    await waitFor(() => expect(toggle).toBeEnabled());

    const user = userEvent.setup();
    await user.click(toggle);

    await waitFor(() => {
      expect(actor.setIrrigationConfig).toHaveBeenCalledWith(
        40n,
        60n,
        IrrigationMode.automatic,
      );
    });
  });
});

/* ------------------------------------------------------------------ */
/* Plants: register and list                                           */
/* ------------------------------------------------------------------ */

describe("Mis plantas", () => {
  it("shows the empty state when no plants are registered", async () => {
    const actor = makeActor();
    renderPage(<PlantsPage />, actor);

    expect(await screen.findByTestId("plants.empty_state")).toBeInTheDocument();
    expect(screen.getByText("Aún no hay plantas")).toBeInTheDocument();
  });

  it("lists registered plants with their status and moisture need", async () => {
    const actor = makeActor({
      listPlants: vi.fn(async () => [
        {
          id: 1n,
          name: "Albahaca",
          species: "Ocimum basilicum",
          photoFileHash: undefined,
          moistureNeed: 40n,
          careRecommendations: ["Riego moderado"],
          createdAt: 0n,
          status: PlantStatus.needsWater,
        },
      ]),
    });
    renderPage(<PlantsPage />, actor);

    expect(await screen.findByText("Albahaca")).toBeInTheDocument();
    expect(screen.getByText("Ocimum basilicum")).toBeInTheDocument();
    expect(screen.getByText("Necesita agua")).toBeInTheDocument();
    expect(screen.getByText(/Necesita 40% de humedad/)).toBeInTheDocument();
  });

  it("validates the form before registering a plant", async () => {
    const actor = makeActor();
    renderPage(<PlantsPage />, actor);

    const user = userEvent.setup();
    await user.click(await screen.findByTestId("plants.add_button"));
    await user.click(await screen.findByTestId("plants.save_button"));

    expect(await screen.findByTestId("plants.form_error")).toHaveTextContent(
      /nombre y la especie son obligatorios/i,
    );
    expect(actor.addPlant).not.toHaveBeenCalled();
  });

  it("registers a plant with name, species and moisture need", async () => {
    const actor = makeActor();
    renderPage(<PlantsPage />, actor);

    const user = userEvent.setup();
    await user.click(await screen.findByTestId("plants.add_button"));
    await user.type(await screen.findByTestId("plants.name_input"), "Menta");
    await user.type(screen.getByTestId("plants.species_input"), "Mentha");
    await user.clear(screen.getByTestId("plants.moisture_input"));
    await user.type(screen.getByTestId("plants.moisture_input"), "55");
    await user.click(screen.getByTestId("plants.save_button"));

    await waitFor(() => {
      expect(actor.addPlant).toHaveBeenCalledWith(
        "Menta",
        "Mentha",
        null,
        55n,
        [],
      );
    });
  });
});

/* ------------------------------------------------------------------ */
/* History: offline cache and alerts                                   */
/* ------------------------------------------------------------------ */

describe("Historial", () => {
  it("lists irrigation events and acknowledges an alert", async () => {
    const actor = makeActor({
      listIrrigationEvents: vi.fn(async () => [
        {
          id: 1n,
          startedAt: 1_700_000_000_000_000_000n,
          endedAt: 1_700_000_060_000_000_000n,
          cause: "manual" as never,
          actuator: Actuator.pump,
          outcome: IrrigationOutcome.completed,
        },
      ]),
      listAlerts: vi.fn(async () => [
        {
          id: 7n,
          kind: { __kind__: "connectionLost", connectionLost: null },
          createdAt: 1_700_000_000_000_000_000n,
          acknowledged: false,
          message: "Se perdió la conexión Bluetooth",
          severity: "critical" as never,
        },
      ]),
    });
    renderPage(<HistoryPage />, actor);

    const user = userEvent.setup();
    await user.click(await screen.findByTestId("history.tab.irrigation"));
    expect(await screen.findByText("Completado")).toBeInTheDocument();

    await user.click(screen.getByTestId("history.tab.alerts"));
    expect(
      await screen.findByText("Se perdió la conexión Bluetooth"),
    ).toBeInTheDocument();
    await user.click(
      await screen.findByTestId("history.alert_acknowledge_button.1"),
    );

    await waitFor(() => {
      expect(actor.acknowledgeAlert).toHaveBeenCalledWith(7n);
    });
  });

  it("falls back to the locally saved snapshot when the backend is empty", async () => {
    const cached = {
      history: [
        {
          id: 1n,
          soilMoisture: 33n,
          temperature: 21n,
          recordedAt: 1_700_000_000_000_000_000n,
        },
      ],
      events: [],
      alerts: [],
      savedAt: 1_700_000_000_000,
    };
    window.localStorage.setItem(
      "monitoreg.history.cache.v1",
      JSON.stringify(cached, (_key, value) =>
        typeof value === "bigint" ? { __bigint__: value.toString() } : value,
      ),
    );

    const actor = makeActor();
    renderPage(<HistoryPage />, actor);

    expect(
      await screen.findByTestId("history.offline_banner"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/mostrando la última copia guardada/i),
    ).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByTestId("history.tab.measurements"));
    expect(await screen.findByText("33%")).toBeInTheDocument();
    expect(screen.getByText("21°C")).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ */
/* Home: offline notice, emergency stop and active alerts              */
/* ------------------------------------------------------------------ */

describe("Inicio", () => {
  it("warns that measurements only show while the Arduino is linked", async () => {
    const actor = makeActor();
    renderWithRouter(<HomePage />, actor);

    expect(
      await screen.findByTestId("home.offline_notice"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/las mediciones se muestran solo cuando/i),
    ).toBeInTheDocument();
  });

  it("shows the live readings and plant health when connected", async () => {
    const actor = makeActor({
      getConnectionStatus: vi.fn(async () => ConnectionStatus.connected),
      getLatestMeasurement: vi.fn(async () => ({
        id: 1n,
        soilMoisture: 42n,
        temperature: 25n,
        ambientHumidity: 60n,
        soilPresence: SensorPresence.present,
        temperaturePresence: SensorPresence.present,
        ambientHumidityPresence: SensorPresence.present,
        recordedAt: 1_700_000_000_000_000_000n,
      })),
      listPlants: vi.fn(async () => [
        {
          id: 1n,
          name: "Albahaca",
          species: "Ocimum basilicum",
          photoFileHash: undefined,
          moistureNeed: 40n,
          careRecommendations: [],
          createdAt: 0n,
          status: PlantStatus.needsWater,
        },
      ]),
    });
    renderWithRouter(<HomePage />, actor);

    expect((await screen.findAllByText("42%")).length).toBeGreaterThan(0);
    expect(screen.getByText("25")).toBeInTheDocument();
    expect(screen.getByText("60")).toBeInTheDocument();
    expect(screen.queryByTestId("home.offline_notice")).toBeNull();
    expect(
      await screen.findByText("1 plantas registradas"),
    ).toBeInTheDocument();
    expect(screen.getByText("1 necesitan agua")).toBeInTheDocument();
  });

  it("triggers the emergency stop from the dashboard while irrigating", async () => {
    const actor = makeActor({
      getConnectionStatus: vi.fn(async () => ConnectionStatus.connected),
      getActiveActuator: vi.fn(async () => Actuator.pump),
    });
    renderWithRouter(<HomePage />, actor);

    const emergency = await screen.findByTestId("home.emergency_stop_button");
    await waitFor(() => expect(emergency).toBeEnabled());

    const user = userEvent.setup();
    await user.click(emergency);

    await waitFor(() => {
      expect(actor.emergencyStopIrrigation).toHaveBeenCalledTimes(1);
    });
  });

  it("lists unacknowledged alerts and hides acknowledged ones", async () => {
    const actor = makeActor({
      listAlerts: vi.fn(async () => [
        {
          id: 1n,
          kind: { __kind__: "connectionLost", connectionLost: null },
          createdAt: 1_700_000_000_000_000_000n,
          acknowledged: false,
          message: "Se perdió la conexión Bluetooth",
          severity: "critical" as never,
        },
        {
          id: 2n,
          kind: { __kind__: "sensorFailure", sensorFailure: "soil" },
          createdAt: 1_700_000_000_000_000_000n,
          acknowledged: true,
          message: "Fallo de sensor ya visto",
          severity: "warning" as never,
        },
      ]),
    });
    renderWithRouter(<HomePage />, actor);

    expect(await screen.findByTestId("home.alerts_card")).toBeInTheDocument();
    expect(
      screen.getByText("Se perdió la conexión Bluetooth"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Fallo de sensor ya visto")).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* Settings: irrigation limits validation and Arduino download         */
/* ------------------------------------------------------------------ */

describe("Configuración", () => {
  it("rejects an out-of-range moisture threshold without saving", async () => {
    const actor = makeActor();
    renderPage(<SettingsPage />, actor);

    const threshold = await screen.findByTestId("settings.threshold_input");
    // Wait for the loaded config to populate the form before editing it.
    await waitFor(() => expect(threshold).toHaveValue(40));
    const user = userEvent.setup();
    await user.clear(threshold);
    await user.type(threshold, "150");
    await user.click(screen.getByTestId("settings.save_button"));

    expect(await screen.findByTestId("settings.error_state")).toHaveTextContent(
      /umbral de humedad debe estar entre 0 y 100/i,
    );
    expect(actor.setIrrigationConfig).not.toHaveBeenCalled();
  });

  it("rejects a max duration below the minimum without saving", async () => {
    const actor = makeActor();
    renderPage(<SettingsPage />, actor);

    const duration = await screen.findByTestId("settings.duration_input");
    await waitFor(() => expect(duration).toHaveValue(60));
    const user = userEvent.setup();
    await user.clear(duration);
    await user.type(duration, "2");
    await user.click(screen.getByTestId("settings.save_button"));

    expect(await screen.findByTestId("settings.error_state")).toHaveTextContent(
      /duración máxima debe estar entre 5 y 3600/i,
    );
    expect(actor.setIrrigationConfig).not.toHaveBeenCalled();
  });

  it("saves valid limits through the backend config", async () => {
    const actor = makeActor({
      getIrrigationConfig: vi.fn(async () => ({
        mode: IrrigationMode.automatic,
        moistureThreshold: 40n,
        maxDurationSeconds: 60n,
      })),
    });
    renderPage(<SettingsPage />, actor);

    const threshold = await screen.findByTestId("settings.threshold_input");
    const duration = screen.getByTestId("settings.duration_input");
    await waitFor(() => expect(duration).toHaveValue(60));
    const user = userEvent.setup();
    await user.clear(threshold);
    await user.type(threshold, "55");
    await user.clear(duration);
    await user.type(duration, "120");
    await user.click(screen.getByTestId("settings.save_button"));

    await waitFor(() => {
      expect(actor.setIrrigationConfig).toHaveBeenCalledWith(
        55n,
        120n,
        IrrigationMode.automatic,
      );
    });
    expect(
      await screen.findByTestId("settings.success_state"),
    ).toHaveTextContent(/configuración guardada/i);
  });

  it("downloads the Arduino sketch and reports a failed download", async () => {
    const actor = makeActor();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        blob: async () => new Blob(["// sketch"]),
      })
      .mockResolvedValueOnce({ ok: false });
    vi.stubGlobal("fetch", fetchMock);
    const createObjectURL = vi.fn(() => "blob:sketch");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL,
      revokeObjectURL,
    });

    try {
      renderPage(<SettingsPage />, actor);
      const user = userEvent.setup();

      await user.click(
        await screen.findByTestId("settings.download_arduino_button"),
      );
      await waitFor(() => expect(createObjectURL).toHaveBeenCalledTimes(1));

      await user.click(screen.getByTestId("settings.download_arduino_button"));
      expect(
        await screen.findByTestId("settings.download_error_state"),
      ).toHaveTextContent(/no se pudo descargar el código/i);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

/* ------------------------------------------------------------------ */
/* Irrigation: automatic threshold display                             */
/* ------------------------------------------------------------------ */

describe("Riego automático", () => {
  it("shows the configured threshold and the current soil moisture", async () => {
    const actor = makeActor({
      getConnectionStatus: vi.fn(async () => ConnectionStatus.connected),
      getIrrigationConfig: vi.fn(async () => ({
        mode: IrrigationMode.automatic,
        moistureThreshold: 35n,
        maxDurationSeconds: 90n,
      })),
      getLatestMeasurement: vi.fn(async () => ({
        id: 1n,
        soilMoisture: 20n,
        temperature: 22n,
        ambientHumidity: 55n,
        soilPresence: SensorPresence.present,
        temperaturePresence: SensorPresence.present,
        ambientHumidityPresence: SensorPresence.present,
        recordedAt: 1_700_000_000_000_000_000n,
      })),
    });
    renderPage(<IrrigationPage />, actor);

    expect(await screen.findByText("Automático")).toBeInTheDocument();
    expect(screen.getByText("35%")).toBeInTheDocument();
    expect(screen.getByText("20%")).toBeInTheDocument();
  });
});
