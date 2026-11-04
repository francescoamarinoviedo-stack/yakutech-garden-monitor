import List "mo:core/List";
import Types "../types/history";
import MonitoringTypes "../types/monitoring";

mixin (
  alerts : List.List<Types.Alert>,
  measurements : List.List<MonitoringTypes.Measurement>,
) {
  public type Alert = Types.Alert;
  public type HistoryPoint = Types.HistoryPoint;

  /// List recorded alerts, most recent first.
  public query ({ caller }) func listAlerts() : async [Alert] {
    ignore caller;
    let snapshot = alerts.toArray();
    snapshot.sort(func (a, b) = if (a.createdAt > b.createdAt) { #less } else if (a.createdAt < b.createdAt) { #greater } else { #equal });
  };

  /// Mark an alert as acknowledged.
  public shared ({ caller }) func acknowledgeAlert(id : Nat) : async Bool {
    ignore caller;
    var found = false;
    let snapshot = alerts.toArray();
    alerts.clear();
    for (alert in snapshot.values()) {
      if (alert.id == id) {
        found := true;
        alerts.add({ alert with acknowledged = true });
      } else {
        alerts.add(alert);
      };
    };
    found;
  };

  /// Read moisture and temperature history points for charting.
  public query ({ caller }) func getHistory(limit : Nat) : async [HistoryPoint] {
    ignore caller;
    let points = measurements.toArray().map(func (m) = {
      recordedAt = m.recordedAt;
      soilMoisture = m.soilMoisture;
      temperature = m.temperature;
    });
    let sorted = points.sort(func (a, b) = if (a.recordedAt > b.recordedAt) { #less } else if (a.recordedAt < b.recordedAt) { #greater } else { #equal });
    if (sorted.size() <= limit) {
      sorted;
    } else {
      sorted.sliceToArray(0, limit.toInt());
    };
  };
};
