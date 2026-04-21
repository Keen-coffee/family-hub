import React, { useState, useRef, useEffect } from 'react';
import { BookOpen, Plus, Trash2, Edit2, ChefHat, X, Check } from 'lucide-react';
import { useRecipes, useCreateRecipe, useUpdateRecipe, useDeleteRecipe } from '../hooks/useRecipes';
import { usePantryItems } from '../hooks/usePantry';
import { useCreateShoppingItem } from '../hooks/useShopping';
import Modal from '../components/common/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import type { Recipe } from '../types';

interface IngredientDraft {
  ingredient_name: string;
  notes: string;
}

function IngredientInput({
  value,
  onChange,
  pantryNames,
  onRemove,
  autoFocus,
}: {
  value: IngredientDraft;
  onChange: (field: keyof IngredientDraft, val: string) => void;
  pantryNames: string[];
  onRemove: () => void;
  autoFocus?: boolean;
}) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [focused, setFocused] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const suggestions = value.ingredient_name.trim().length > 0
    ? pantryNames.filter(n => n.toLowerCase().includes(value.ingredient_name.toLowerCase()) && n.toLowerCase() !== value.ingredient_name.toLowerCase())
    : [];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="flex gap-2 items-start">
      <div className="flex-1 relative" ref={wrapRef}>
        <input
          autoFocus={autoFocus}
          value={value.ingredient_name}
          onChange={e => { onChange('ingredient_name', e.target.value); setShowSuggestions(true); }}
          onFocus={() => { setFocused(true); setShowSuggestions(true); }}
          onBlur={() => setFocused(false)}
          placeholder="Ingredient name"
          className="w-full px-3 py-2.5 bg-surface-raised border border-slate-600 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-accent"
        />
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-surface border border-slate-600 rounded-lg shadow-xl overflow-hidden max-h-40 overflow-y-auto">
            {suggestions.map(s => (
              <button
                key={s}
                onMouseDown={e => { e.preventDefault(); onChange('ingredient_name', s); setShowSuggestions(false); }}
                className="w-full text-left px-3 py-2.5 text-sm text-slate-200 hover:bg-surface-raised"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
      <input
        value={value.notes}
        onChange={e => onChange('notes', e.target.value)}
        placeholder="Notes (optional)"
        className="w-32 px-3 py-2.5 bg-surface-raised border border-slate-600 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-accent"
      />
      <button
        onClick={onRemove}
        className="mt-0.5 w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

function RecipeForm({
  initial,
  onSave,
  onCancel,
  pantryNames,
}: {
  initial?: Recipe;
  onSave: (data: { name: string; description: string; ingredients: IngredientDraft[] }) => void;
  onCancel: () => void;
  pantryNames: string[];
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [ingredients, setIngredients] = useState<IngredientDraft[]>(
    initial?.ingredients.map(i => ({ ingredient_name: i.ingredient_name, notes: i.notes })) ?? [{ ingredient_name: '', notes: '' }]
  );

  const addIngredient = () => setIngredients(prev => [...prev, { ingredient_name: '', notes: '' }]);
  const removeIngredient = (i: number) => setIngredients(prev => prev.filter((_, idx) => idx !== i));
  const updateIngredient = (i: number, field: keyof IngredientDraft, val: string) =>
    setIngredients(prev => prev.map((ing, idx) => idx === i ? { ...ing, [field]: val } : ing));

  const handleSave = () => {
    const filled = ingredients.filter(i => i.ingredient_name.trim());
    onSave({ name, description, ingredients: filled });
  };

  return (
    <div className="p-5 space-y-5">
      <div>
        <label className="text-sm text-slate-400 mb-1.5 block">Recipe name *</label>
        <input
          autoFocus value={name} onChange={e => setName(e.target.value)}
          placeholder="e.g. Spaghetti Bolognese"
          className="w-full px-3 py-3 bg-surface-raised border border-slate-600 rounded-lg text-base text-slate-100 focus:outline-none focus:border-accent"
        />
      </div>
      <div>
        <label className="text-sm text-slate-400 mb-1.5 block">Description (optional)</label>
        <textarea
          value={description} onChange={e => setDescription(e.target.value)} rows={2}
          placeholder="Brief description…"
          className="w-full px-3 py-3 bg-surface-raised border border-slate-600 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-accent resize-none"
        />
      </div>
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm text-slate-400">Ingredients</label>
          <button
            onClick={addIngredient}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-accent/10 hover:bg-accent/20 text-accent border border-accent/30 rounded-lg"
          >
            <Plus className="w-4 h-4" /> Add ingredient
          </button>
        </div>
        <div className="space-y-2.5">
          {ingredients.map((ing, i) => (
            <IngredientInput
              key={i}
              value={ing}
              onChange={(f, v) => updateIngredient(i, f, v)}
              pantryNames={pantryNames}
              onRemove={() => removeIngredient(i)}
              autoFocus={i === ingredients.length - 1 && i > 0}
            />
          ))}
        </div>
      </div>
      <div className="flex gap-3 justify-end pt-1">
        <button onClick={onCancel} className="px-5 py-2.5 text-sm text-slate-400 hover:text-slate-200 border border-slate-700 rounded-lg">Cancel</button>
        <button
          onClick={handleSave} disabled={!name.trim()}
          className="px-5 py-2.5 text-sm bg-accent hover:bg-accent/80 text-white rounded-lg disabled:opacity-40 flex items-center gap-2"
        >
          <Check className="w-4 h-4" /> Save Recipe
        </button>
      </div>
    </div>
  );
}

function RecipeCard({ recipe, onEdit, onDelete, onSelect }: { recipe: Recipe; onEdit: () => void; onDelete: () => void; onSelect: () => void }) {
  return (
    <div className="bg-surface border border-slate-700/50 hover:border-accent/40 rounded-xl p-4 flex flex-col gap-3 transition-all">
      <div className="flex items-start justify-between gap-2">
        <button onClick={onSelect} className="flex-1 text-left">
          <p className="text-base font-semibold text-slate-200 hover:text-accent transition-colors">{recipe.name}</p>
          {recipe.description && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{recipe.description}</p>}
        </button>
        <div className="flex gap-1 shrink-0">
          <button
            onClick={onEdit}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-surface-raised text-slate-500 hover:text-slate-200 transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <p className="text-xs text-slate-500">{recipe.ingredients.length} ingredients</p>
      {recipe.ingredients.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {recipe.ingredients.slice(0, 6).map(ing => (
            <span key={ing.id} className="text-xs bg-surface-raised text-slate-400 rounded-full px-2.5 py-1">{ing.ingredient_name}</span>
          ))}
          {recipe.ingredients.length > 6 && (
            <span className="text-xs text-slate-600">+{recipe.ingredients.length - 6} more</span>
          )}
        </div>
      )}
    </div>
  );
}

export default function RecipesPage() {
  const { data: recipes = [], isLoading } = useRecipes();
  const { data: pantryItems = [] } = usePantryItems();
  const { mutate: createRecipe } = useCreateRecipe();
  const { mutate: updateRecipe } = useUpdateRecipe();
  const { mutate: deleteRecipe } = useDeleteRecipe();
  const { mutate: addToShoppingList } = useCreateShoppingItem();

  const [showCreate, setShowCreate] = useState(false);
  const [editRecipe, setEditRecipe] = useState<Recipe | null>(null);
  const [viewRecipe, setViewRecipe] = useState<Recipe | null>(null);
  const [search, setSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<Recipe | null>(null);

  const pantryNames = pantryItems.map(i => i.name);
  const filtered = recipes.filter(r => r.name.toLowerCase().includes(search.toLowerCase()));

  const handleCreate = (data: any) => {
    // For each ingredient not in pantry with quantity > 0, add to shopping list
    data.ingredients.forEach((ing: IngredientDraft) => {
      const match = pantryItems.find(p => p.name.toLowerCase() === ing.ingredient_name.toLowerCase());
      const inStockPantry = match && (match.quantity ?? 0) > 0;
      if (!inStockPantry && ing.ingredient_name.trim()) {
        addToShoppingList({ name: ing.ingredient_name.trim(), quantity: 1, unit: '', source: 'recipe' });
      }
    });
    createRecipe(data, { onSuccess: () => setShowCreate(false) });
  };

  const handleUpdate = (data: any) => {
    if (!editRecipe) return;
    updateRecipe({ id: editRecipe.id, data }, { onSuccess: () => setEditRecipe(null) });
  };

  const handleDeleteConfirmed = () => {
    if (!deleteConfirm) return;
    deleteRecipe(deleteConfirm.id);
    setDeleteConfirm(null);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700/50 shrink-0">
        <BookOpen className="w-5 h-5 text-accent" />
        <h1 className="text-base font-semibold text-slate-100 mr-auto">Recipes</h1>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search…"
          className="px-3 py-2 bg-surface-raised border border-slate-600 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-accent w-44"
        />
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/80 text-white text-sm rounded-lg"
        >
          <Plus className="w-4 h-4" /> New Recipe
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex justify-center py-8"><LoadingSpinner /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-slate-500">
            <ChefHat className="w-12 h-12 text-slate-700" />
            <p className="text-sm">{search ? 'No recipes match' : 'No recipes yet'}</p>
            {!search && <p className="text-xs text-slate-600">Click "New Recipe" to get started</p>}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(recipe => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                onEdit={() => setEditRecipe(recipe)}
                onDelete={() => setDeleteConfirm(recipe)}
                onSelect={() => setViewRecipe(recipe)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New Recipe" size="lg">
        <RecipeForm onSave={handleCreate} onCancel={() => setShowCreate(false)} pantryNames={pantryNames} />
      </Modal>

      {/* Edit modal */}
      <Modal isOpen={!!editRecipe} onClose={() => setEditRecipe(null)} title="Edit Recipe" size="lg">
        {editRecipe && <RecipeForm initial={editRecipe} onSave={handleUpdate} onCancel={() => setEditRecipe(null)} pantryNames={pantryNames} />}
      </Modal>

      {/* View modal */}
      <Modal isOpen={!!viewRecipe} onClose={() => setViewRecipe(null)} title={viewRecipe?.name ?? ''} size="md">
        {viewRecipe && (
          <div className="p-5 space-y-4">
            {viewRecipe.description && <p className="text-sm text-slate-400">{viewRecipe.description}</p>}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Ingredients</p>
              {viewRecipe.ingredients.length === 0
                ? <p className="text-sm text-slate-600">No ingredients listed</p>
                : (
                  <ul className="space-y-2">
                    {viewRecipe.ingredients.map(ing => (
                      <li key={ing.id} className="flex items-start gap-2 text-sm text-slate-200">
                        <span className="text-accent mt-0.5">•</span>
                        <span className="flex-1">{ing.ingredient_name}</span>
                        {ing.notes && <span className="text-xs text-slate-500">{ing.notes}</span>}
                      </li>
                    ))}
                  </ul>
                )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => { setViewRecipe(null); setEditRecipe(viewRecipe); }}
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-300 border border-slate-600 rounded-lg hover:bg-surface-raised"
              >
                <Edit2 className="w-4 h-4" /> Edit
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete confirmation modal */}
      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Recipe" size="sm">
        {deleteConfirm && (
          <div className="p-5 space-y-4">
            <p className="text-sm text-slate-300">
              Are you sure you want to delete <span className="font-semibold text-slate-100">"{deleteConfirm.name}"</span>? This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteConfirm(null)} className="px-5 py-2.5 text-sm border border-slate-600 rounded-lg text-slate-400 hover:text-slate-200">
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirmed}
                className="px-5 py-2.5 text-sm bg-red-600 hover:bg-red-500 text-white rounded-lg flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
