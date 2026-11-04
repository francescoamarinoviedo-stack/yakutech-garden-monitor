import type { PlantView } from "@/backend";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useAddPlant,
  useDeletePlant,
  usePlants,
  useUpdatePlant,
} from "@/hooks/useQueries";
import { cn } from "@/lib/utils";
import {
  loadConfig,
  useInternetIdentity,
} from "@caffeineai/core-infrastructure";
import { StorageClient } from "@caffeineai/object-storage";
import { HttpAgent } from "@icp-sdk/core/agent";
import {
  Droplets,
  ImagePlus,
  Leaf,
  Pencil,
  Plus,
  Sprout,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const STATUS_META: Record<string, { label: string; className: string }> = {
  healthy: {
    label: "Saludable",
    className: "border-primary/50 bg-primary/10 text-primary",
  },
  needsWater: {
    label: "Necesita agua",
    className: "border-accent/50 bg-accent/10 text-accent",
  },
  needsAttention: {
    label: "Requiere atención",
    className: "border-destructive/50 bg-destructive/10 text-destructive",
  },
};

const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const ACCEPTED_PHOTO_TYPES = "image/png,image/jpeg,image/webp,image/gif";

interface DraftState {
  id: bigint | null;
  name: string;
  species: string;
  moistureNeed: string;
  careRecommendations: string;
  photoFileHash: string | null;
}

const EMPTY_DRAFT: DraftState = {
  id: null,
  name: "",
  species: "",
  moistureNeed: "40",
  careRecommendations: "",
  photoFileHash: null,
};

/** Builds a storage client bound to the signed-in identity for photo uploads. */
function useStorageClient() {
  const { identity } = useInternetIdentity();
  const clientRef = useRef<StorageClient | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!identity) {
      clientRef.current = null;
      return;
    }
    void (async () => {
      const config = await loadConfig();
      if (cancelled) return;
      const agent = new HttpAgent({
        host: config.backend_host,
        identity,
      });
      clientRef.current = new StorageClient(
        config.bucket_name,
        config.storage_gateway_url,
        config.backend_canister_id,
        config.project_id,
        agent,
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [identity]);

  const uploadPhoto = useCallback(
    async (file: File, onProgress?: (percentage: number) => void) => {
      const client = clientRef.current;
      if (!client) throw new Error("El almacenamiento aún no está listo");
      const bytes = new Uint8Array(await file.arrayBuffer());
      const { hash } = await client.putFile(
        bytes,
        onProgress,
        file.type,
        file.name,
      );
      return hash;
    },
    [],
  );

  const photoUrl = useCallback(async (hash: string) => {
    const client = clientRef.current;
    if (!client) return null;
    return client.getDirectURL(hash);
  }, []);

  return { uploadPhoto, photoUrl };
}

/** Resolves a stored photo hash into a displayable gateway URL. */
function usePhotoUrl(hash: string | undefined) {
  const { photoUrl } = useStorageClient();
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!hash) {
      setUrl(null);
      return;
    }
    void photoUrl(hash).then((resolved) => {
      if (!cancelled) setUrl(resolved);
    });
    return () => {
      cancelled = true;
    };
  }, [hash, photoUrl]);

  return url;
}

function PlantPhoto({
  hash,
  name,
  className,
}: {
  hash?: string;
  name: string;
  className?: string;
}) {
  const url = usePhotoUrl(hash);
  if (!url) {
    return (
      <span
        className={cn(
          "flex items-center justify-center bg-primary/10 text-primary",
          className,
        )}
        aria-hidden="true"
      >
        <Leaf className="size-5" />
      </span>
    );
  }
  return (
    <img
      src={url}
      alt={`Fotografía de ${name}`}
      className={cn("object-cover", className)}
      loading="lazy"
    />
  );
}

export default function PlantsPage() {
  const { data: plants, isLoading } = usePlants();
  const addPlant = useAddPlant();
  const updatePlant = useUpdatePlant();
  const deletePlant = useDeletePlant();
  const { uploadPhoto } = useStorageClient();

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DraftState>(EMPTY_DRAFT);
  const [formError, setFormError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const openCreate = () => {
    setDraft(EMPTY_DRAFT);
    setFormError(null);
    setUploadProgress(0);
    setOpen(true);
  };

  const openEdit = (plant: PlantView) => {
    setDraft({
      id: plant.id,
      name: plant.name,
      species: plant.species,
      moistureNeed: Number(plant.moistureNeed).toString(),
      careRecommendations: plant.careRecommendations.join("\n"),
      photoFileHash: plant.photoFileHash ?? null,
    });
    setFormError(null);
    setUploadProgress(0);
    setOpen(true);
  };

  const handlePhotoChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setFormError("Selecciona un archivo de imagen válido.");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setFormError("La fotografía no puede superar los 8 MB.");
      return;
    }
    setFormError(null);
    setUploading(true);
    setUploadProgress(0);
    try {
      const hash = await uploadPhoto(file, (pct) =>
        setUploadProgress(Math.round(pct)),
      );
      setDraft((prev) => ({ ...prev, photoFileHash: hash }));
    } catch {
      setFormError("No se pudo subir la fotografía. Inténtalo de nuevo.");
    } finally {
      setUploading(false);
    }
  };

  const submit = () => {
    const name = draft.name.trim();
    const species = draft.species.trim();
    const moisture = Number.parseInt(draft.moistureNeed, 10);
    if (!name || !species) {
      setFormError("El nombre y la especie son obligatorios.");
      return;
    }
    if (Number.isNaN(moisture) || moisture < 0 || moisture > 100) {
      setFormError("La necesidad de humedad debe estar entre 0 y 100.");
      return;
    }
    const recommendations = draft.careRecommendations
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    const payload = {
      name,
      species,
      photoFileHash: draft.photoFileHash,
      moistureNeed: BigInt(moisture),
      careRecommendations: recommendations,
    };
    setFormError(null);
    if (draft.id === null) {
      addPlant.mutate(payload, { onSuccess: () => setOpen(false) });
    } else {
      updatePlant.mutate(
        { ...payload, id: draft.id },
        { onSuccess: () => setOpen(false) },
      );
    }
  };

  const saving = addPlant.isPending || updatePlant.isPending;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Mis plantas"
        description="Registra cada planta con su especie, fotografía y necesidades de humedad."
        action={
          <Button
            type="button"
            className="rounded-lg bg-gradient-primary shadow-subtle"
            data-ocid="plants.add_button"
            onClick={openCreate}
          >
            <Plus className="size-4" aria-hidden="true" />
            Añadir planta
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => `skeleton-${i}`).map((id) => (
            <div key={id} className="h-28 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : !plants || plants.length === 0 ? (
        <Card
          className="rounded-lg shadow-subtle"
          data-ocid="plants.empty_state"
        >
          <CardContent className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Sprout className="size-7" aria-hidden="true" />
            </span>
            <p className="font-display text-lg font-bold text-foreground">
              Aún no hay plantas
            </p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Añade tu primera planta para recibir alertas cuando necesite agua.
            </p>
            <Button
              type="button"
              className="rounded-lg"
              data-ocid="plants.empty_add_button"
              onClick={openCreate}
            >
              <Plus className="size-4" aria-hidden="true" />
              Añadir planta
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {plants.map((plant, index) => {
            const meta = STATUS_META[plant.status] ?? STATUS_META.healthy;
            return (
              <Card
                key={plant.id.toString()}
                className="animate-fade-in-up overflow-hidden rounded-lg shadow-subtle"
                data-ocid={`plants.item.${index + 1}`}
              >
                <CardContent className="flex flex-col gap-3 px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <PlantPhoto
                        hash={plant.photoFileHash}
                        name={plant.name}
                        className="size-12 shrink-0 rounded-xl"
                      />
                      <div className="min-w-0">
                        <p className="truncate font-display text-base font-bold text-foreground">
                          {plant.name}
                        </p>
                        <p className="truncate text-xs italic text-muted-foreground">
                          {plant.species}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "shrink-0 rounded-full px-3 py-1",
                        meta.className,
                      )}
                    >
                      {meta.label}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Droplets
                      className="size-3.5 text-primary"
                      aria-hidden="true"
                    />
                    <span className="sensor-readout">
                      Necesita {Number(plant.moistureNeed)}% de humedad
                    </span>
                  </div>

                  {plant.careRecommendations.length > 0 && (
                    <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
                      {plant.careRecommendations.slice(0, 2).map((tip) => (
                        <li key={tip} className="flex items-start gap-1.5">
                          <span
                            className="mt-1 size-1 shrink-0 rounded-full bg-primary"
                            aria-hidden="true"
                          />
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="flex gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-lg"
                      data-ocid={`plants.edit_button.${index + 1}`}
                      onClick={() => openEdit(plant)}
                    >
                      <Pencil className="size-3.5" aria-hidden="true" />
                      Editar
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="rounded-lg text-destructive hover:text-destructive"
                      data-ocid={`plants.delete_button.${index + 1}`}
                      disabled={deletePlant.isPending}
                      onClick={() => deletePlant.mutate(plant.id)}
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                      Eliminar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent data-ocid="plants.dialog">
          <DialogHeader>
            <DialogTitle className="font-display">
              {draft.id === null ? "Añadir planta" : "Editar planta"}
            </DialogTitle>
            <DialogDescription>
              Define el nombre, la especie, la fotografía y la humedad mínima
              que necesita.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="plant-name">Nombre</Label>
              <Input
                id="plant-name"
                data-ocid="plants.name_input"
                value={draft.name}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, name: event.target.value }))
                }
                placeholder="Albahaca"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="plant-species">Especie</Label>
              <Input
                id="plant-species"
                data-ocid="plants.species_input"
                value={draft.species}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, species: event.target.value }))
                }
                placeholder="Ocimum basilicum"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="plant-moisture">Humedad mínima (%)</Label>
              <Input
                id="plant-moisture"
                data-ocid="plants.moisture_input"
                type="number"
                min={0}
                max={100}
                value={draft.moistureNeed}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    moistureNeed: event.target.value,
                  }))
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="plant-photo">Fotografía</Label>
              <div className="flex items-center gap-3">
                <PlantPhoto
                  hash={draft.photoFileHash ?? undefined}
                  name={draft.name || "planta"}
                  className="size-16 shrink-0 rounded-xl border border-border"
                />
                <div className="flex min-w-0 flex-col gap-1">
                  <label
                    htmlFor="plant-photo"
                    className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-lg border border-input bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-smooth hover:bg-accent/10"
                    data-ocid="plants.upload_button"
                  >
                    <ImagePlus className="size-4" aria-hidden="true" />
                    {draft.photoFileHash ? "Cambiar foto" : "Subir foto"}
                  </label>
                  <input
                    id="plant-photo"
                    type="file"
                    accept={ACCEPTED_PHOTO_TYPES}
                    className="sr-only"
                    data-ocid="plants.photo_input"
                    onChange={handlePhotoChange}
                  />
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG, WEBP o GIF · máx. 8 MB
                  </p>
                </div>
              </div>
              {uploading && (
                <p
                  className="text-xs text-muted-foreground"
                  data-ocid="plants.upload_progress"
                >
                  Subiendo… {uploadProgress}%
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="plant-care">
                Recomendaciones de cuidado (una por línea)
              </Label>
              <Textarea
                id="plant-care"
                data-ocid="plants.care_input"
                rows={3}
                value={draft.careRecommendations}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    careRecommendations: event.target.value,
                  }))
                }
                placeholder={"Riego moderado\nLuz indirecta"}
              />
            </div>
            {formError && (
              <p
                className="text-sm text-destructive"
                data-ocid="plants.form_error"
              >
                {formError}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-lg"
              data-ocid="plants.cancel_button"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="rounded-lg bg-gradient-primary"
              data-ocid="plants.save_button"
              disabled={saving || uploading}
              onClick={submit}
            >
              {saving ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
