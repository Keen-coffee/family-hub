// ── CalDAV ────────────────────────────────────────────────────────────────────
export interface CalDAVCalendar {
  href: string;
  name: string;
}

export interface CalDAVEvent {
  uid: string;
  href: string;
  etag: string;
  summary: string;
  description?: string;
  location?: string;
  start: string;
  end: string;
  allDay: boolean;
  rrule?: string;
  color?: string;
  icalString?: string;
}

export interface CalDAVTodo {
  uid: string;
  href: string;
  etag: string;
  summary: string;
  description?: string;
  status: 'NEEDS-ACTION' | 'IN-PROCESS' | 'COMPLETED' | 'CANCELLED';
  priority?: number;
  due?: string;
  categories?: string;
  assignee?: string;
  rrule?: string;
  icalString?: string;
}

// ── Weather ───────────────────────────────────────────────────────────────────
export interface WeatherCurrent {
  name: string;
  main: { temp: number; feels_like: number; humidity: number; pressure: number };
  weather: { id: number; main: string; description: string; icon: string }[];
  wind: { speed: number; deg: number };
  visibility: number;
  dt: number;
  sys: { sunrise: number; sunset: number };
}

export interface WeatherForecastItem {
  dt: number;
  main: { temp: number; temp_min: number; temp_max: number; humidity: number };
  weather: { id: number; main: string; description: string; icon: string }[];
  wind: { speed: number };
  dt_txt: string;
}

export interface WeatherForecast {
  list: WeatherForecastItem[];
  city: { name: string };
}

// ── Mealie (kept for compatibility, unused) ───────────────────────────────────
// ── Pantry ────────────────────────────────────────────────────────────────────
export interface PantrySection {
  id: string;
  name: string;
  icon: string;
  sort_order: number;
  created_at: string;
}

export interface PantryItem {
  id: string;
  section_id: string;
  name: string;
  generic_name: string;
  brand: string;
  quantity: number;
  unit: string;
  min_quantity: number;
  barcode: string;
  created_at: string;
}

// ── Shopping List ─────────────────────────────────────────────────────────────
export interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  checked: boolean;
  source: 'manual' | 'pantry' | 'recipe';
  created_at: string;
}

// ── Recipes ───────────────────────────────────────────────────────────────────
export interface RecipeIngredient {
  id: string;
  recipe_id: string;
  ingredient_name: string;
  notes: string;
  sort_order: number;
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  servings: number;
  ingredients: RecipeIngredient[];
  created_at: string;
}

// ── Meal Plan ─────────────────────────────────────────────────────────────────
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface MealPlanEntry {
  id: string;
  date: string;
  meal_type: MealType;
  recipe_id: string | null;
  recipe_name: string | null;
  custom_name: string;
  created_at: string;
}

export interface CheckGroceriesResult {
  added: string[];
  alreadyHave: string[];
  message?: string;
}

// ── Inventory ─────────────────────────────────────────────────────────────────
export interface InventoryItem {
  id: string;
  barcode?: string;
  name: string;
  category?: string;
  quantity: number;
  unit: string;
  minimum_quantity: number;
  image_url?: string;
  notes?: string;
  last_scanned?: string;
  created_at: string;
}

export interface GroceryItem {
  id: string;
  name: string;
  barcode?: string;
  quantity: number;
  unit: string;
  category?: string;
  checked: boolean;
  source: 'manual' | 'inventory' | 'tandoor';
  created_at: string;
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export type WidgetType = 'clock' | 'calendar' | 'weather' | 'tasks' | 'grocery' | 'chores' | 'meals';

export interface WidgetConfig {
  i: string;
  type: WidgetType;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  static?: boolean;
  /** Per-widget customization settings */
  settings?: Record<string, unknown>;
}

export interface DashboardLayout {
  id: string;
  name: string;
  layout: WidgetConfig[];
}

// ── Settings ──────────────────────────────────────────────────────────────────
export interface AppSettings {
  caldav_url: string;
  caldav_username: string;
  caldav_password: string;
  caldav_calendar_href: string;
  caldav_chores_calendar_href: string;
  caldav_tasks_calendar_href: string;
  pirateweather_api_key: string;
  weather_lat: string;
  weather_lon: string;
  weather_units: 'imperial' | 'metric';
  family_members: string; // comma-separated
  openrouter_api_key: string;
  openrouter_model: string;
}

// ── API Response ──────────────────────────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ── Tasks ─────────────────────────────────────────────────────────────────────
export interface Task {
  id: string;
  title: string;
  notes: string;
  completed: number; // 0 | 1 (SQLite boolean)
  due_date: string | null;
  sort_order: number;
  created_at: string;
}
