import OQL "mo:caffeineai-oql";
import Types "irrigation";

module {
  /// OQL row encoding for `IrrigationOutcome`: the variant tag as text.
  public func _toRow(self : Types.IrrigationOutcome) : OQL.Value {
    #text(switch self {
      case (#completed) "completed";
      case (#stoppedManually) "stoppedManually";
      case (#emergencyStop) "emergencyStop";
      case (#maxDurationReached) "maxDurationReached";
      case (#connectionLost) "connectionLost";
      case (#blocked) "blocked";
    });
  };
};
