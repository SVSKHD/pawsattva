/** The example payload from the integration spec, with enough body text to pass validation. */
export const validDraft = () => ({
  title: "How to Brush Your Dog's Teeth at Home",
  excerpt: "A practical guide to dog dental hygiene.",
  keywords: ["dog dental care", "how to brush dog teeth", "dog oral hygiene"],
  seoTitle: "How to Brush Dog Teeth Safely | PawSattva",
  image: "https://images.unsplash.com/photo-1450778869180-41d0601e046e",
  content: [
    "<h2>Introduction</h2>",
    "<p>Dental disease is one of the most common health problems in adult dogs. Brushing a few times a week",
    " with a dog-safe toothpaste removes plaque before it hardens into tartar.</p>",
    "<h2>What you need</h2>",
    "<ul><li>A soft brush or finger brush</li><li>Enzymatic dog toothpaste (never human toothpaste)</li></ul>",
    "<p>Start slowly, reward calm behaviour and ask your vet about a professional cleaning if you notice bad breath.</p>",
  ].join(""),
})
