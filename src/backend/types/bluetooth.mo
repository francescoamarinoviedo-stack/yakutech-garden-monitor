import Common "common";

module {
  public type Timestamp = Common.Timestamp;

  /// Lifecycle state of the Bluetooth link to the Arduino.
  public type ConnectionStatus = {
    #disconnected;
    #connecting;
    #connected;
    #lost;
  };

  /// Last paired Bluetooth device (HC-05 / HC-06 module).
  public type PairedDevice = {
    name : Text;
    address : Text;
  };

  /// A single command the app can send to the Arduino over the serial link.
  public type SerialCommand = {
    #readSensors;
    #setPump : Bool;
    #setValve : Bool;
    #stopAll;
    #setThreshold : Nat;
    #setMaxDuration : Nat;
  };

  /// A parsed measurement frame received from the Arduino.
  public type SensorFrame = {
    soilMoisture : ?Nat;
    temperature : ?Int;
    ambientHumidity : ?Nat;
    receivedAt : Timestamp;
  };

  /// Result of validating and parsing an inbound serial frame.
  public type FrameParseResult = {
    #ok : SensorFrame;
    #malformed : Text;
  };

  /// Persisted Bluetooth connection state.
  public type BluetoothState = {
    var status : ConnectionStatus;
    var lastDevice : ?PairedDevice;
    var lastSeenAt : ?Timestamp;
  };
};
