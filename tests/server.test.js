const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { app, db, User, Recipe, MealPlan } = require('../server');
require('dotenv').config();

// Helper function to generate auth token

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

// Auth setup

let testUser;
let authToken;
let userB, adminUser;
let tokenB, adminToken;

beforeAll(async () => {
  await db.sync({ force: true });

  const hashed = await bcrypt.hash('password123', 10);
  testUser = await User.create({
    username: 'testuser',
    email: 'test@example.com',
    password: hashed,
    role: 'user'
  });

  // Additional users for IDOR and RBAC tests
  userB = await User.create({ username: 'userB', email: 'b@example.com', password: hashed, role: 'user' });
  adminUser = await User.create({ username: 'admin', email: 'admin@example.com', password: hashed, role: 'admin' });

  authToken = generateToken({
    id: testUser.id,
    username: testUser.username,
    email: testUser.email
  });

  // Tokens for additional users — must be inside beforeAll so user ids are available
  tokenB = generateToken({ id: userB.id, username: userB.username, email: userB.email, role: 'user' });
  adminToken = generateToken({ id: adminUser.id, username: adminUser.username, email: adminUser.email, role: 'admin' });
});

afterAll(async () => {
  await db.close();
});

// User tests

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
        email: 'test@example.com',
        password: 'passwordmorethan8charslol',
        role: 'user'
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/already exists/i);
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

  let planA;
  let planB;

  const MEALPLAN_BODY = {
    name: 'Weekly Plan',
    recipes: 'Tacos, Pasta, Salad',
    notes: 'Prep on Sunday'
  };

  beforeEach(async () => {
    await MealPlan.destroy({ where: {} });
    planA = await MealPlan.create({ ...MEALPLAN_BODY, name: 'Plan A', userId: testUser.id });
    planB = await MealPlan.create({ ...MEALPLAN_BODY, name: 'Plan B', userId: userB.id });
  });

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

  it('returns only the requesting user\'s own meal plans', async () => {
    const res = await request(app)
      .get('/api/mealplans')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    res.body.forEach(p => expect(p.userId).toBe(testUser.id));
    expect(res.body.find(p => p.id === planB.id)).toBeUndefined();
  });

  it('returns all meal plans when called by an admin', async () => {
    const res = await request(app)
      .get('/api/mealplans')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/mealplans');
    expect(res.statusCode).toBe(401);
  });

  it('updates a meal plan the user owns', async () => {
    const res = await request(app)
      .put(`/api/mealplans/${planA.id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ ...MEALPLAN_BODY, name: 'Updated Plan' });

    expect(res.statusCode).toBe(200);
    expect(res.body.name).toBe('Updated Plan');
  });

  it('returns 404 when trying to update another user\'s meal plan (IDOR check)', async () => {
    const res = await request(app)
      .put(`/api/mealplans/${planB.id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ ...MEALPLAN_BODY, name: 'Hijacked' });

    expect(res.statusCode).toBe(404);

    const unchanged = await MealPlan.findByPk(planB.id);
    expect(unchanged.name).toBe('Plan B');
  });

  it('deletes a meal plan the user owns', async () => {
    const res = await request(app)
      .delete(`/api/mealplans/${planA.id}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.statusCode).toBe(200);
    expect(await MealPlan.findByPk(planA.id)).toBeNull();
  });

  it('returns 404 when trying to delete another user\'s meal plan (IDOR check)', async () => {
    const res = await request(app)
      .delete(`/api/mealplans/${planB.id}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.statusCode).toBe(404);
    expect(await MealPlan.findByPk(planB.id)).not.toBeNull();
  });
});