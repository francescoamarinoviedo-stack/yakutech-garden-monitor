import Common "common";

module {
  public type Id = Common.Id;
  public type Timestamp = Common.Timestamp;
  public type AlertSeverity = Common.AlertSeverity;

  /// What triggered an alert.
  public type AlertKind = {
    #plantNeedsWater : Id;
    #sensorFailure : Text;
    #connectionLost;
  };

  /// A stored alert surfaced to the user.
  public type Alert = {
    id : Id;
    kind : AlertKind;
    severity : AlertSeverity;
    message : Text;
    createdAt : Timestamp;
    acknowledged : Bool;
  };

  /// A point in a moisture/temperature history chart.
  public type HistoryPoint = {
    recordedAt : Timestamp;
    soilMoisture : ?Nat;
    temperature : ?Int;
  };
};
