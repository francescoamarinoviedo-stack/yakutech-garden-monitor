import List "mo:core/List";
import Time "mo:core/Time";
import Runtime "mo:core/Runtime";
import AccessControl "mo:caffeineai-authorization/access-control";

import Types "../types/irrigation";
import IrrigationLib "../lib/irrigation";

mixin (
  accessControlState : AccessControl.AccessControlState,
  irrigationConfig : Types.IrrigationConfig,
  irrigationState : Types.IrrigationState,
  irrigationEvents : List.List<Types.IrrigationEvent>,
  counters : { var nextPlantId : Nat; var nextMeasurementId : Nat; var nextEventId : Nat; var nextAlertId : Nat },
) {
  public type IrrigationConfig = Types.IrrigationConfig;
  public type IrrigationConfigView = Types.IrrigationConfigView;
  public type IrrigationEvent = Types.IrrigationEvent;
  public type IrrigationMode = Types.IrrigationMode;
  public type Actuator = Types.Actuator;

  /// Append an irrigation event with the given cause, outcome and actuator.
  func recordEvent(cause : Types.IrrigationCause, outcome : Types.IrrigationOutcome, actuator : Types.Actuator, startedAt : Int) : () {
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

  /// Stop irrigation if it has exceeded the configured maximum duration.
  func enforceMaxDurationNow() : () {
    let actuator = irrigationState.active;
    let startedAt = irrigationState.startedAt ?? Time.now();
    switch (IrrigationLib.enforceMaxDuration(irrigationState, irrigationConfig, Time.now())) {
      case null {};
      case (?outcome) {
        recordEvent(#automatic, outcome, actuator, startedAt);
      };
    };
  };

  /// Read the current irrigation configuration.
  public query ({ caller }) func getIrrigationConfig() : async IrrigationConfigView {
    ignore caller;
    {
      moistureThreshold = irrigationConfig.moistureThreshold;
      maxDurationSeconds = irrigationConfig.maxDurationSeconds;
      mode = irrigationConfig.mode;
    };
  };

  /// Update the moisture threshold, max duration and mode.
  public shared ({ caller }) func setIrrigationConfig(
    moistureThreshold : Nat,
    maxDurationSeconds : Nat,
    mode : IrrigationMode,
  ) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can change irrigation settings");
    };
    irrigationConfig.moistureThreshold := moistureThreshold;
    irrigationConfig.maxDurationSeconds := maxDurationSeconds;
    irrigationConfig.mode := mode;
  };

  /// Start manual irrigation on the given actuator.
  public shared ({ caller }) func startManualIrrigation(actuator : Actuator) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can start irrigation");
    };
    enforceMaxDurationNow();
    let now = Time.now();
    switch (IrrigationLib.start(irrigationState, actuator, #manual)) {
      case (#blocked) {
        recordEvent(#manual, #blocked, actuator, now);
      };
      case (_) {
        irrigationState.startedAt := ?now;
      };
    };
  };

  /// Stop any active irrigation.
  public shared ({ caller }) func stopIrrigation() : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can stop irrigation");
    };
    enforceMaxDurationNow();
    switch (irrigationState.active) {
      case (#none) {};
      case (_) {
        let actuator = irrigationState.active;
        let startedAt = irrigationState.startedAt ?? Time.now();
        IrrigationLib.stop(irrigationState, #stoppedManually);
        recordEvent(#manual, #stoppedManually, actuator, startedAt);
      };
    };
  };

  /// Trigger the emergency stop, halting any active irrigation.
  public shared ({ caller }) func emergencyStopIrrigation() : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can trigger the emergency stop");
    };
    let actuator = irrigationState.active;
    let startedAt = irrigationState.startedAt ?? Time.now();
    IrrigationLib.emergencyStop(irrigationState);
    recordEvent(#emergency, #emergencyStop, actuator, startedAt);
  };

  /// Read the current active actuator.
  public query ({ caller }) func getActiveActuator() : async Actuator {
    ignore caller;
    irrigationState.active;
  };

  /// Read recorded irrigation events, most recent first.
  public query ({ caller }) func listIrrigationEvents() : async [IrrigationEvent] {
    ignore caller;
    let snapshot = irrigationEvents.toArray();
    snapshot.sort(func (a, b) = if (a.startedAt > b.startedAt) { #less } else if (a.startedAt < b.startedAt) { #greater } else { #equal });
  };
};
