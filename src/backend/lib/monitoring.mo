import Types "../types/monitoring";

module {
  public type Measurement = Types.Measurement;
  public type LatestMeasurement = Types.LatestMeasurement;
  public type PlantStatus = Types.PlantStatus;

  /// Derive a plant's status from its latest soil moisture and configured need.
  /// No reading, or a missing soil sensor, means the plant needs attention.
  public func deriveStatus(latest : LatestMeasurement, moistureNeed : Nat) : PlantStatus {
    switch (latest) {
      case null { #needsAttention };
      case (?measurement) {
        switch (measurement.soilMoisture) {
          case null { #needsAttention };
          case (?moisture) {
            if (moisture < moistureNeed) { #needsWater } else { #healthy };
          };
        };
      };
    };
  };

  /// Return the most recent stored measurement, if any.
  public func latest(measurements : [Measurement]) : LatestMeasurement {
    var newest : ?Measurement = null;
    for (measurement in measurements.values()) {
      switch (newest) {
        case null { newest := ?measurement };
        case (?current) {
          if (measurement.recordedAt > current.recordedAt) {
            newest := ?measurement;
          };
        };
      };
    };
    newest;
  };
};
