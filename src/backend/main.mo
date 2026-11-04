import AccessControl "mo:caffeineai-authorization/access-control";
import MixinAuthorization "mo:caffeineai-authorization/MixinAuthorization";
import MixinObjectStorage "mo:caffeineai-object-storage/Mixin";
import Expose "mo:caffeineai-oql/Expose";
import Map "mo:core/Map";
import List "mo:core/List";

import Entity "mo:caffeineai-oql/Entity";
import MapEntity "mo:caffeineai-oql/MapEntity";
import ListEntity "mo:caffeineai-oql/ListEntity";
import RecordValue "mo:caffeineai-oql/RecordValue";
import NatValue "mo:caffeineai-oql/NatValue";
import IntValue "mo:caffeineai-oql/IntValue";
import TextValue "mo:caffeineai-oql/TextValue";
import BoolValue "mo:caffeineai-oql/BoolValue";

import SensorPresenceValue "types/SensorPresenceValue";
import AlertSeverityValue "types/AlertSeverityValue";
import IrrigationCauseValue "types/IrrigationCauseValue";
import IrrigationOutcomeValue "types/IrrigationOutcomeValue";
import ActuatorValue "types/ActuatorValue";
import AlertKindValue "types/AlertKindValue";

import BluetoothTypes "types/bluetooth";
import MonitoringTypes "types/monitoring";
import IrrigationTypes "types/irrigation";
import PlantsTypes "types/plants";
import HistoryTypes "types/history";

import BluetoothApi "mixins/bluetooth-api";
import MonitoringApi "mixins/monitoring-api";
import IrrigationApi "mixins/irrigation-api";
import PlantsApi "mixins/plants-api";
import HistoryApi "mixins/history-api";
import ApiDocMixin "mixins/api-doc";

actor {
  let accessControlState : AccessControl.AccessControlState;

  let bluetoothState : BluetoothTypes.BluetoothState;
  let measurements : List.List<MonitoringTypes.Measurement>;
  let irrigationConfig : IrrigationTypes.IrrigationConfig;
  let irrigationState : IrrigationTypes.IrrigationState;
  let irrigationEvents : List.List<IrrigationTypes.IrrigationEvent>;
  let plants : Map.Map<Nat, PlantsTypes.Plant>;
  let alerts : List.List<HistoryTypes.Alert>;
  let counters : { var nextPlantId : Nat; var nextMeasurementId : Nat; var nextEventId : Nat; var nextAlertId : Nat };

  include MixinAuthorization(accessControlState, null);
  include MixinObjectStorage();
  include BluetoothApi(bluetoothState, irrigationState, irrigationEvents, alerts, counters);
  include MonitoringApi(accessControlState, measurements, plants, alerts, bluetoothState, irrigationConfig, irrigationState, irrigationEvents, counters);
  include IrrigationApi(accessControlState, irrigationConfig, irrigationState, irrigationEvents, counters);
  include PlantsApi(accessControlState, plants, measurements, counters);
  include HistoryApi(alerts, measurements);
  include ApiDocMixin();

  include Expose({
    entities = [
      plants.toEntityManual("plant", "Plant", "id")
        .sample({
          id = 0;
          name = "";
          species = "";
          photoFileHash = ?"";
          moistureNeed = 0;
          careRecommendations = [];
          createdAt = 0;
        })
        .payload("id", func p = p.id)
        .payload("name", func p = p.name)
        .payload("species", func p = p.species)
        .payload("photoFileHash", func p = p.photoFileHash)
        .payload("moistureNeed", func p = p.moistureNeed)
        .payload("careRecommendations", func p = p.careRecommendations.values().join("; "))
        .payload("createdAt", func p = p.createdAt)
        .controllerOnly()
        .build(),
      measurements.toEntity("measurement", "Measurement", "id")
        .sample({
          id = 0;
          soilMoisture = ?0;
          temperature = ?0;
          ambientHumidity = ?0;
          soilPresence = #present;
          temperaturePresence = #present;
          ambientHumidityPresence = #present;
          recordedAt = 0;
        })
        .controllerOnly()
        .build(),
      irrigationEvents.toEntity("irrigationEvent", "IrrigationEvent", "id")
        .sample({
          id = 0;
          cause = #manual;
          outcome = #completed;
          actuator = #pump;
          startedAt = 0;
          endedAt = ?0;
        })
        .controllerOnly()
        .build(),
      alerts.toEntity("alert", "Alert", "id")
        .sample({
          id = 0;
          kind = #connectionLost;
          severity = #info;
          message = "";
          createdAt = 0;
          acknowledged = false;
        })
        .controllerOnly()
        .build(),
    ];
  });
};
