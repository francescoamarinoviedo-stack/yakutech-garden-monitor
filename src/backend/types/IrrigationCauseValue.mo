import OQL "mo:caffeineai-oql";
import Types "irrigation";

module {
  /// OQL row encoding for `IrrigationCause`: the variant tag as text.
  public func _toRow(self : Types.IrrigationCause) : OQL.Value {
    #text(switch self { case (#automatic) "automatic"; case (#manual) "manual"; case (#emergency) "emergency" });
  };
};
