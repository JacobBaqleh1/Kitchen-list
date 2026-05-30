export function MealCard({ meal }) {
  return (
    <div className="meal-card">
      <div className="meal-card-header">
        <div className="meal-card-name">{meal.name}</div>
      </div>
      <div className="meal-card-body">
        <div>
          <div className="meal-section-title">Recipe</div>
          <ol className="recipe-steps">
            {meal.recipe.map((step, i) => (
              <li key={i} className="recipe-step">
                <span className="step-num">{i + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
        {meal.shopping_list?.length > 0 && (
          <div>
            <div className="meal-section-title">Shopping list</div>
            <ul className="shopping-list">
              {meal.shopping_list.map((item, i) => (
                <li key={i} className="shopping-item">{item}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
