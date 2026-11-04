import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Alert {
    id: Id;
    kind: AlertKind;
    createdAt: Timestamp;
    acknowledged: boolean;
    message: string;
    severity: AlertSeverity;
}
export type AlertKind = {
    __kind__: "plantNeedsWater";
    plantNeedsWater: Id;
} | {
    __kind__: "connectionLost";
    connectionLost: null;
} | {
    __kind__: "sensorFailure";
    sensorFailure: string;
};
export interface Cell {
    value: Value;
    name: string;
}
export type Error_ = {
    __kind__: "FrontendOriginsNotConfigured";
    FrontendOriginsNotConfigured: null;
} | {
    __kind__: "MixedSsoSources";
    MixedSsoSources: {
        otherKeys: Array<string>;
        ssoKeys: Array<string>;
    };
} | {
    __kind__: "Stale";
    Stale: {
        ageNs: bigint;
    };
} | {
    __kind__: "MalformedCandid";
    MalformedCandid: null;
} | {
    __kind__: "AmbiguousAttribute";
    AmbiguousAttribute: {
        field: string;
        sources: Array<string>;
    };
} | {
    __kind__: "NoAttributes";
    NoAttributes: null;
} | {
    __kind__: "UnknownNonce";
    UnknownNonce: null;
} | {
    __kind__: "UntrustedSsoSource";
    UntrustedSsoSource: {
        domain: string;
    };
} | {
    __kind__: "MissingField";
    MissingField: string;
} | {
    __kind__: "FrontendOriginMismatch";
    FrontendOriginMismatch: {
        got: string;
        expected: Array<string>;
    };
};
export type FrameParseResult = {
    __kind__: "ok";
    ok: SensorFrame;
} | {
    __kind__: "malformed";
    malformed: string;
};
export interface HistoryPoint {
    soilMoisture?: bigint;
    temperature?: bigint;
    recordedAt: Timestamp;
}
export type Id = bigint;
export interface IrrigationConfigView {
    mode: IrrigationMode;
    moistureThreshold: bigint;
    maxDurationSeconds: bigint;
}
export interface IrrigationEvent {
    id: Id;
    startedAt: Timestamp;
    endedAt?: Timestamp;
    cause: IrrigationCause;
    actuator: Actuator;
    outcome: IrrigationOutcome;
}
export type LatestMeasurement = Measurement | null;
export interface Measurement {
    id: Id;
    soilMoisture?: bigint;
    ambientHumidityPresence: SensorPresence;
    temperaturePresence: SensorPresence;
    temperature?: bigint;
    recordedAt: Timestamp;
    ambientHumidity?: bigint;
    soilPresence: SensorPresence;
}
export interface PairedDevice {
    name: string;
    address: string;
}
export interface Plant {
    id: Id;
    name: string;
    createdAt: Timestamp;
    moistureNeed: bigint;
    careRecommendations: Array<string>;
    species: string;
    photoFileHash?: string;
}
export interface PlantView {
    id: Id;
    status: string;
    name: string;
    createdAt: Timestamp;
    moistureNeed: bigint;
    careRecommendations: Array<string>;
    species: string;
    photoFileHash?: string;
}
export interface Result {
    hasMore: boolean;
    rows: Array<Array<Cell>>;
}
export type Result__1 = {
    __kind__: "ok";
    ok: null;
} | {
    __kind__: "err";
    err: Error_;
};
export interface SensorFrame {
    soilMoisture?: bigint;
    temperature?: bigint;
    ambientHumidity?: bigint;
    receivedAt: Timestamp;
}
export type Timestamp = bigint;
export type Value = {
    __kind__: "int";
    int: bigint;
} | {
    __kind__: "nat";
    nat: bigint;
} | {
    __kind__: "float";
    float: number;
} | {
    __kind__: "bool";
    bool: boolean;
} | {
    __kind__: "null";
    null: null;
} | {
    __kind__: "text";
    text: string;
};
export enum Actuator {
    valve = "valve",
    none = "none",
    pump = "pump"
}
export enum AlertSeverity {
    warning = "warning",
    info = "info",
    critical = "critical"
}
export enum ConnectionStatus {
    lost = "lost",
    disconnected = "disconnected",
    connected = "connected",
    connecting = "connecting"
}
export enum IrrigationCause {
    emergency = "emergency",
    automatic = "automatic",
    manual = "manual"
}
export enum IrrigationMode {
    automatic = "automatic",
    manual = "manual"
}
export enum IrrigationOutcome {
    blocked = "blocked",
    completed = "completed",
    stoppedManually = "stoppedManually",
    maxDurationReached = "maxDurationReached",
    connectionLost = "connectionLost",
    emergencyStop = "emergencyStop"
}
export enum PlantStatus {
    needsAttention = "needsAttention",
    healthy = "healthy",
    needsWater = "needsWater"
}
export enum SensorPresence {
    present = "present",
    absent = "absent"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    /**
     * / Mark an alert as acknowledged.
     */
    acknowledgeAlert(id: bigint): Promise<boolean>;
    /**
     * / Register a new plant with its name, species, photo and moisture need.
     */
    addPlant(name: string, species: string, photoFileHash: string | null, moistureNeed: bigint, careRecommendations: Array<string>): Promise<Plant>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    /**
     * / Remove a plant by id.
     */
    deletePlant(id: bigint): Promise<boolean>;
    /**
     * / Mark the Bluetooth link as disconnected.
     */
    disconnectBluetooth(): Promise<void>;
    /**
     * / Trigger the emergency stop, halting any active irrigation.
     */
    emergencyStopIrrigation(): Promise<void>;
    execute(qJson: string): Promise<Result>;
    /**
     * / Read the current active actuator.
     */
    getActiveActuator(): Promise<Actuator>;
    getApiDoc(): Promise<string>;
    getCallerUserRole(): Promise<UserRole>;
    /**
     * / Read the current Bluetooth connection status.
     */
    getConnectionStatus(): Promise<ConnectionStatus>;
    /**
     * / Read moisture and temperature history points for charting.
     */
    getHistory(limit: bigint): Promise<Array<HistoryPoint>>;
    /**
     * / Read the current irrigation configuration.
     */
    getIrrigationConfig(): Promise<IrrigationConfigView>;
    /**
     * / Read the most recent measurement, or `null` when none exists.
     */
    getLatestMeasurement(): Promise<LatestMeasurement>;
    /**
     * / Read the last paired Bluetooth device, if any.
     */
    getPairedDevice(): Promise<PairedDevice | null>;
    /**
     * / Read a single plant with its current status.
     */
    getPlant(id: bigint): Promise<PlantView | null>;
    /**
     * / Read the derived status of a plant from the latest measurement.
     */
    getPlantStatus(plantId: bigint): Promise<PlantStatus>;
    isCallerAdmin(): Promise<boolean>;
    /**
     * / List recorded alerts, most recent first.
     */
    listAlerts(): Promise<Array<Alert>>;
    /**
     * / Read recorded irrigation events, most recent first.
     */
    listIrrigationEvents(): Promise<Array<IrrigationEvent>>;
    /**
     * / List all registered plants with their current status.
     */
    listPlants(): Promise<Array<PlantView>>;
    /**
     * / Validate and parse a raw serial frame received from the Arduino.
     */
    parseSerialFrame(raw: string): Promise<FrameParseResult>;
    /**
     * / Store a validated sensor frame as a measurement.
     */
    recordMeasurement(soilMoisture: bigint | null, temperature: bigint | null, ambientHumidity: bigint | null): Promise<Measurement>;
    /**
     * / Mark the Bluetooth link as lost after a communication timeout.
     * / Stops any active irrigation and raises a connection-lost alert.
     */
    reportConnectionLost(): Promise<void>;
    schema(): Promise<string>;
    /**
     * / Update the moisture threshold, max duration and mode.
     */
    setIrrigationConfig(moistureThreshold: bigint, maxDurationSeconds: bigint, mode: IrrigationMode): Promise<void>;
    /**
     * / Report the last paired Bluetooth device and mark the link connected.
     */
    setPairedDevice(device: PairedDevice): Promise<void>;
    /**
     * / Start manual irrigation on the given actuator.
     */
    startManualIrrigation(actuator: Actuator): Promise<void>;
    /**
     * / Stop any active irrigation.
     */
    stopIrrigation(): Promise<void>;
    /**
     * / Update an existing plant's details.
     */
    updatePlant(id: bigint, name: string, species: string, photoFileHash: string | null, moistureNeed: bigint, careRecommendations: Array<string>): Promise<Plant | null>;
}
