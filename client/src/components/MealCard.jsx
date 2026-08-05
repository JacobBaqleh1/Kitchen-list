export function MealCard({ meal, savedId, onSave, onUnsave, saving }) {
  const showSave = onSave || onUnsave;

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-md">
      <div className="flex items-start justify-between gap-3 bg-green-600 px-4 py-3.5 text-white">
        <div className="min-w-0 flex-1 text-lg font-bold">{meal.name}</div>
        {showSave && (
          <button
            type="button"
            className={`btn btn-sm shrink-0 ${savedId ? 'btn-white' : 'btn-ghost border border-white/40 text-white hover:bg-white/10'}`}
            onClick={savedId ? onUnsave : onSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : savedId ? 'Saved' : 'Save recipe'}
          </button>
        )}
      </div>
      <div className="grid gap-4 p-4 text-gray-900">
        <div>
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">Recipe</div>
          <ol className="flex list-none flex-col gap-2">
            {meal.recipe.map((step, i) => (
              <li key={i} className="flex gap-2.5 text-sm">
                <span className="mt-0.5 flex size-5.5 shrink-0 items-center justify-center rounded-full bg-green-100 text-[0.72rem] font-bold text-green-700">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
        {(meal.shopping_list ?? meal.shoppingList)?.length > 0 && (
          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">Shopping list</div>
            <ul className="flex list-none flex-wrap gap-1.5">
              {(meal.shopping_list ?? meal.shoppingList).map((item, i) => (
                <li
                  key={i}
                  className="rounded-full border border-amber-200 bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-600"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
