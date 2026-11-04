module {
  /// Nanoseconds since the Unix epoch, as returned by `Time.now()`.
  public type Timestamp = Int;

  /// Monotonic identifier for a stored entity.
  public type Id = Nat;

  /// Whether an optional sensor is present on the connected Arduino.
  public type SensorPresence = {
    #present;
    #absent;
  };

  /// Severity of an alert surfaced to the user.
  public type AlertSeverity = {
    #info;
    #warning;
    #critical;
  };
};
