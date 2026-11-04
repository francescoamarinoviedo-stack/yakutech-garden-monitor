import OQL "mo:caffeineai-oql";
import Nat "mo:core/Nat";
import Types "history";

module {
  /// OQL row encoding for `AlertKind`: a text label, with the payload appended.
  public func _toRow(self : Types.AlertKind) : OQL.Value {
    #text(switch self {
      case (#plantNeedsWater(id)) "plantNeedsWater:" # id.toText();
      case (#sensorFailure(reason)) "sensorFailure:" # reason;
      case (#connectionLost) "connectionLost";
    });
  };
};
