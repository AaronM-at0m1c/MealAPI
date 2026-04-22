const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { app, db, User, Recipe, MealPlan } = require('../server');
require('dotenv').config();

// Helper functions

function generateToken(overrides = {}) {
  const payload = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    role: 'user',
    ...overrides
  };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
}

const RECIPE_BODY = {
  name: 'Spaghetti Bolognese',
  ingredientsList: 'pasta, beef, tomato sauce',
  instructionsList: 'Boil pasta. Cook sauce. Combine.',
  servings: 4
};
 
const MEALPLAN_BODY = {
  name: 'Weekly Plan',
  recipes: 'Tacos, Pasta, Salad',
  notes: 'Prep on Sunday'
};

// Auth setup

let userA, userB, adminUser;
let tokenA, tokenB, adminToken;


beforeAll(async () => {
  await db.sync({ force: true });

  const hashed = await bcrypt.hash('password123', 10);
  userA = await User.create({
    username: 'userA',
    email: 'a@example.com',
    password: hashed,
    role: 'user' });
  userB = await User.create({
    username: 'userB',
    email: 'b@example.com',
    password: hashed,
    role: 'user' });
  adminUser = await User.create({
    username: 'admin',
    email: 'admin@example.com',
    password: hashed,
    role: 'admin' });

  });

   tokenA = generateToken({
    id: userA.id,
    username: userA.username,
    email: userA.email,
    role: 'user' });
  tokenB = generateToken({
    id: userB.id,
    username: userB.username,
    email: userB.email,
    role: 'user' });
  adminToken = generateToken({
    id: adminUser.id,
    username: adminUser.username,
    email: adminUser.email,
    role: 'admin' });


afterAll(async () => {
  await db.close();
});

// User and auth tests

describe('Users', () => {

  it('should register a new user', async () => {
    const res = await request(app)
      .post('/api/register')
      .send({
        username: 'newuser',
        email: 'new@example.com',
        password: 'password123',
        role: 'user'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.message).toBe('User registered successfully');
    expect(res.body.user).toHaveProperty('id');
    expect(res.body.user).not.toHaveProperty('password');
  });

  it('should return 400 if email already exists', async () => {
    const res = await request(app)
      .post('/api/register')
      .send({
        username: 'duplicate',
        email: 'a@example.com',
        password: 'pass',
        role: 'user'
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/already exists/i);
  });

  it('returns 400 when email is malformed', async () => {
    const res = await request(app).post('/api/register').send({
      username: 'validuser',
      email: 'not-an-email',
      password: 'password123'
    });

  expect(res.statusCode).toBe(400);
});
});

describe('POST /api/login', () => {
  it('returns a JWT token on valid credentials', async () => {
    const res = await request(app).post('/api/login').send({
      email: 'a@example.com',
      password: 'password123'
    });
 
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.email).toBe('a@example.com');
    expect(res.body.user).not.toHaveProperty('password');
  });
 
  it('returns 401 on wrong password', async () => {
    const res = await request(app).post('/api/login').send({
      email: 'a@example.com',
      password: 'wrongpassword'
    });
 
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toMatch(/invalid/i);
  });
 
  it('returns 401 for an email that does not exist', async () => {
    const res = await request(app).post('/api/login').send({
      email: 'ghost@example.com',
      password: 'password123'
    });
 
    expect(res.statusCode).toBe(401);
  });
});
 
describe('POST /api/logout', () => {
  it('returns 200 with a success message', async () => {
    const res = await request(app).post('/api/logout');
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/logout/i);
  });
});


// Recipe tests

describe('Recipes', () => {

  afterEach(async () => {
    await Recipe.destroy({ where: {} });
  });

  it('should create a new recipe', async () => {
    const res = await request(app)
      .post('/api/recipes')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Spaghetti Bolognese',
        ingredientsList: 'pasta, beef, tomato sauce',
        instructionsList: 'Boil pasta. Cook sauce. Combine.',
        servings: 4
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.name).toBe('Spaghetti Bolognese');
    expect(res.body.userId).toBe(testUser.id);
  });

  it('should return 404 for non-existent recipe', async () => {
    const res = await request(app)
      .get('/api/recipes/99999')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.statusCode).toBe(404);
  });
});

// Mealplan tests

describe('MealPlans', () => {

  afterEach(async () => {
    await MealPlan.destroy({ where: {} });
  });

  it('should create a new meal plan', async () => {
    const res = await request(app)
      .post('/api/mealplans')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Weekly Plan',
        recipes: 'Tacos, Pasta, Salad',
        notes: 'Prep on Sunday'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.name).toBe('Weekly Plan');
    expect(res.body.userId).toBe(testUser.id);
  });

  it('should return 404 for non-existent meal plan', async () => {
    const res = await request(app)
      .get('/api/mealplans/99999')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.statusCode).toBe(404);
  });
});