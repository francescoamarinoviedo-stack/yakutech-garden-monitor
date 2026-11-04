import List "mo:core/List";
import Time "mo:core/Time";

import Types "../types/bluetooth";
import IrrigationTypes "../types/irrigation";
import HistoryTypes "../types/history";
import BluetoothLib "../lib/bluetooth";
import IrrigationLib "../lib/irrigation";

mixin (
  bluetoothState : Types.BluetoothState,
  irrigationState : IrrigationTypes.IrrigationState,
  irrigationEvents : List.List<IrrigationTypes.IrrigationEvent>,
  alerts : List.List<HistoryTypes.Alert>,
  counters : { var nextPlantId : Nat; var nextMeasurementId : Nat; var nextEventId : Nat; var nextAlertId : Nat },
) {
  public type ConnectionStatus = Types.ConnectionStatus;
  public type PairedDevice = Types.PairedDevice;
  public type SensorFrame = Types.SensorFrame;
  public type FrameParseResult = Types.FrameParseResult;

  /// Append an irrigation event for a connection-loss stop.
  func recordConnectionLostEvent(actuator : IrrigationTypes.Actuator, startedAt : Int) : () {
    let id = counters.nextEventId;
    counters.nextEventId := id + 1;
    irrigationEvents.add({
      id;
      cause = #automatic;
      outcome = #connectionLost;
      actuator;
      startedAt;
      endedAt = ?Time.now();
    });
  };

  /// Append a connection-lost alert.
  func recordConnectionLostAlert() : () {
    let id = counters.nextAlertId;
    counters.nextAlertId := id + 1;
    alerts.add({
      id;
      kind = #connectionLost;
      severity = #critical;
      message = "Bluetooth connection to the Arduino was lost";
      createdAt = Time.now();
      acknowledged = false;
    });
  };

  /// Report the last paired Bluetooth device and mark the link connected.
  public shared ({ caller }) func setPairedDevice(device : PairedDevice) : async () {
    ignore caller;
    BluetoothLib.markConnected(bluetoothState, device);
  };

  /// Mark the Bluetooth link as disconnected.
  public shared ({ caller }) func disconnectBluetooth() : async () {
    ignore caller;
    BluetoothLib.markDisconnected(bluetoothState);
  };

  /// Mark the Bluetooth link as lost after a communication timeout.
  /// Stops any active irrigation and raises a connection-lost alert.
  public shared ({ caller }) func reportConnectionLost() : async () {
    ignore caller;
    BluetoothLib.markLost(bluetoothState);
    let actuator = irrigationState.active;
    let startedAt = irrigationState.startedAt ?? Time.now();
    switch (IrrigationLib.onConnectionLost(irrigationState)) {
      case null {};
      case (?_) { recordConnectionLostEvent(actuator, startedAt) };
    };
    recordConnectionLostAlert();
  };

  /// Read the current Bluetooth connection status.
  public query ({ caller }) func getConnectionStatus() : async ConnectionStatus {
    ignore caller;
    BluetoothLib.getStatus(bluetoothState);
  };

  /// Read the last paired Bluetooth device, if any.
  public query ({ caller }) func getPairedDevice() : async ?PairedDevice {
    ignore caller;
    BluetoothLib.getLastDevice(bluetoothState);
  };

  /// Validate and parse a raw serial frame received from the Arduino.
  public query ({ caller }) func parseSerialFrame(raw : Text) : async FrameParseResult {
    ignore caller;
    BluetoothLib.parseFrame(raw);
  };
};
