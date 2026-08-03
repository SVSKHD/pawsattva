export type PetType = "Dog" | "Cat"
export type WeightStatus = "underweight" | "ideal" | "overweight" | "obese"

export interface BreedReference {
  name: string
  adultWeightRange?: string
  imageUrl: string
}

const dogFallback = "https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=900&q=80"
const catFallback = "https://images.unsplash.com/photo-1573865526739-10659fec78a5?auto=format&fit=crop&w=900&q=80"

export const BREEDS: Record<PetType, BreedReference[]> = {
  Dog: [
    { name: "Labrador", adultWeightRange: "25–36 kg", imageUrl: "https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=900&q=80" },
    { name: "German Shepherd", adultWeightRange: "22–40 kg", imageUrl: "https://images.unsplash.com/photo-1589941013453-ec89f33b5e95?auto=format&fit=crop&w=900&q=80" },
    { name: "Golden Retriever", adultWeightRange: "25–34 kg", imageUrl: "https://images.unsplash.com/photo-1558788353-f76d92427f16?auto=format&fit=crop&w=900&q=80" },
    { name: "Poodle", adultWeightRange: "Varies by size: 3–32 kg", imageUrl: "https://images.unsplash.com/photo-1616149562385-39db17dc445c?auto=format&fit=crop&w=900&q=80" },
    { name: "Beagle", adultWeightRange: "9–14 kg", imageUrl: "https://images.unsplash.com/photo-1505628346881-b72b27e84530?auto=format&fit=crop&w=900&q=80" },
    { name: "Indian Pariah", adultWeightRange: "15–30 kg", imageUrl: "https://images.unsplash.com/photo-1558788353-f76d92427f16?auto=format&fit=crop&w=900&q=80" },
    { name: "Mixed/Other", imageUrl: dogFallback },
  ],
  Cat: [
    { name: "Persian", adultWeightRange: "3–6 kg", imageUrl: "https://images.unsplash.com/photo-1577023311546-cdc07a8454d9?auto=format&fit=crop&w=900&q=80" },
    { name: "Siamese", adultWeightRange: "3–6 kg", imageUrl: "https://images.unsplash.com/photo-1518791841217-8f162f1e1131?auto=format&fit=crop&w=900&q=80" },
    { name: "Maine Coon", adultWeightRange: "4–9 kg", imageUrl: "https://images.unsplash.com/photo-1606214174585-fe31582dc6ee?auto=format&fit=crop&w=900&q=80" },
    { name: "Bengal", adultWeightRange: "4–7 kg", imageUrl: "https://images.unsplash.com/photo-1518791841217-8f162f1e1131?auto=format&fit=crop&w=900&q=80" },
    { name: "Ragdoll", adultWeightRange: "4–9 kg", imageUrl: "https://images.unsplash.com/photo-1573865526739-10659fec78a5?auto=format&fit=crop&w=900&q=80" },
    { name: "Mixed/Other", imageUrl: catFallback },
  ],
}

export const getBreed = (type: PetType, name: string) =>
  BREEDS[type].find((breed) => breed.name === name) ?? BREEDS[type].at(-1)!

export const getLifeStage = (type: PetType, ageMonths: number) => {
  if (ageMonths < 12) return type === "Dog" ? "puppy" : "kitten"
  if ((type === "Dog" && ageMonths < 84) || (type === "Cat" && ageMonths < 132)) return "adult"
  return "senior"
}

export const getAdultWeightRange = (reference?: string) => {
  if (!reference) return null
  const values = reference.match(/\d+(?:\.\d+)?/g)?.map(Number)
  return values && values.length >= 2 ? { min: values[0], max: values[1] } : null
}

export const getWeightContext = (weightKg: number, reference?: string) => {
  const range = getAdultWeightRange(reference)
  if (!range || !Number.isFinite(weightKg) || weightKg <= 0) return null
  const domainMin = Math.max(0, range.min * 0.5)
  const domainMax = range.max * 1.5
  const position = Math.max(0, Math.min(100, ((weightKg - domainMin) / (domainMax - domainMin)) * 100))
  const label = weightKg < range.min ? "Below adult reference" : weightKg > range.max ? "Above adult reference" : "Within adult reference"
  return { ...range, label, position }
}

export const calculateBcs = (ribs: number, waist: number, tuck: number) =>
  Math.max(1, Math.min(9, Math.round((ribs + waist + tuck) / 3)))

export const getWeightStatus = (bcs: number): WeightStatus => {
  if (bcs <= 3) return "underweight"
  if (bcs <= 5) return "ideal"
  if (bcs <= 7) return "overweight"
  return "obese"
}

export const STATUS_COPY: Record<WeightStatus, { explanation: string; guidance: string }> = {
  underweight: { explanation: "Ribs, waist and abdominal-tuck observations suggest less body covering than expected.", guidance: "Arrange a veterinary review, especially if weight loss is recent, appetite has changed, or the score is 1–2." },
  ideal: { explanation: "The reported rib feel, waist and abdominal tuck are consistent with an ideal body condition.", guidance: "Continue regular check-ins and record weight and BCS over time." },
  overweight: { explanation: "The reported observations suggest extra body covering and reduced waist or tuck.", guidance: "Review portions, treats and activity with your veterinarian before making major diet changes." },
  obese: { explanation: "The reported observations suggest substantial excess body covering.", guidance: "A veterinary consultation is recommended for a safe, individualized weight-management plan." },
}
