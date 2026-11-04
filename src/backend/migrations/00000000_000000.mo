import AccessControl "mo:caffeineai-authorization/access-control";
import Map "mo:core/Map";
import List "mo:core/List";

module {
  public type OldActor = {};

  public type NewActor = {
    accessControlState : AccessControl.AccessControlState;
    bluetoothState : {
      var status : { #disconnected; #connecting; #connected; #lost };
      var lastDevice : ?{ name : Text; address : Text };
      var lastSeenAt : ?Int;
    };
    measurements : List.List<{
      id : Nat;
      soilMoisture : ?Nat;
      temperature : ?Int;
      ambientHumidity : ?Nat;
      soilPresence : { #present; #absent };
      temperaturePresence : { #present; #absent };
      ambientHumidityPresence : { #present; #absent };
      recordedAt : Int;
    }>;
    irrigationConfig : {
      var moistureThreshold : Nat;
      var maxDurationSeconds : Nat;
      var mode : { #automatic; #manual };
    };
    irrigationState : {
      var active : { #none; #pump; #valve };
      var startedAt : ?Int;
      var emergencyStop : Bool;
    };
    irrigationEvents : List.List<{
      id : Nat;
      cause : { #automatic; #manual; #emergency };
      outcome : {
        #completed;
        #stoppedManually;
        #emergencyStop;
        #maxDurationReached;
        #connectionLost;
        #blocked;
      };
      actuator : { #none; #pump; #valve };
      startedAt : Int;
      endedAt : ?Int;
    }>;
    plants : Map.Map<Nat, {
      id : Nat;
      name : Text;
      species : Text;
      photoFileHash : ?Text;
      moistureNeed : Nat;
      careRecommendations : [Text];
      createdAt : Int;
    }>;
    alerts : List.List<{
      id : Nat;
      kind : { #plantNeedsWater : Nat; #sensorFailure : Text; #connectionLost };
      severity : { #info; #warning; #critical };
      message : Text;
      createdAt : Int;
      acknowledged : Bool;
    }>;
    counters : {
      var nextPlantId : Nat;
      var nextMeasurementId : Nat;
      var nextEventId : Nat;
      var nextAlertId : Nat;
    };
  };

  public func migration(_ : OldActor) : NewActor {
    {
      accessControlState = AccessControl.initState();
      bluetoothState = {
        var status = #disconnected;
        var lastDevice = null;
        var lastSeenAt = null;
      };
      measurements = List.empty();
      irrigationConfig = {
        var moistureThreshold = 30;
        var maxDurationSeconds = 60;
        var mode = #automatic;
      };
      irrigationState = {
        var active = #none;
        var startedAt = null;
        var emergencyStop = false;
      };
      irrigationEvents = List.empty();
      plants = Map.empty();
      alerts = List.empty();
      counters = {
        var nextPlantId = 0;
        var nextMeasurementId = 0;
        var nextEventId = 0;
        var nextAlertId = 0;
      };
    };
  };
};
