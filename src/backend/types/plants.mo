import Common "common";

module {
  public type Id = Common.Id;
  public type Timestamp = Common.Timestamp;

  /// A registered plant in the vertical garden.
  public type Plant = {
    id : Id;
    name : Text;
    species : Text;
    photoFileHash : ?Text;
    moistureNeed : Nat;
    careRecommendations : [Text];
    createdAt : Timestamp;
  };

  /// A plant together with its current derived status.
  public type PlantView = {
    id : Id;
    name : Text;
    species : Text;
    photoFileHash : ?Text;
    moistureNeed : Nat;
    careRecommendations : [Text];
    createdAt : Timestamp;
    status : Text;
  };
};
