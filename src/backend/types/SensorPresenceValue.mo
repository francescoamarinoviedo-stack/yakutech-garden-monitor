import OQL "mo:caffeineai-oql";
import Types "common";

module {
  /// OQL row encoding for `SensorPresence`: the variant tag as text.
  public func _toRow(self : Types.SensorPresence) : OQL.Value {
    #text(switch self { case (#present) "present"; case (#absent) "absent" });
  };
};
