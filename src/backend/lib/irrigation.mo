import Nat "mo:core/Nat";
import Types "../types/irrigation";

module {
  public type IrrigationConfig = Types.IrrigationConfig;
  public type IrrigationState = Types.IrrigationState;
  public type IrrigationEvent = Types.IrrigationEvent;
  public type IrrigationCause = Types.IrrigationCause;
  public type IrrigationOutcome = Types.IrrigationOutcome;
  public type Actuator = Types.Actuator;

  /// Decide whether automatic irrigation should start for a soil reading.
  /// Requires automatic mode, an active (non-emergency) state, no running
  /// irrigation, a present soil sensor and a reading below the threshold.
  public func shouldIrrigate(config : IrrigationConfig, soilMoisture : ?Nat) : Bool {
    switch (config.mode) {
      case (#manual) { false };
      case (#automatic) {
        switch (soilMoisture) {
          case null { false };
          case (?moisture) { moisture < config.moistureThreshold };
        };
      };
    };
  };

  /// Start irrigation on the given actuator, enforcing pump/valve exclusivity.
  /// Returns `#blocked` when an emergency stop is latched, when an actuator is
  /// already active, or when `#none` is requested. On success the caller sets
  /// `startedAt`; this function only claims the actuator.
  public func start(state : IrrigationState, actuator : Actuator, _cause : IrrigationCause) : IrrigationOutcome {
    if (state.emergencyStop) { return #blocked };
    switch (state.active) {
      case (#none) {};
      case (_) { return #blocked };
    };
    switch (actuator) {
      case (#none) { return #blocked };
      case (_) { state.active := actuator };
    };
    #completed;
  };

  /// Stop irrigation and record the outcome.
  public func stop(state : IrrigationState, _outcome : IrrigationOutcome) : () {
    state.active := #none;
    state.startedAt := null;
  };

  /// Trigger the emergency stop, halting any active irrigation.
  public func emergencyStop(state : IrrigationState) : () {
    state.active := #none;
    state.startedAt := null;
    state.emergencyStop := true;
  };

  /// Enforce the maximum irrigation duration, stopping when exceeded.
  /// Returns the outcome when irrigation was stopped, `null` otherwise.
  public func enforceMaxDuration(state : IrrigationState, config : IrrigationConfig, now : Int) : ?IrrigationOutcome {
    switch (state.active) {
      case (#none) { null };
      case (_) {
        switch (state.startedAt) {
          case null { null };
          case (?startedAt) {
            let elapsedSeconds = (now - startedAt) / 1_000_000_000;
            if (elapsedSeconds >= config.maxDurationSeconds.toInt()) {
              state.active := #none;
              state.startedAt := null;
              ?#maxDurationReached;
            } else {
              null;
            };
          };
        };
      };
    };
  };

  /// Stop irrigation when the Bluetooth link is lost.
  public func onConnectionLost(state : IrrigationState) : ?IrrigationOutcome {
    switch (state.active) {
      case (#none) { null };
      case (_) {
        state.active := #none;
        state.startedAt := null;
        ?#connectionLost;
      };
    };
  };
};
