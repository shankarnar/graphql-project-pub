GraphQL API built with Node.js, Express.js, and GraphQL that serves data from a static JSON file.

## Features

- GraphQL queries and mutations
- Static JSON data storage
- Express.js server integration
- Environment variable configuration
- Jest unit testing

### Prerequisites
- Node.js (v14 or higher)
- npm

### Installation

1. Clone the repository:
```WSL
git clone https://github.com/YOUR_USERNAME/graphql-api-project.git
cd graphql-api-project

Install dependencies:

npm install

Create environment file:

    # Server Configuration
    PORT=4000
    NODE_ENV=development


Start the development server:

npm run dev

Open GraphQL at http://localhost:4000

Available Scripts

npm start - Start production server
npm run dev - Start development server with nodemon

# Data Configuration
DATA_FILE_PATH=./src/data/data.json


API Documentation

Queries



# Get All users
query GetAllUsers {
  users {
    id
    name
    email
    createdAt
  }
}

# Get posts with authors
query {
  posts {
    id
    title
    author {
      name
      email
    }
  }
}

# Create a new user
mutation {
  createUser(input: {
    name: "Anand J"
    email: "anandj@example.com"
  }) {
    id
    name
    email
  }
}

mutation {
  createUser(input: {
    name: "Test User"
    email: "test@example.com"
  }) {
    id
    name
    email
  }
}

## Note: In case npm run dev does not work, run node scripts/start.js and then run npm run dev.
