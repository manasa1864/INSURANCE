// Master list of insurance types the app supports.
// Each entry has an id (used in URLs + logic), display name, and Tailwind colour pair.
// The helper maps at the bottom save you from doing .find() every time you need a name or colour.

export interface InsuranceTypeConfig {
  id: string;
  name: string;
  color: string;
}

export const INSURANCE_TYPES: InsuranceTypeConfig[] = [
  { id: 'health',    name: 'Health',            color: 'bg-blue-50 text-blue-700'     },
  { id: 'life',      name: 'Life',              color: 'bg-purple-50 text-purple-700' },
  { id: 'vehicle',   name: 'Vehicle',           color: 'bg-orange-50 text-orange-700' },
  { id: 'travel',    name: 'Travel',            color: 'bg-cyan-50 text-cyan-700'     },
  { id: 'home',      name: 'Home',              color: 'bg-green-50 text-green-700'   },
  { id: 'business',  name: 'Business',          color: 'bg-rose-50 text-rose-700'     },
  { id: 'accident',  name: 'Personal Accident', color: 'bg-red-50 text-red-700'       },
  { id: 'critical',  name: 'Critical Illness',  color: 'bg-pink-50 text-pink-700'     },
  { id: 'education', name: 'Education',         color: 'bg-indigo-50 text-indigo-700' },
  { id: 'crop',      name: 'Crop',              color: 'bg-lime-50 text-lime-700'     },
  { id: 'gadget',    name: 'Gadget',            color: 'bg-yellow-50 text-yellow-700' },
  { id: 'pet',       name: 'Pet',               color: 'bg-teal-50 text-teal-700'     },
  { id: 'cyber',     name: 'Cyber',             color: 'bg-violet-50 text-violet-700' },
  { id: 'fire',      name: 'Fire',              color: 'bg-amber-50 text-amber-700'   },
  { id: 'marine',    name: 'Marine',            color: 'bg-sky-50 text-sky-700'       },
];

// id → Tailwind colour string
export const TYPE_COLOR_MAP: Record<string, string> = Object.fromEntries(
  INSURANCE_TYPES.map(t => [t.id, t.color])
);

// id → display name
export const TYPE_NAME_MAP: Record<string, string> = Object.fromEntries(
  INSURANCE_TYPES.map(t => [t.id, t.name])
);
