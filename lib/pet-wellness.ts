export type PetType = "Dog" | "Cat"
export type WeightStatus = "underweight" | "ideal" | "overweight" | "obese"

export interface BreedReference {
  name: string
  group: string
  adultWeightRange?: string
  adultHeightRange?: string
  /**
   * Verified local asset only, e.g. /breeds/labrador.webp.
   * Leave undefined until the image has been manually checked against the breed.
   */
  thumbnail?: string | null
}

export const BREEDS: Record<PetType, BreedReference[]> = {
  Dog: [
    { name: "Chihuahua", group: "Small home & companion breeds" },
    { name: "Pomeranian", group: "Small home & companion breeds" },
    { name: "Pug", group: "Small home & companion breeds" },
    { name: "Shih Tzu", group: "Small home & companion breeds" },
    { name: "Maltese", group: "Small home & companion breeds" },
    { name: "Havanese", group: "Small home & companion breeds" },
    { name: "Bichon Frise", group: "Small home & companion breeds" },
    { name: "Yorkshire Terrier", group: "Small home & companion breeds" },
    { name: "Cavalier King Charles Spaniel", group: "Small home & companion breeds" },
    { name: "Papillon", group: "Small home & companion breeds" },
    { name: "Miniature Pinscher", group: "Small home & companion breeds" },
    { name: "French Bulldog", group: "Small home & companion breeds" },
    { name: "Boston Terrier", group: "Small home & companion breeds" },
    { name: "Dachshund", group: "Small home & companion breeds" },
    { name: "Jack Russell Terrier", group: "Small home & companion breeds" },
    { name: "Pekingese", group: "Small home & companion breeds" },
    { name: "Lhasa Apso", group: "Small home & companion breeds" },
    { name: "Miniature Schnauzer", group: "Small home & companion breeds" },
    { name: "Toy Poodle", group: "Small home & companion breeds" },
    { name: "Pembroke Welsh Corgi", group: "Small home & companion breeds" },
    { name: "Beagle", group: "Medium home & family breeds", adultWeightRange: "9–14 kg", adultHeightRange: "33–41 cm" },
    { name: "Cocker Spaniel", group: "Medium home & family breeds" },
    { name: "English Springer Spaniel", group: "Medium home & family breeds" },
    { name: "Border Collie", group: "Medium home & family breeds" },
    { name: "Australian Shepherd", group: "Medium home & family breeds" },
    { name: "Brittany", group: "Medium home & family breeds" },
    { name: "Bulldog", group: "Medium home & family breeds" },
    { name: "Staffordshire Bull Terrier", group: "Medium home & family breeds" },
    { name: "American Staffordshire Terrier", group: "Medium home & family breeds" },
    { name: "Basenji", group: "Medium home & family breeds" },
    { name: "Whippet", group: "Medium home & family breeds" },
    { name: "Shiba Inu", group: "Medium home & family breeds" },
    { name: "Shetland Sheepdog", group: "Medium home & family breeds" },
    { name: "Standard Schnauzer", group: "Medium home & family breeds" },
    { name: "Finnish Spitz", group: "Medium home & family breeds" },
    { name: "Keeshond", group: "Medium home & family breeds" },
    { name: "Samoyed", group: "Medium home & family breeds" },
    { name: "Dalmatian", group: "Medium home & family breeds" },
    { name: "Vizsla", group: "Medium home & family breeds" },
    { name: "English Setter", group: "Medium home & family breeds" },
    { name: "Labrador", group: "Large home & family breeds", adultWeightRange: "25–36 kg", adultHeightRange: "55–62 cm" },
    { name: "Golden Retriever", group: "Large home & family breeds", adultWeightRange: "25–34 kg", adultHeightRange: "51–61 cm" },
    { name: "German Shepherd", group: "Large home & family breeds", adultWeightRange: "22–40 kg", adultHeightRange: "55–65 cm" },
    { name: "Poodle", group: "Large home & family breeds", adultWeightRange: "Varies by size: 3–32 kg", adultHeightRange: "Varies by size: 24–62 cm" },
    { name: "Boxer", group: "Large home & family breeds" },
    { name: "Doberman Pinscher", group: "Large home & family breeds" },
    { name: "Rottweiler", group: "Large home & family breeds" },
    { name: "Great Pyrenees", group: "Large home & family breeds" },
    { name: "Bernese Mountain Dog", group: "Large home & family breeds" },
    { name: "Siberian Husky", group: "Large home & family breeds" },
    { name: "Alaskan Malamute", group: "Large home & family breeds" },
    { name: "Weimaraner", group: "Large home & family breeds" },
    { name: "Rhodesian Ridgeback", group: "Large home & family breeds" },
    { name: "German Shorthaired Pointer", group: "Large home & family breeds" },
    { name: "Belgian Malinois", group: "Large home & family breeds" },
    { name: "Collie", group: "Large home & family breeds" },
    { name: "Old English Sheepdog", group: "Large home & family breeds" },
    { name: "Akita", group: "Large home & family breeds" },
    { name: "Chow Chow", group: "Large home & family breeds" },
    { name: "Giant Schnauzer", group: "Large home & family breeds" },
    { name: "Great Dane", group: "Giant breeds" },
    { name: "Saint Bernard", group: "Giant breeds" },
    { name: "Newfoundland", group: "Giant breeds" },
    { name: "Mastiff", group: "Giant breeds" },
    { name: "Bullmastiff", group: "Giant breeds" },
    { name: "Irish Wolfhound", group: "Giant breeds" },
    { name: "Leonberger", group: "Giant breeds" },
    { name: "Cane Corso", group: "Giant breeds" },
    { name: "Dogue de Bordeaux", group: "Giant breeds" },
    { name: "Anatolian Shepherd", group: "Giant breeds" },
    { name: "Indian Pariah", group: "Indian & native breeds", adultWeightRange: "15–30 kg", adultHeightRange: "46–64 cm" },
    { name: "Rajapalayam", group: "Indian & native breeds" },
    { name: "Mudhol Hound", group: "Indian & native breeds" },
    { name: "Chippiparai", group: "Indian & native breeds" },
    { name: "Kombai", group: "Indian & native breeds" },
    { name: "Kanni", group: "Indian & native breeds" },
    { name: "Rampur Greyhound", group: "Indian & native breeds" },
    { name: "Himalayan Sheepdog", group: "Indian & native breeds" },
    { name: "Bakharwal Dog", group: "Indian & native breeds" },
    { name: "Gaddi Kutta", group: "Indian & native breeds" },
    { name: "Bully Kutta", group: "Indian & native breeds" },
    { name: "Pandikona", group: "Indian & native breeds" },
    { name: "Jonangi", group: "Indian & native breeds" },
    { name: "Kaikadi", group: "Indian & native breeds" },
    { name: "Tangkhul Hui", group: "Indian & native breeds" },
    { name: "Australian Cattle Dog", group: "Working, herding & sporting breeds" },
    { name: "Belgian Tervuren", group: "Working, herding & sporting breeds" },
    { name: "Belgian Sheepdog", group: "Working, herding & sporting breeds" },
    { name: "Beauceron", group: "Working, herding & sporting breeds" },
    { name: "Briard", group: "Working, herding & sporting breeds" },
    { name: "Chesapeake Bay Retriever", group: "Working, herding & sporting breeds" },
    { name: "Flat-Coated Retriever", group: "Working, herding & sporting breeds" },
    { name: "Nova Scotia Duck Tolling Retriever", group: "Working, herding & sporting breeds" },
    { name: "Bloodhound", group: "Working, herding & sporting breeds" },
    { name: "Basset Hound", group: "Working, herding & sporting breeds" },
    { name: "Greyhound", group: "Working, herding & sporting breeds" },
    { name: "Afghan Hound", group: "Working, herding & sporting breeds" },
    { name: "Saluki", group: "Working, herding & sporting breeds" },
    { name: "Borzoi", group: "Working, herding & sporting breeds" },
    { name: "Mixed/Other", group: "Other" },
  ],
  Cat: [
    { name: "Persian", group: "Popular cat breeds", adultWeightRange: "3–6 kg" },
    { name: "Siamese", group: "Popular cat breeds", adultWeightRange: "3–6 kg" },
    { name: "Maine Coon", group: "Large cat breeds", adultWeightRange: "4–9 kg" },
    { name: "Bengal", group: "Popular cat breeds", adultWeightRange: "4–7 kg" },
    { name: "Ragdoll", group: "Popular cat breeds", adultWeightRange: "4–9 kg" },
    { name: "Mixed/Other", group: "Other" },
  ],
}

export const getBreed = (type: PetType, name: string) =>
  BREEDS[type].find((breed) => breed.name === name) ?? BREEDS[type].at(-1)!

export const getBreedImageSource = (breed: BreedReference) => {
  const thumbnail = breed.thumbnail?.trim()
  return thumbnail?.startsWith("/breeds/") ? thumbnail : null
}

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
  const meterScore = Math.max(1, Math.min(9, Math.round(1 + (position / 100) * 8)))
  const label = weightKg < range.min ? "Below adult reference" : weightKg > range.max ? "Above adult reference" : "Within adult reference"
  return { ...range, label, position, meterScore }
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
