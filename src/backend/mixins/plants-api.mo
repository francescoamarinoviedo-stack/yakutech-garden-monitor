import Map "mo:core/Map";
import List "mo:core/List";
import Time "mo:core/Time";
import Runtime "mo:core/Runtime";
import AccessControl "mo:caffeineai-authorization/access-control";

import Types "../types/plants";
import MonitoringTypes "../types/monitoring";
import PlantsLib "../lib/plants";
import MonitoringLib "../lib/monitoring";

mixin (
  accessControlState : AccessControl.AccessControlState,
  plants : Map.Map<Nat, Types.Plant>,
  measurements : List.List<MonitoringTypes.Measurement>,
  counters : { var nextPlantId : Nat; var nextMeasurementId : Nat; var nextEventId : Nat; var nextAlertId : Nat },
) {
  public type Plant = Types.Plant;
  public type PlantView = Types.PlantView;

  /// Render a derived plant status as a stable text label for the API.
  func statusText(status : MonitoringTypes.PlantStatus) : Text {
    switch (status) {
      case (#healthy) { "healthy" };
      case (#needsWater) { "needsWater" };
      case (#needsAttention) { "needsAttention" };
    };
  };

  /// Derive the current status of a plant from the latest measurement.
  func currentStatus(plant : Types.Plant) : Text {
    let latest = MonitoringLib.latest(measurements.toArray());
    statusText(MonitoringLib.deriveStatus(latest, plant.moistureNeed));
  };

  /// Register a new plant with its name, species, photo and moisture need.
  public shared ({ caller }) func addPlant(
    name : Text,
    species : Text,
    photoFileHash : ?Text,
    moistureNeed : Nat,
    careRecommendations : [Text],
  ) : async Plant {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can register plants");
    };
    let id = counters.nextPlantId;
    counters.nextPlantId := id + 1;
    let plant : Plant = {
      id;
      name;
      species;
      photoFileHash;
      moistureNeed;
      careRecommendations;
      createdAt = Time.now();
    };
    plants.add(id, plant);
    plant;
  };

  /// Update an existing plant's details.
  public shared ({ caller }) func updatePlant(
    id : Nat,
    name : Text,
    species : Text,
    photoFileHash : ?Text,
    moistureNeed : Nat,
    careRecommendations : [Text],
  ) : async ?Plant {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can update plants");
    };
    switch (plants.get(id)) {
      case null { null };
      case (?existing) {
        let updated : Plant = {
          id = existing.id;
          name;
          species;
          photoFileHash;
          moistureNeed;
          careRecommendations;
          createdAt = existing.createdAt;
        };
        plants.add(id, updated);
        ?updated;
      };
    };
  };

  /// Remove a plant by id.
  public shared ({ caller }) func deletePlant(id : Nat) : async Bool {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can delete plants");
    };
    switch (plants.get(id)) {
      case null { false };
      case (?_) {
        plants.remove(id);
        true;
      };
    };
  };

  /// List all registered plants with their current status.
  public query ({ caller }) func listPlants() : async [PlantView] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can list plants");
    };
    plants.values().map(func(plant) = PlantsLib.toView(plant, currentStatus(plant))).toArray();
  };

  /// Read a single plant with its current status.
  public query ({ caller }) func getPlant(id : Nat) : async ?PlantView {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can read plants");
    };
    switch (plants.get(id)) {
      case null { null };
      case (?plant) { ?PlantsLib.toView(plant, currentStatus(plant)) };
    };
  };
};
