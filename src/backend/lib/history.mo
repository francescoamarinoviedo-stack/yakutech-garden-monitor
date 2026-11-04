import Types "../types/history";

module {
  public type Alert = Types.Alert;
  public type AlertKind = Types.AlertKind;
  public type AlertSeverity = Types.AlertSeverity;
  public type HistoryPoint = Types.HistoryPoint;

  /// Build an alert for a plant that needs water.
  public func plantNeedsWaterAlert(plantId : Nat, message : Text, now : Int) : Alert {
    {
      id = 0;
      kind = #plantNeedsWater(plantId);
      severity = #warning;
      message;
      createdAt = now;
      acknowledged = false;
    };
  };

  /// Build an alert for a failed sensor.
  public func sensorFailureAlert(sensor : Text, message : Text, now : Int) : Alert {
    {
      id = 0;
      kind = #sensorFailure(sensor);
      severity = #critical;
      message;
      createdAt = now;
      acknowledged = false;
    };
  };

  /// Build an alert for a lost Bluetooth connection.
  public func connectionLostAlert(message : Text, now : Int) : Alert {
    {
      id = 0;
      kind = #connectionLost;
      severity = #critical;
      message;
      createdAt = now;
      acknowledged = false;
    };
  };
};
