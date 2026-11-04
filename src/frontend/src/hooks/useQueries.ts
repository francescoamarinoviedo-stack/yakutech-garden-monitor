import { createActor } from "@/backend";
import type {
  Actuator,
  Alert,
  ConnectionStatus,
  HistoryPoint,
  IrrigationConfigView,
  IrrigationEvent,
  IrrigationMode,
  LatestMeasurement,
  Measurement,
  PairedDevice,
  Plant,
  PlantStatus,
  PlantView,
  SensorFrame,
} from "@/backend";
import { useActor } from "@caffeineai/core-infrastructure";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

/* ------------------------------------------------------------------ */
/* Query keys                                                          */
/* ------------------------------------------------------------------ */

export const queryKeys = {
  connectionStatus: ["connectionStatus"] as const,
  pairedDevice: ["pairedDevice"] as const,
  latestMeasurement: ["latestMeasurement"] as const,
  plantStatus: (plantId: bigint) =>
    ["plantStatus", plantId.toString()] as const,
  irrigationConfig: ["irrigationConfig"] as const,
  activeActuator: ["activeActuator"] as const,
  irrigationEvents: ["irrigationEvents"] as const,
  plants: ["plants"] as const,
  plant: (id: bigint) => ["plant", id.toString()] as const,
  alerts: ["alerts"] as const,
  history: (limit: bigint) => ["history", limit.toString()] as const,
};

/* ------------------------------------------------------------------ */
/* Bluetooth connection                                                */
/* ------------------------------------------------------------------ */

export function useConnectionStatus() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<ConnectionStatus>({
    queryKey: queryKeys.connectionStatus,
    queryFn: async () => {
      if (!actor) return "disconnected" as ConnectionStatus;
      return actor.getConnectionStatus();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 5000,
  });
}

export function usePairedDevice() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<PairedDevice | null>({
    queryKey: queryKeys.pairedDevice,
    queryFn: async () => {
      if (!actor) return null;
      return actor.getPairedDevice();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSetPairedDevice() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (device: PairedDevice) => {
      if (!actor) throw new Error("El backend no está listo");
      return actor.setPairedDevice(device);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.pairedDevice });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.connectionStatus,
      });
    },
  });
}

export function useDisconnectBluetooth() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("El backend no está listo");
      return actor.disconnectBluetooth();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.connectionStatus,
      });
    },
  });
}

export function useReportConnectionLost() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("El backend no está listo");
      return actor.reportConnectionLost();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.connectionStatus,
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.alerts });
    },
  });
}

/* ------------------------------------------------------------------ */
/* Measurements                                                        */
/* ------------------------------------------------------------------ */

export function useLatestMeasurement() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<LatestMeasurement>({
    queryKey: queryKeys.latestMeasurement,
    queryFn: async () => {
      if (!actor) return null;
      return actor.getLatestMeasurement();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 5000,
  });
}

export function useParseSerialFrame() {
  const { actor } = useActor(createActor);
  return useMutation({
    mutationFn: async (raw: string) => {
      if (!actor) throw new Error("El backend no está listo");
      return actor.parseSerialFrame(raw);
    },
  });
}

export function useRecordMeasurement() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (frame: SensorFrame) => {
      if (!actor) throw new Error("El backend no está listo");
      return actor.recordMeasurement(
        frame.soilMoisture ?? null,
        frame.temperature ?? null,
        frame.ambientHumidity ?? null,
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.latestMeasurement,
      });
      void queryClient.invalidateQueries({ queryKey: ["history"] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.plants });
      void queryClient.invalidateQueries({ queryKey: queryKeys.alerts });
    },
  });
}

export function usePlantStatus(plantId: bigint | null) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<PlantStatus>({
    queryKey: queryKeys.plantStatus(plantId ?? 0n),
    queryFn: async () => {
      if (!actor || plantId === null) return "healthy" as PlantStatus;
      return actor.getPlantStatus(plantId);
    },
    enabled: !!actor && !isFetching && plantId !== null,
  });
}

/* ------------------------------------------------------------------ */
/* Irrigation                                                          */
/* ------------------------------------------------------------------ */

export function useIrrigationConfig() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<IrrigationConfigView>({
    queryKey: queryKeys.irrigationConfig,
    queryFn: async () => {
      if (!actor) throw new Error("El backend no está listo");
      return actor.getIrrigationConfig();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSetIrrigationConfig() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (config: {
      moistureThreshold: bigint;
      maxDurationSeconds: bigint;
      mode: IrrigationMode;
    }) => {
      if (!actor) throw new Error("El backend no está listo");
      return actor.setIrrigationConfig(
        config.moistureThreshold,
        config.maxDurationSeconds,
        config.mode,
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.irrigationConfig,
      });
    },
  });
}

export function useActiveActuator() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<Actuator>({
    queryKey: queryKeys.activeActuator,
    queryFn: async () => {
      if (!actor) return "none" as Actuator;
      return actor.getActiveActuator();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 3000,
  });
}

export function useStartManualIrrigation() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (actuator: Actuator) => {
      if (!actor) throw new Error("El backend no está listo");
      return actor.startManualIrrigation(actuator);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.activeActuator,
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.irrigationEvents,
      });
    },
  });
}

export function useStopIrrigation() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("El backend no está listo");
      return actor.stopIrrigation();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.activeActuator,
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.irrigationEvents,
      });
    },
  });
}

export function useEmergencyStopIrrigation() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("El backend no está listo");
      return actor.emergencyStopIrrigation();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.activeActuator,
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.irrigationEvents,
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.alerts });
    },
  });
}

export function useIrrigationEvents() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<IrrigationEvent[]>({
    queryKey: queryKeys.irrigationEvents,
    queryFn: async () => {
      if (!actor) return [];
      return actor.listIrrigationEvents();
    },
    enabled: !!actor && !isFetching,
  });
}

/* ------------------------------------------------------------------ */
/* Plants                                                              */
/* ------------------------------------------------------------------ */

export function usePlants() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<PlantView[]>({
    queryKey: queryKeys.plants,
    queryFn: async () => {
      if (!actor) return [];
      return actor.listPlants();
    },
    enabled: !!actor && !isFetching,
  });
}

export function usePlant(id: bigint | null) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<PlantView | null>({
    queryKey: queryKeys.plant(id ?? 0n),
    queryFn: async () => {
      if (!actor || id === null) return null;
      return actor.getPlant(id);
    },
    enabled: !!actor && !isFetching && id !== null,
  });
}

export interface PlantInput {
  name: string;
  species: string;
  photoFileHash: string | null;
  moistureNeed: bigint;
  careRecommendations: string[];
}

export function useAddPlant() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: PlantInput): Promise<Plant> => {
      if (!actor) throw new Error("El backend no está listo");
      return actor.addPlant(
        input.name,
        input.species,
        input.photoFileHash,
        input.moistureNeed,
        input.careRecommendations,
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.plants });
    },
  });
}

export function useUpdatePlant() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: PlantInput & { id: bigint },
    ): Promise<Plant | null> => {
      if (!actor) throw new Error("El backend no está listo");
      return actor.updatePlant(
        input.id,
        input.name,
        input.species,
        input.photoFileHash,
        input.moistureNeed,
        input.careRecommendations,
      );
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.plants });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.plant(variables.id),
      });
    },
  });
}

export function useDeletePlant() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("El backend no está listo");
      return actor.deletePlant(id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.plants });
    },
  });
}

/* ------------------------------------------------------------------ */
/* Alerts                                                              */
/* ------------------------------------------------------------------ */

export function useAlerts() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<Alert[]>({
    queryKey: queryKeys.alerts,
    queryFn: async () => {
      if (!actor) return [];
      return actor.listAlerts();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 10000,
  });
}

export function useAcknowledgeAlert() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("El backend no está listo");
      return actor.acknowledgeAlert(id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.alerts });
    },
  });
}

/* ------------------------------------------------------------------ */
/* History                                                             */
/* ------------------------------------------------------------------ */

export function useHistory(limit: bigint) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<HistoryPoint[]>({
    queryKey: queryKeys.history(limit),
    queryFn: async () => {
      if (!actor) return [];
      return actor.getHistory(limit);
    },
    enabled: !!actor && !isFetching,
  });
}

export type { Measurement };
