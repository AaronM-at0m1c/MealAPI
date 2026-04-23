# MealAPI

This repository contains the code for the MealAPI. Below is everything you need to get started. MealAPI is a REST API solution to the headache of weekly meal prep.
You can find the Postman documentation for this API [here](https://documenter.getpostman.com/view/44015664/2sBXitDTQc)

This API is live on Render at: https://mealapi-k08l.onrender.com/

## Getting Started

1. Clone this repository to your local machine
2. Navigate to the project directory
3. Install dependencies:
   ```bash
   npm install
   ```
4. This project requires an .env file. Below is an example of what you will need:
```
# Database Configuration
DB_NAME=mealprep.db
DB_TYPE=sqlite
NODE_ENV=development
JWT_SECRET=somesecuresecret
JWT_EXPIRES_IN=24h

# Server Configuration
PORT=3003
```

## API Endpoints Overview

### Authentication
```
POST /api/register

Request body:

username (string)
email (string)
password (string)
```

```
POST /api/login

Request body:

email (string)
password (string)

Response:

token (JWT)
```

```
Logout

POST /api/logout
```

```
Get Current User

GET /api/users/profile

Headers:

Authorization: Bearer token
```

```
Get All Users (Admin only)

GET /api/users

Headers:

Authorization: Bearer token
```
### Recipes

```
Get All Recipes

GET /api/recipes

Headers:

Authorization: Bearer token
```

```
Get Recipe by ID

GET /api/recipes/:id

Headers:

Authorization: Bearer token
```

```
Create Recipe

POST /api/recipes

Headers:

Authorization: Bearer token

Request body:

name (string)
ingredientsList (string)
instructionsList (string)
servings (number)
```

```
Update Recipe

PUT /api/recipes/:id

Headers:

Authorization: Bearer token

Request body:

name (string)
ingredientsList (string)
instructionsList (string)
servings (number)
```

```
Delete Recipe

DELETE /api/recipes/:id

Headers:

Authorization: Bearer token
```
### Meal Plans
```
Get All Meal Plans

GET /api/mealplans

Headers:

Authorization: Bearer token
```

```
Get Meal Plan by ID

GET /api/mealplans/:id

Headers:

Authorization: Bearer token
```

```
Create Meal Plan

POST /api/mealplans

Headers:

Authorization: Bearer token

Request body:

name (string)
recipes (string or array)
notes (string)
```

```
Update Meal Plan

PUT /api/mealplans/:id

Headers:

Authorization: Bearer token

Request body:

name (string)
recipes (string or array)
notes (string)
```

```
Delete Meal Plan

DELETE /api/mealplans/:id

Headers:

Authorization: Bearer token
```
## Testing

To run tests for this project, simply run:

```bash
npm test
```

## File Structure

```
database/
├── mealprep.db
├── seed.js
└── setup.js

tests/
├── server.test.js

mealapi/
├── server.js
```
