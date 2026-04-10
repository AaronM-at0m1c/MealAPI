const bcrypt = require('bcryptjs');
const { db, User, Recipe, MealPlan } = require('./setup');

async function seedDatabase() {
    try {
        // Force sync to reset database
        await db.sync({ force: true });
        console.log('Database reset successfully.');

        // Create sample users
        const hashedPassword = await bcrypt.hash('password123', 10);

        const users = await User.bulkCreate([
            {
                username: 'john_cook',
                email: 'john@mealprep.com',
                password: hashedPassword,
                role: 'employee'
            },
            {
                username: 'sarah_chef',
                email: 'sarah@mealprep.com',
                password: hashedPassword,
                role: 'manager'
            },
            {
                username: 'mike_admin',
                email: 'mike@mealprep.com',
                password: hashedPassword,
                role: 'admin'
            }
        ]);

        // Create sample recipes
        const recipes = await Recipe.bulkCreate([
            {
                name: 'Chicken Stir Fry',
                ingredientsList: JSON.stringify([
                    '2 chicken breasts, sliced',
                    '1 red bell pepper, diced',
                    '1 cup broccoli florets',
                    '3 tbsp soy sauce',
                    '1 tbsp sesame oil',
                    '2 cloves garlic, minced',
                    '1 tbsp ginger, grated',
                    '2 cups cooked rice'
                ]),
                instructionsList: JSON.stringify([
                    'Heat sesame oil in a large skillet over medium-high heat.',
                    'Cook chicken slices until golden brown, about 5-6 minutes.',
                    'Add garlic and ginger, sauté for 1 minute.',
                    'Add bell pepper and broccoli, cook for 3-4 minutes.',
                    'Pour in soy sauce and toss to coat.',
                    'Serve over cooked rice.'
                ]),
                servings: 4,
                userId: users[0].id
            },
            {
                name: 'Overnight Oats',
                ingredientsList: JSON.stringify([
                    '1 cup rolled oats',
                    '1 cup almond milk',
                    '1/2 cup Greek yogurt',
                    '2 tbsp chia seeds',
                    '1 tbsp honey',
                    '1/2 cup mixed berries',
                    '1/4 cup sliced almonds'
                ]),
                instructionsList: JSON.stringify([
                    'Combine oats, almond milk, yogurt, and chia seeds in a jar.',
                    'Stir in honey until well mixed.',
                    'Cover and refrigerate overnight (at least 6 hours).',
                    'Top with mixed berries and sliced almonds before serving.'
                ]),
                servings: 2,
                userId: users[0].id
            },
            {
                name: 'Turkey Meatball Bowl',
                ingredientsList: JSON.stringify([
                    '1 lb ground turkey',
                    '1/4 cup breadcrumbs',
                    '1 egg',
                    '2 cloves garlic, minced',
                    '1 cup quinoa, cooked',
                    '1 cup roasted sweet potato cubes',
                    '1 cup steamed spinach',
                    '2 tbsp tahini dressing'
                ]),
                instructionsList: JSON.stringify([
                    'Preheat oven to 400°F (200°C).',
                    'Mix ground turkey, breadcrumbs, egg, and garlic in a bowl.',
                    'Form into 12 meatballs and place on a lined baking sheet.',
                    'Bake for 20-25 minutes until cooked through.',
                    'Assemble bowls with quinoa, sweet potato, and spinach.',
                    'Top with meatballs and drizzle with tahini dressing.'
                ]),
                servings: 3,
                userId: users[1].id
            },
            {
                name: 'Mediterranean Salad',
                ingredientsList: JSON.stringify([
                    '2 cups mixed greens',
                    '1/2 cup cherry tomatoes, halved',
                    '1/4 cup kalamata olives',
                    '1/4 cup feta cheese, crumbled',
                    '1/4 cucumber, diced',
                    '2 tbsp olive oil',
                    '1 tbsp red wine vinegar',
                    'Salt and pepper to taste'
                ]),
                instructionsList: JSON.stringify([
                    'Combine mixed greens, tomatoes, olives, feta, and cucumber in a large bowl.',
                    'Whisk together olive oil, red wine vinegar, salt, and pepper.',
                    'Drizzle dressing over salad and toss gently.',
                    'Serve immediately or store dressing separately for meal prep.'
                ]),
                servings: 2,
                userId: users[1].id
            },
            {
                name: 'Black Bean Tacos',
                ingredientsList: JSON.stringify([
                    '1 can black beans, drained and rinsed',
                    '1 tsp cumin',
                    '1 tsp chili powder',
                    '8 small corn tortillas',
                    '1 avocado, sliced',
                    '1/2 cup pico de gallo',
                    '1/4 cup sour cream',
                    '1/2 cup shredded lettuce'
                ]),
                instructionsList: JSON.stringify([
                    'Heat black beans in a skillet with cumin and chili powder.',
                    'Warm tortillas in a dry pan or microwave.',
                    'Fill tortillas with seasoned black beans.',
                    'Top with avocado, pico de gallo, sour cream, and lettuce.',
                    'Serve immediately.'
                ]),
                servings: 4,
                userId: users[2].id
            }
        ]);

        // Create sample meal plans
        await MealPlan.bulkCreate([
            {
                name: 'Weekday Lunch Prep',
                recipes: JSON.stringify([
                    recipes[0].id,
                    recipes[2].id,
                    recipes[3].id
                ]),
                notes: 'Prep on Sunday evening. Stir fry and meatball bowls reheat well. Keep salad dressing separate.',
                userId: users[0].id
            },
            {
                name: 'Healthy Breakfast Week',
                recipes: JSON.stringify([
                    recipes[1].id
                ]),
                notes: 'Make 5 jars of overnight oats on Sunday. Vary toppings each day for variety.',
                userId: users[0].id
            },
            {
                name: 'Family Dinner Plan',
                recipes: JSON.stringify([
                    recipes[0].id,
                    recipes[2].id,
                    recipes[4].id
                ]),
                notes: 'Monday: Stir Fry, Wednesday: Meatball Bowls, Friday: Taco Night. Double servings for leftovers.',
                userId: users[1].id
            },
            {
                name: 'Quick & Easy Meals',
                recipes: JSON.stringify([
                    recipes[3].id,
                    recipes[4].id
                ]),
                notes: 'Both recipes take under 20 minutes. Great for busy weeknights.',
                userId: users[2].id
            }
        ]);

        console.log('Database seeded successfully!');
        console.log('');
        console.log('Sample users created:');
        console.log('  - john@mealprep.com  (employee)');
        console.log('  - sarah@mealprep.com (manager)');
        console.log('  - mike@mealprep.com  (admin)');
        console.log('  All passwords: password123');
        console.log('');
        console.log(`Recipes created: ${recipes.length}`);
        console.log('Meal plans created: 4');

    } catch (error) {
        console.error('Error seeding database:', error);
    } finally {
        await db.close();
    }
}

seedDatabase();