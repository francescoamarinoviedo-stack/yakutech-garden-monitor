import Types "../types/plants";

module {
  public type Plant = Types.Plant;
  public type PlantView = Types.PlantView;

  /// Build a public view of a plant with its current status.
  public func toView(plant : Plant, status : Text) : PlantView {
    {
      id = plant.id;
      name = plant.name;
      species = plant.species;
      photoFileHash = plant.photoFileHash;
      moistureNeed = plant.moistureNeed;
      careRecommendations = plant.careRecommendations;
      createdAt = plant.createdAt;
      status;
    };
  };
};
