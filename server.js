const jwt = require('jsonwebtoken');
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const { db, User, Recipe, MealPlan } = require('./database/setup');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Request logging middleware
const requestLogger = (req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.originalUrl}`);
  
    // Log request body for POST and PUT requests
    if (req.method === 'POST' || req.method === 'PUT') {
         console.log('Request Body:',
   JSON.stringify(req.body, null, 2));
}
  
    next();
};

// JWT session auth middleware
function requireAuth(req, res, next) {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }
    
    // Get the token (remove 'Bearer ' prefix)
    const token = authHeader.substring(7);
    
    try {
        // Verify and decode the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // User info is now available from the token
        req.user = {
            id: decoded.id,
            username: decoded.username,
            email: decoded.email,
            role: decoded.role
        };
        
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' });
        } else if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Invalid token' });
        } else {
            return res.status(401).json({ error: 'Token verification failed' });
        }
    }
}

function requireAdmin(req, res, next) {
    // Check if user is authenticated first
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Check if user has editor role
    if (req.user.role === 'admin') {
        next();
    } else {
        return res.status(403).json({ 
            error: 'Access denied. Admin role required.' 
        });
    }
}


// Test database connection
async function testConnection() {
    try {
        await db.authenticate();
        console.log('Connection to database established successfully.');
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
}

testConnection();

// Implement requestLogger middleware
app.use(requestLogger);

// AUTHENTICATION ROUTES

// POST /api/register - Register new user
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        
        // Check if user exists
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'User with this email already exists' });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create user
        const newUser = await User.create({
            username,
            email,
            password: hashedPassword,
            role
        });
        
        res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: newUser.id,
                username: newUser.username,
                email: newUser.email
            }
        });
        
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ error: 'Failed to register user' });
    }
});

// POST /api/login - User login via JWT
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        // Create JWT containing user data
        const token = jwt.sign( 
            { 
                id: user.id, 
                username: user.username, 
                email: user.email, 
                role: user.role 
            }, 
            process.env.JWT_SECRET, 
            { expiresIn: process.env.JWT_EXPIRES_IN } 
        ); 

        res.json({ 
            message: 'Login successful', 
            token: token, 
            user: { 
                id: user.id, 
                username: user.username, 
                email: user.email, 
                role: user.role 
            } 
        });

        
    } catch (error) {
        console.error('Error logging in user:', error);
        res.status(500).json({ error: 'Failed to login' });
    }
});

// POST /api/logout - User logout
app.post('/api/logout', (req, res) => {
    res.json({ message: 'Logout successful' });
    });

// USER ROUTES

// GET /api/users/profile - Get current user profile
app.get('/api/users/profile', requireAuth, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: ['id', 'username', 'email'] // Don't return password
        });
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json(user);
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ error: 'Failed to fetch user profile' });
    }
});

// GET /api/users - Get all users
app.get('/api/users', requireAuth, requireAdmin, async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: ['id', 'username', 'email'] // Don't return passwords
        });
        
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// RECIPE ROUTES

// GET /api/recipes - Get recipes
app.get('/api/recipes', requireAuth, async (req, res) => {
    try {
        const recipes = await Recipe.findAll({
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'username', 'email']
                }
            ]
        });
        
        res.json(recipes);
    } catch (error) {
        console.error('Error fetching recipes:', error);
        res.status(500).json({ error: 'Failed to fetch recipes' });
    }
});

// GET /api/recipes/:id - Get single recipe
app.get('/api/recipes/:id', requireAuth, async (req, res) => {
    try {
        const recipe = await Recipe.findByPk(req.params.id, {
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'username', 'email']
                },
            ]
        });
        
        if (!recipe) {
            return res.status(404).json({ error: 'Recipe not found' });
        }
        
        res.json(recipe);
    } catch (error) {
        console.error('Error fetching recipe:', error);
        res.status(500).json({ error: 'Failed to fetch recipe' });
    }
});

// POST /api/recipes - Create new recipe
app.post('/api/recipes', requireAuth, async (req, res) => {
    try {
        const { name, ingredientsList, instructionsList, servings = 'active' } = req.body;
        
        const newRecipe = await Recipe.create({
            name,
            ingredientsList,
            instructionsList,
            servings,
            userId: req.user.id
        });
        
        res.status(201).json(newRecipe);
    } catch (error) {
        console.error('Error creating recipe:', error);
        res.status(500).json({ error: 'Failed to create recipe' });
    }
});

// PUT /api/recipes/:id - Update recipe
app.put('/api/recipes/:id', requireAuth, async (req, res) => {
    try {
        const { name, ingredientsList, instructionsList, servings } = req.body;
        
        const [updatedRowsCount] = await Recipe.update(
            { name, ingredientsList, instructionsList, servings },
            { where: { id: req.params.id } }
        );
        
        if (updatedRowsCount === 0) {
            return res.status(404).json({ error: 'Recipe not found' });
        }
        
        const updatedRecipe = await Recipe.findByPk(req.params.id);
        res.json(updatedRecipe);
    } catch (error) {
        console.error('Error updating recipe:', error);
        res.status(500).json({ error: 'Failed to update recipe' });
    }
});

// DELETE /api/recipes/:id - Delete recipe
app.delete('/api/projects/:id', requireAuth, async (req, res) => {
    try {
        const deletedRowsCount = await Recipe.destroy({
            where: { id: req.params.id }
        });
        
        if (deletedRowsCount === 0) {
            return res.status(404).json({ error: 'Recipe not found' });
        }
        
        res.json({ message: 'Recipe deleted successfully' });
    } catch (error) {
        console.error('Error deleting recipe:', error);
        res.status(500).json({ error: 'Failed to delete recipe' });
    }
});

// MEALPLAN ROUTES

// GET /api/mealplans - Get mealplans
app.get('/api/mealplans', requireAuth, async (req, res) => {
    try {
        const mealplans = await MealPlan.findAll({
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'username', 'email']
                }
            ]
        });
        
        res.json(mealplans);
    } catch (error) {
        console.error('Error fetching mealplans:', error);
        res.status(500).json({ error: 'Failed to fetch mealplans' });
    }
});

// GET /api/mealplans/:id - Get single mealplan
app.get('/api/mealplans/:id', requireAuth, async (req, res) => {
    try {
        const mealplan = await MealPlan.findByPk(req.params.id, {
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'username', 'email']
                },
            ]
        });
        
        if (!mealplan) {
            return res.status(404).json({ error: 'Mealplan not found' });
        }
        
        res.json(mealplan);
    } catch (error) {
        console.error('Error fetching mealplan:', error);
        res.status(500).json({ error: 'Failed to fetch mealplan' });
    }
});

// POST /api/mealplans - Create new mealplan
app.post('/api/mealplans', requireAuth, async (req, res) => {
    try {
        const { name, recipes, notes = 'active' } = req.body;
        
        const newMealPlan = await MealPlan.create({
            name,
            recipes,
            notes,
            userId: req.user.id
        });
        
        res.status(201).json(newMealPlan);
    } catch (error) {
        console.error('Error creating mealplan:', error);
        res.status(500).json({ error: 'Failed to create mealplan' });
    }
});

// PUT /api/mealplans/:id - Update mealplan
app.put('/api/mealplans/:id', requireAuth, async (req, res) => {
    try {
        const { name, recipes, notes } = req.body;
        
        const [updatedRowsCount] = await MealPlan.update(
            { name, recipes, notes },
            { where: { id: req.params.id } }
        );
        
        if (updatedRowsCount === 0) {
            return res.status(404).json({ error: 'Mealplan not found' });
        }
        
        const updatedMealPlan = await MealPlan.findByPk(req.params.id);
        res.json(updatedMealPlan);
    } catch (error) {
        console.error('Error updating mealplan:', error);
        res.status(500).json({ error: 'Failed to update mealplan' });
    }
});

// DELETE /api/mealplans/:id - Delete mealplan
app.delete('/api/mealplans/:id', requireAuth, async (req, res) => {
    try {
        const deletedRowsCount = await MealPlan.destroy({
            where: { id: req.params.id }
        });
        
        if (deletedRowsCount === 0) {
            return res.status(404).json({ error: 'Mealplan not found' });
        }
        
        res.json({ message: 'Mealplan deleted successfully' });
    } catch (error) {
        console.error('Error deleting mealplan:', error);
        res.status(500).json({ error: 'Failed to delete mealplan' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port http://localhost:${PORT}`);
});