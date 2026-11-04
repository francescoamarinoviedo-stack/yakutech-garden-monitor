import OQL "mo:caffeineai-oql";
import Types "common";

module {
  /// OQL row encoding for `AlertSeverity`: the variant tag as text.
  public func _toRow(self : Types.AlertSeverity) : OQL.Value {
    #text(switch self { case (#info) "info"; case (#warning) "warning"; case (#critical) "critical" });
  };
};
