import { PocketIc, createIdentity } from "@dfinity/pic";
import type { Actor, CanisterFixture } from "@dfinity/pic";
import { afterAll, beforeAll, expect, it } from "vitest";

import { idlFactory } from "../../src/frontend/src/declarations/backend.did.js";
import type { _SERVICE } from "../../src/frontend/src/declarations/backend.did";

const PIC_URL = process.env.POCKET_IC_URL ?? "";
const BACKEND_WASM = process.env.BACKEND_WASM ?? "";

let pic: PocketIc | undefined;
let actor: Actor<_SERVICE>;
let canisterId: CanisterFixture<_SERVICE>["canisterId"];

const alice = createIdentity("alice");
const bob = createIdentity("bob");

beforeAll(async () => {
  pic = await PocketIc.create(PIC_URL);
  ({ actor, canisterId } = await pic.setupCanister<_SERVICE>({
    idlFactory,
    wasm: BACKEND_WASM,
  }));
  // The first initialized caller becomes administrator; register the rest
  // through the same public flow the app uses.
  actor.setIdentity(alice);
  await actor._initialize_access_control();
  actor.setIdentity(bob);
  await actor._initialize_access_control();
});

afterAll(async () => {
  await pic?.tearDown();
});

it("answers empty-state reads instead of trapping", async () => {
  actor.setIdentity(alice);
  await expect(actor.listPlants()).resolves.toEqual([]);
  await expect(actor.listAlerts()).resolves.toEqual([]);
  await expect(actor.listIrrigationEvents()).resolves.toEqual([]);
  await expect(actor.getHistory(10n)).resolves.toEqual([]);
  await expect(actor.getLatestMeasurement()).resolves.toEqual([]);
  await expect(actor.getPairedDevice()).resolves.toEqual([]);
  await expect(actor.getActiveActuator()).resolves.toEqual({ none: null });
  await expect(actor.getConnectionStatus()).resolves.toEqual({
    disconnected: null,
  });
});

it("round-trips a plant through the real canister", async () => {
  actor.setIdentity(alice);
  const plant = await actor.addPlant(
    "Albahaca",
    "Ocimum basilicum",
    [],
    40n,
    ["Riego moderado"],
  );
  expect(plant.name).toBe("Albahaca");
  expect(plant.moistureNeed).toBe(40n);

  const plants = await actor.listPlants();
  expect(plants).toHaveLength(1);
  expect(plants[0]).toMatchObject({ name: "Albahaca", species: "Ocimum basilicum" });
});

it("parses a valid serial frame and rejects a malformed one", async () => {
  actor.setIdentity(alice);
  const ok = await actor.parseSerialFrame("SOIL:42,TEMP:25,HUM:60");
  expect(ok).toHaveProperty("ok");
  if ("ok" in ok) {
    expect(ok.ok.soilMoisture).toEqual([42n]);
    expect(ok.ok.temperature).toEqual([25n]);
    expect(ok.ok.ambientHumidity).toEqual([60n]);
  }

  const bad = await actor.parseSerialFrame("GARBAGE");
  expect(bad).toHaveProperty("malformed");
});

it("records a measurement and derives plant status from it", async () => {
  actor.setIdentity(alice);
  const plant = await actor.addPlant("Menta", "Mentha", [], 50n, []);
  const measurement = await actor.recordMeasurement([30n], [20n], [55n]);
  expect(measurement.soilMoisture).toEqual([30n]);
  expect(measurement.soilPresence).toEqual({ present: null });

  // 30 < 50, so the plant needs water.
  await expect(actor.getPlantStatus(plant.id)).resolves.toEqual({
    needsWater: null,
  });
  const latest = await actor.getLatestMeasurement();
  expect(latest).toHaveLength(1);
});

it("enforces pump/valve exclusivity and stops on emergency", async () => {
  actor.setIdentity(alice);
  await actor.startManualIrrigation({ pump: null });
  await expect(actor.getActiveActuator()).resolves.toEqual({ pump: null });

  // A second start while one actuator is active is blocked, not switched.
  await actor.startManualIrrigation({ valve: null });
  await expect(actor.getActiveActuator()).resolves.toEqual({ pump: null });

  await actor.emergencyStopIrrigation();
  await expect(actor.getActiveActuator()).resolves.toEqual({ none: null });
});

it("stops irrigation and raises an alert when the connection is lost", async () => {
  actor.setIdentity(alice);
  await actor.startManualIrrigation({ valve: null });
  await actor.reportConnectionLost();

  await expect(actor.getActiveActuator()).resolves.toEqual({ none: null });
  await expect(actor.getConnectionStatus()).resolves.toEqual({ lost: null });
  const alerts = await actor.listAlerts();
  expect(alerts.some((alert) => "connectionLost" in alert.kind)).toBe(true);
});

it("updates the irrigation configuration", async () => {
  actor.setIdentity(alice);
  await actor.setIrrigationConfig(55n, 120n, { automatic: null });
  const config = await actor.getIrrigationConfig();
  expect(config.moistureThreshold).toBe(55n);
  expect(config.maxDurationSeconds).toBe(120n);
  expect(config.mode).toEqual({ automatic: null });
});

it("rejects an anonymous caller on a guarded write", async () => {
  const guest = pic!.createActor<_SERVICE>(idlFactory, canisterId);
  await expect(guest.addPlant("X", "Y", [], 10n, [])).rejects.toThrow();
});
