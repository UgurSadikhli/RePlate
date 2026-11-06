import { ProductItem } from '@/models/Product';
import { AiPreferences } from '@/storage/settingStorage';
import { EXPIRES_SOON_DAYS, getExpirationDays } from '@/utils/date';

const GROQ_API_KEY =
  process.env.EXPO_PUBLIC_GROQ_API_KEY ||
  process.env.EXPO_PUBLIC_API_KEY ||
  '';
const UNSPLASH_ACCESS_KEY = process.env.EXPO_PUBLIC_UNSPLASH_ACCESS_KEY || '';

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';

export interface Meal {
  name: string;
  image?: string;
  ingredients: string[];
  steps: string[];
  calories?: number;
  proteins?: number;
  estimatedPreparationTime: string;
}

export interface IdentifiedFoodItem {
  name: string;
  quantity_estimate: string;
  quantity_estimate_type: string;
  confidence_score: number;
  item_category: string;
}

const MEAT_AND_FISH_KEYWORDS = [
  'meat',
  'beef',
  'steak',
  'ground beef',
  'mince',
  'pork',
  'bacon',
  'ham',
  'prosciutto',
  'salami',
  'pepperoni',
  'sausage',
  'chorizo',
  'hot dog',
  'chicken',
  'turkey',
  'duck',
  'poultry',
  'lamb',
  'mutton',
  'veal',
  'venison',
  'fish',
  'salmon',
  'tuna',
  'cod',
  'tilapia',
  'trout',
  'halibut',
  'sardine',
  'anchovy',
  'mackerel',
  'shrimp',
  'prawn',
  'crab',
  'lobster',
  'scallop',
  'clam',
  'mussel',
  'oyster',
  'squid',
  'calamari',
  'octopus',
  'seafood',
  'bone broth',
  'gelatin',
  'lard',
];

const VEGETARIAN_SAFE_EXCEPTIONS = [
  'vegan',
  'vegetarian',
  'plant-based',
  'beyond meat',
  'impossible',
  'jackfruit',
  'mushroom',
  'tofu',
  'tempeh',
  'seitan',
];

const DAIRY_KEYWORDS = [
  'dairy',
  'milk',
  'cheese',
  'cheddar',
  'mozzarella',
  'parmesan',
  'feta',
  'ricotta',
  'gouda',
  'brie',
  'camembert',
  'swiss cheese',
  'provolone',
  'halloumi',
  'paneer',
  'mascarpone',
  'cottage cheese',
  'cream cheese',
  'butter',
  'buttermilk',
  'ghee',
  'heavy cream',
  'whipping cream',
  'sour cream',
  'cream',
  'half and half',
  'yogurt',
  'yoghurt',
  'kefir',
  'whey',
  'casein',
  'lactose',
  'custard',
  'ice cream',
];

const DAIRY_FREE_EXCEPTIONS = [
  'almond milk',
  'oat milk',
  'soy milk',
  'coconut milk',
  'rice milk',
  'cashew milk',
  'hemp milk',
  'pea milk',
  'plant milk',
  'peanut butter',
  'almond butter',
  'cashew butter',
  'sunflower butter',
  'seed butter',
  'apple butter',
  'cocoa butter',
  'shea butter',
  'coconut cream',
  'coconut yogurt',
  'soy yogurt',
  'almond yogurt',
  'oat cream',
  'vegan',
  'dairy-free',
  'dairy free',
  'non-dairy',
  'non dairy',
  'lactose-free',
  'lactose free',
];

const GLUTEN_KEYWORDS = [
  'wheat',
  'flour',
  'bread',
  'pasta',
  'spaghetti',
  'noodle',
  'macaroni',
  'penne',
  'tortilla',
  'bagel',
  'croissant',
  'biscuit',
  'cracker',
  'couscous',
  'bulgur',
  'semolina',
  'barley',
  'rye',
  'seitan',
  'breadcrumbs',
  'panko',
];

function containsKeyword(text: string, keyword: string): boolean {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\b${escaped}s?\\b`, 'i');
  return regex.test(text);
}

/**
 * Filters out products that are:
 * 1. Marked as "To Buy" (not in inventory)
 * 2. Already expired (expirationDate < today)
 * 3. Excluded by user settings (isVegetarian, avoidDairy, allergens)
 */
export function filterEligibleProducts(
  products: ProductItem[],
  prefs: AiPreferences
): ProductItem[] {
  const rawAllergens = (prefs.allergens || '')
    .split(/[,;/\n]+/)
    .map((a) => a.trim().toLowerCase())
    .filter(Boolean);

  return products.filter((p) => {
    if (p.toBuy) return false;

    if (p.expirationDate) {
      const daysLeft = getExpirationDays(p.expirationDate);
      if (daysLeft !== null && daysLeft < 0) {
        return false;
      }
    }

    const combinedText = `${p.name || ''} ${p.category || ''} ${p.notes || ''}`.toLowerCase();

    if (prefs.isVegetarian) {
      const isVegException = VEGETARIAN_SAFE_EXCEPTIONS.some((ex) =>
        combinedText.includes(ex)
      );
      if (!isVegException) {
        const hasMeatOrFish = MEAT_AND_FISH_KEYWORDS.some((kw) =>
          containsKeyword(combinedText, kw)
        );
        if (hasMeatOrFish) return false;
      }
    }

    if (prefs.avoidDairy) {
      const isDairyFreeException = DAIRY_FREE_EXCEPTIONS.some((ex) =>
        combinedText.includes(ex)
      );
      if (!isDairyFreeException) {
        const hasDairy = DAIRY_KEYWORDS.some((kw) => containsKeyword(combinedText, kw));
        if (hasDairy) return false;
      }
    }

    if (rawAllergens.length > 0) {
      for (const allergen of rawAllergens) {
        const singular =
          allergen.endsWith('s') && allergen.length > 3 ? allergen.slice(0, -1) : allergen;

        if (
          combinedText.includes(allergen) ||
          containsKeyword(combinedText, singular)
        ) {
          return false;
        }

        if (
          (allergen.includes('gluten') || allergen.includes('wheat')) &&
          !combinedText.includes('gluten-free') &&
          !combinedText.includes('gluten free')
        ) {
          if (GLUTEN_KEYWORDS.some((kw) => containsKeyword(combinedText, kw))) {
            return false;
          }
        }

        if (
          allergen.includes('dairy') ||
          allergen.includes('lactose') ||
          allergen === 'milk'
        ) {
          const isDairyFreeException = DAIRY_FREE_EXCEPTIONS.some((ex) =>
            combinedText.includes(ex)
          );
          if (
            !isDairyFreeException &&
            DAIRY_KEYWORDS.some((kw) => containsKeyword(combinedText, kw))
          ) {
            return false;
          }
        }
      }
    }

    return true;
  });
}

export function buildPreferencePrompt(prefs: AiPreferences): string {
  const lines: string[] = [];

  if (prefs.isVegetarian) {
    lines.push(
      '- DIET (VEGETARIAN): User is strictly vegetarian. NEVER include any meat, beef, pork, poultry, chicken, fish, or seafood in ingredients or steps.'
    );
  }

  if (prefs.avoidDairy) {
    lines.push(
      '- DIET (DAIRY-FREE): User avoids dairy. NEVER include milk, cheese, butter, cream, yogurt, or any dairy derivatives. Use dairy-free or plant-based alternatives if needed.'
    );
  }

  if (prefs.allergens && prefs.allergens.trim() !== '') {
    lines.push(
      `- CRITICAL ALLERGENS: User is allergic to [${prefs.allergens.trim()}]. STRICTLY EXCLUDE these allergens and any ingredients derived from them.`
    );
  }

  const spice = (prefs.spiceLevel || 'medium').toLowerCase();
  if (spice === 'mild') {
    lines.push(
      '- SPICE LEVEL (MILD): User prefers MILD food. Avoid hot chilies, cayenne, hot sauce, or heavy pungent spices. Keep all recipes mild and gentle.'
    );
  } else if (spice === 'hot') {
    lines.push(
      '- SPICE LEVEL (HOT): User prefers HOT/SPICY food. Incorporate bold spices, chili peppers, hot sauce, or warm heat into the recipes where appropriate.'
    );
  } else {
    lines.push(
      '- SPICE LEVEL (MEDIUM): User prefers a MEDIUM spice level. Use balanced seasoning with moderate warmth.'
    );
  }

  return lines.join('\n');
}

/**
 * Formats pre-filtered (non-expired, diet/allergen-safe) products into two sections:
 * 1. High-priority items expiring soon (0 to EXPIRES_SOON_DAYS days left), sorted by urgency
 * 2. Other available non-expired items
 */
export function formatIngredientsForPrompt(eligibleProducts: ProductItem[]): string {
  if (eligibleProducts.length === 0) return '';

  const expiringSoon: { item: ProductItem; days: number }[] = [];
  const regularItems: ProductItem[] = [];

  for (const p of eligibleProducts) {
    const days = getExpirationDays(p.expirationDate);
    if (days !== null && days >= 0 && days <= EXPIRES_SOON_DAYS) {
      expiringSoon.push({ item: p, days });
    } else {
      regularItems.push(p);
    }
  }

  expiringSoon.sort((a, b) => a.days - b.days);

  const sections: string[] = [];

  if (expiringSoon.length > 0) {
    const urgentList = expiringSoon
      .map(({ item, days }) => {
        const urgency =
          days === 0
            ? 'EXPIRES TODAY - HIGHEST PRIORITY'
            : `EXPIRES IN ${days} DAY${days === 1 ? '' : 'S'} - HIGH PRIORITY`;
        return `- ${item.name} (${item.quantity} ${item.quantityType}) [${urgency}]`;
      })
      .join('\n');
    sections.push(`URGENT - PRODUCTS ABOUT TO EXPIRE (Prioritize using these first!):\n${urgentList}`);
  }

  if (regularItems.length > 0) {
    const regularList = regularItems
      .map((item) => {
        const days = getExpirationDays(item.expirationDate);
        const expInfo = days !== null ? ` (expires in ${days} days)` : '';
        return `- ${item.name} (${item.quantity} ${item.quantityType})${expInfo}`;
      })
      .join('\n');
    sections.push(`OTHER AVAILABLE INGREDIENTS:\n${regularList}`);
  }

  return sections.join('\n\n');
}

const PREFERRED_TEXT_MODELS = [
  'qwen/qwen3.8-27b',
  'qwen/qwen3.6-27b',
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'qwen/qwen3-32b',
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'meta-llama/llama-4-maverick-17b-128e-instruct',
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
];

const PREFERRED_VISION_MODELS = [
  'qwen/qwen3.8-27b',
  'qwen/qwen3.6-27b',
  'meta-models/muse-spark-open',
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'meta-llama/llama-4-maverick-17b-128e-instruct',
  'llama-3.2-90b-vision-preview',
  'llama-3.2-11b-vision-preview',
];

let cachedAvailableModels: string[] | null = null;

async function getAvailableGroqModels(): Promise<string[]> {
  if (cachedAvailableModels && cachedAvailableModels.length > 0) {
    return cachedAvailableModels;
  }

  const response = await fetch(`${GROQ_BASE_URL}/models`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY.trim()}`,
    },
  });

  if (!response.ok) {
    return [];
  }

  const data = await response.json();
  const ids: string[] = Array.isArray(data?.data)
    ? data.data.map((m: any) => String(m.id))
    : [];

  if (Array.isArray(data?.data) && ids.length === 0) {
    throw new Error(
      'Your Groq API key currently has no models enabled in your Groq Project. Go to https://console.groq.com -> Settings -> Limits (or Project Models) and enable model access for your project.'
    );
  }

  if (ids.length > 0) {
    cachedAvailableModels = ids;
  }
  return ids;
}

async function getCandidateGroqModels(preferredList: string[], isVision = false): Promise<string[]> {
  const available = await getAvailableGroqModels();
  const result: string[] = [];

  if (available.length > 0) {
    for (const candidate of preferredList) {
      if (available.includes(candidate) && !result.includes(candidate)) {
        result.push(candidate);
      }
    }

    const chatModels = available.filter((id) => {
      const lower = id.toLowerCase();
      return (
        !lower.includes('whisper') &&
        !lower.includes('tts') &&
        !lower.includes('playai') &&
        !lower.includes('orpheus') &&
        !lower.includes('guard') &&
        !lower.includes('safeguard') &&
        !lower.includes('embed')
      );
    });

    if (isVision) {
      for (const id of chatModels) {
        const lower = id.toLowerCase();
        if (
          (lower.includes('qwen3.8') ||
            lower.includes('qwen3.6') ||
            lower.includes('muse') ||
            lower.includes('vl') ||
            lower.includes('scout') ||
            lower.includes('maverick') ||
            lower.includes('vision') ||
            lower.includes('llava')) &&
          !result.includes(id)
        ) {
          result.push(id);
        }
      }
    }

    for (const id of chatModels) {
      if (!result.includes(id)) {
        result.push(id);
      }
    }
  }

  if (result.length === 0) {
    return preferredList;
  }

  return result;
}

function extractJsonObject(raw: string): any {
  const cleaned = raw
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
    }
    const firstBracket = cleaned.indexOf('[');
    const lastBracket = cleaned.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket > firstBracket) {
      return JSON.parse(cleaned.slice(firstBracket, lastBracket + 1));
    }
    throw new Error('Failed to parse JSON response from AI model.');
  }
}

export const generateMealsWithGroq = async (
  availableIngredients: string,
  preferencePrompt: string
): Promise<Meal[]> => {
  if (!GROQ_API_KEY) {
    throw new Error(
      'Missing EXPO_PUBLIC_GROQ_API_KEY in .env file. Add your free Groq API key and restart Expo.'
    );
  }

  const candidateModels = await getCandidateGroqModels(PREFERRED_TEXT_MODELS, false);

  const systemPrompt = `You are a creative chef and nutritionist assistant. You MUST strictly obey all user dietary restrictions, allergen exclusions, and spice level preferences. Never suggest expired items or restricted ingredients. Always respond ONLY with valid JSON matching this exact object structure:
{
  "meals": [
    {
      "name": "string",
      "ingredients": ["string"],
      "steps": ["string"],
      "calories": 450,
      "proteins": 25,
      "estimatedPreparationTime": "20 mins"
    }
  ]
}`;

  const userPrompt = `Based on the following non-expired, pre-filtered available ingredients, suggest 6-8 quick and easy meal recipes.

STRICT USER DIETARY PREFERENCES & SETTINGS:
${preferencePrompt}

Available eligible ingredients:
${availableIngredients}

Important rules:
1. Only use ingredients from the available list (plus basic safe pantry staples like water, salt, pepper, or cooking oil that do NOT violate any dietary restrictions or allergens above).
2. Prioritize ingredients marked as expiring soon.
3. Return ONLY a JSON object with a "meals" array.`;

  let lastError = '';

  for (const model of candidateModels.slice(0, 4)) {
    const response = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_API_KEY.trim()}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      lastError = `Groq API error (${response.status}) [model: ${model}]: ${errorText}`;
      continue;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '{"meals":[]}';
    const parsed = extractJsonObject(content);
    const meals: Meal[] = Array.isArray(parsed) ? parsed : parsed.meals || [];

    return Promise.all(
      meals.map(async (meal) => ({
        ...meal,
        image: await fetchMealImage(meal.name),
      }))
    );
  }

  cachedAvailableModels = null;
  throw new Error(lastError || 'Could not generate meals with available Groq models.');
};

export const scanFoodImageWithGroq = async (
  base64Image: string
): Promise<IdentifiedFoodItem[]> => {
  if (!GROQ_API_KEY) {
    throw new Error(
      'Missing EXPO_PUBLIC_GROQ_API_KEY in .env file. Add your free Groq API key and restart Expo.'
    );
  }

  const candidateModels = await getCandidateGroqModels(PREFERRED_VISION_MODELS, true);

  const prompt = `Analyze this image of food/groceries and return ONLY a raw JSON object (no markdown, no explanation) with an "items" array in this exact format:
{
  "items": [
    {
      "name": "Apple",
      "quantity_estimate": "3",
      "quantity_estimate_type": "pcs",
      "item_category": "fruit",
      "confidence_score": 0.95
    }
  ]
}`;

  let lastError = '';

  for (const model of candidateModels.slice(0, 5)) {
    const response = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_API_KEY.trim()}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      lastError = `Groq Vision API error (${response.status}) [model: ${model}]: ${errorText}`;
      continue;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '{"items":[]}';
    const parsed = extractJsonObject(content);
    return Array.isArray(parsed) ? parsed : parsed.items || [];
  }

  cachedAvailableModels = null;
  throw new Error(lastError || 'No vision-capable model succeeded on your Groq account.');
};

export const fetchMealImage = async (query: string): Promise<string> => {
  const fallbackUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(
    `${query} delicious plated food photography`
  )}?width=400&height=300&nologo=true`;

  if (!UNSPLASH_ACCESS_KEY) {
    return fallbackUrl;
  }

  try {
    const response = await fetch(
      `https://api.unsplash.com/photos/random?query=${encodeURIComponent(
        query
      )}&orientation=landscape&client_id=${UNSPLASH_ACCESS_KEY}`
    );
    if (!response.ok) return fallbackUrl;
    const data = await response.json();
    return data.urls?.small || fallbackUrl;
  } catch {
    return fallbackUrl;
  }
};
