import Time "mo:core/Time";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Types "../types/bluetooth";

module {
  public type BluetoothState = Types.BluetoothState;
  public type ConnectionStatus = Types.ConnectionStatus;
  public type PairedDevice = Types.PairedDevice;
  public type SerialCommand = Types.SerialCommand;
  public type SensorFrame = Types.SensorFrame;
  public type FrameParseResult = Types.FrameParseResult;

  /// Serialize an app command into the wire protocol sent to the Arduino.
  /// Protocol: one line per command, `KEY` or `KEY:VALUE`, terminated by `\n`.
  public func encodeCommand(command : SerialCommand) : Text {
    switch (command) {
      case (#readSensors) { "READ\n" };
      case (#setPump(on)) { "PUMP:" # (if (on) { "1" } else { "0" }) # "\n" };
      case (#setValve(on)) { "VALVE:" # (if (on) { "1" } else { "0" }) # "\n" };
      case (#stopAll) { "STOP\n" };
      case (#setThreshold(value)) { "THRESH:" # value.toText() # "\n" };
      case (#setMaxDuration(value)) { "MAXDUR:" # value.toText() # "\n" };
    };
  };

  /// Parse a non-negative integer field, returning `null` when absent or invalid.
  func parseNat(value : Text) : ?Nat {
    let trimmed = value.trim(#char ' ');
    if (trimmed == "") { return null };
    trimmed.toNat();
  };

  /// Parse a signed integer field, returning `null` when absent or invalid.
  func parseInt(value : Text) : ?Int {
    let trimmed = value.trim(#char ' ');
    if (trimmed == "") { return null };
    trimmed.toInt();
  };

  /// Validate and parse a raw serial frame received from the Arduino.
  /// Expected form: `SOIL:<n>,TEMP:<n>,HUM:<n>` with any field optional.
  public func parseFrame(raw : Text) : FrameParseResult {
    let line = raw.trim(#char '\n').trim(#char '\r').trim(#char ' ');
    if (line == "") { return #malformed("empty frame") };
    var soil : ?Nat = null;
    var temperature : ?Int = null;
    var humidity : ?Nat = null;
    var sawField = false;
    for (field in line.split(#char ',')) {
      let pair = field.split(#char ':').toArray();
      if (pair.size() != 2) {
        return #malformed("malformed field: " # field);
      };
      let key = pair[0].trim(#char ' ');
      let value = pair[1].trim(#char ' ');
      switch (key) {
        case ("SOIL") {
          switch (parseNat(value)) {
            case null { return #malformed("invalid SOIL value: " # value) };
            case (?v) { soil := ?v; sawField := true };
          };
        };
        case ("TEMP") {
          switch (parseInt(value)) {
            case null { return #malformed("invalid TEMP value: " # value) };
            case (?v) { temperature := ?v; sawField := true };
          };
        };
        case ("HUM") {
          switch (parseNat(value)) {
            case null { return #malformed("invalid HUM value: " # value) };
            case (?v) { humidity := ?v; sawField := true };
          };
        };
        case (_) { return #malformed("unknown field: " # key) };
      };
    };
    if (not sawField) { return #malformed("no sensor fields") };
    #ok({
      soilMoisture = soil;
      temperature;
      ambientHumidity = humidity;
      receivedAt = Time.now();
    });
  };

  /// Record the last paired device and mark the link as connected.
  public func markConnected(state : BluetoothState, device : PairedDevice) : () {
    state.status := #connected;
    state.lastDevice := ?device;
    state.lastSeenAt := ?Time.now();
  };

  /// Mark the link as disconnected.
  public func markDisconnected(state : BluetoothState) : () {
    state.status := #disconnected;
  };

  /// Mark the link as lost after a communication timeout.
  public func markLost(state : BluetoothState) : () {
    state.status := #lost;
  };

  /// Read the current connection status.
  public func getStatus(state : BluetoothState) : ConnectionStatus {
    state.status;
  };

  /// Read the last paired device, if any.
  public func getLastDevice(state : BluetoothState) : ?PairedDevice {
    state.lastDevice;
  };
};
