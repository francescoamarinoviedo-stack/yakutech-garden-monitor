import List "mo:core/List";
import Map "mo:core/Map";
import Time "mo:core/Time";
import Runtime "mo:core/Runtime";
import AccessControl "mo:caffeineai-authorization/access-control";

import Types "../types/monitoring";
import BluetoothTypes "../types/bluetooth";
import PlantsTypes "../types/plants";
import HistoryTypes "../types/history";
import IrrigationTypes "../types/irrigation";
import MonitoringLib "../lib/monitoring";
import IrrigationLib "../lib/irrigation";
import HistoryLib "../lib/history";

mixin (
  accessControlState : AccessControl.AccessControlState,
  measurements : List.List<Types.Measurement>,
  plants : Map.Map<Nat, PlantsTypes.Plant>,
  alerts : List.List<HistoryTypes.Alert>,
  bluetoothState : BluetoothTypes.BluetoothState,
  irrigationConfig : IrrigationTypes.IrrigationConfig,
  irrigationState : IrrigationTypes.IrrigationState,
  irrigationEvents : List.List<IrrigationTypes.IrrigationEvent>,
  counters : { var nextPlantId : Nat; var nextMeasurementId : Nat; var nextEventId : Nat; var nextAlertId : Nat },
) {
  public type Measurement = Types.Measurement;
  public type LatestMeasurement = Types.LatestMeasurement;
  public type PlantStatus = Types.PlantStatus;

  /// Append an irrigation event triggered by an automatic decision.
  func recordIrrigationEvent(cause : IrrigationTypes.IrrigationCause, outcome : IrrigationTypes.IrrigationOutcome, actuator : IrrigationTypes.Actuator, startedAt : Int) : () {
    let id = counters.nextEventId;
    counters.nextEventId := id + 1;
    irrigationEvents.add({
      id;
      cause;
      outcome;
      actuator;
      startedAt;
      endedAt = ?Time.now();
    });
  };

  /// Store a validated sensor frame as a measurement.
  public shared ({ caller }) func recordMeasurement(
    soilMoisture : ?Nat,
    temperature : ?Int,
    ambientHumidity : ?Nat,
  ) : async Measurement {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can record measurements");
    };
    let id = counters.nextMeasurementId;
    counters.nextMeasurementId := id + 1;
    let now = Time.now();
    let measurement : Measurement = {
      id;
      soilMoisture;
      temperature;
      ambientHumidity;
      soilPresence = if (soilMoisture == null) { #absent } else { #present };
      temperaturePresence = if (temperature == null) { #absent } else { #present };
      ambientHumidityPresence = if (ambientHumidity == null) { #absent } else { #present };
      recordedAt = now;
    };
    measurements.add(measurement);
    bluetoothState.lastSeenAt := ?now;
    if (soilMoisture == null) {
      let alertId = counters.nextAlertId;
      counters.nextAlertId := alertId + 1;
      alerts.add({
        id = alertId;
        kind = #sensorFailure("soil moisture sensor");
        severity = #warning;
        message = "Soil moisture sensor did not report a reading";
        createdAt = now;
        acknowledged = false;
      });
    };
    // Automatic irrigation: start when the reading falls below the threshold.
    if (IrrigationLib.shouldIrrigate(irrigationConfig, soilMoisture)) {
      let actuator = #pump;
      switch (IrrigationLib.start(irrigationState, actuator, #automatic)) {
        case (#blocked) {
          recordIrrigationEvent(#automatic, #blocked, actuator, now);
        };
        case (_) {
          irrigationState.startedAt := ?now;
        };
      };
    };
    // Needs-water alerts: one per plant whose moisture need exceeds the reading.
    switch (soilMoisture) {
      case null {};
      case (?moisture) {
        for (plant in plants.values()) {
          if (moisture < plant.moistureNeed) {
            let alertId = counters.nextAlertId;
            counters.nextAlertId := alertId + 1;
            let alert = HistoryLib.plantNeedsWaterAlert(plant.id, "Plant " # plant.name # " needs water", now);
            alerts.add({ alert with id = alertId });
          };
        };
      };
    };
    measurement;
  };

  /// Read the most recent measurement, or `null` when none exists.
  public query ({ caller }) func getLatestMeasurement() : async LatestMeasurement {
    ignore caller;
    MonitoringLib.latest(measurements.toArray());
  };

  /// Read the derived status of a plant from the latest measurement.
  public query ({ caller }) func getPlantStatus(plantId : Nat) : async PlantStatus {
    ignore caller;
    let latest = MonitoringLib.latest(measurements.toArray());
    switch (plants.get(plantId)) {
      case null { #needsAttention };
      case (?plant) { MonitoringLib.deriveStatus(latest, plant.moistureNeed) };
    };
  };
};
