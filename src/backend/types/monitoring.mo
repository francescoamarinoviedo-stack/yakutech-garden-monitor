import Common "common";

module {
  public type Id = Common.Id;
  public type Timestamp = Common.Timestamp;
  public type SensorPresence = Common.SensorPresence;

  /// Health of a single plant, derived from its latest soil moisture reading.
  public type PlantStatus = {
    #healthy;
    #needsWater;
    #needsAttention;
  };

  /// A stored sensor measurement with per-sensor presence flags.
  public type Measurement = {
    id : Id;
    soilMoisture : ?Nat;
    temperature : ?Int;
    ambientHumidity : ?Nat;
    soilPresence : SensorPresence;
    temperaturePresence : SensorPresence;
    ambientHumidityPresence : SensorPresence;
    recordedAt : Timestamp;
  };

  /// The most recent measurement, or `null` when none has been received.
  public type LatestMeasurement = ?Measurement;
};
