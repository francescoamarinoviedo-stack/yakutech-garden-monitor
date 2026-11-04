import Common "common";

module {
  public type Id = Common.Id;
  public type Timestamp = Common.Timestamp;

  /// Whether irrigation runs automatically by threshold or only on demand.
  public type IrrigationMode = {
    #automatic;
    #manual;
  };

  /// Why an irrigation event started.
  public type IrrigationCause = {
    #automatic;
    #manual;
    #emergency;
  };

  /// How an irrigation event ended.
  public type IrrigationOutcome = {
    #completed;
    #stoppedManually;
    #emergencyStop;
    #maxDurationReached;
    #connectionLost;
    #blocked;
  };

  /// Which actuator is active. Pump and valve are mutually exclusive.
  public type Actuator = {
    #none;
    #pump;
    #valve;
  };

  /// User-configurable irrigation settings (mutable persisted state).
  public type IrrigationConfig = {
    var moistureThreshold : Nat;
    var maxDurationSeconds : Nat;
    var mode : IrrigationMode;
  };

  /// Immutable snapshot of the irrigation settings for the public API.
  public type IrrigationConfigView = {
    moistureThreshold : Nat;
    maxDurationSeconds : Nat;
    mode : IrrigationMode;
  };

  /// A recorded irrigation event.
  public type IrrigationEvent = {
    id : Id;
    cause : IrrigationCause;
    outcome : IrrigationOutcome;
    actuator : Actuator;
    startedAt : Timestamp;
    endedAt : ?Timestamp;
  };

  /// Live irrigation runtime state.
  public type IrrigationState = {
    var active : Actuator;
    var startedAt : ?Timestamp;
    var emergencyStop : Bool;
  };
};
