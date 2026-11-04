import OQL "mo:caffeineai-oql";
import Types "irrigation";

module {
  /// OQL row encoding for `Actuator`: the variant tag as text.
  public func _toRow(self : Types.Actuator) : OQL.Value {
    #text(switch self { case (#none) "none"; case (#pump) "pump"; case (#valve) "valve" });
  };
};
