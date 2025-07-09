markdown# GraphQL API with Node.js

A GraphQL API built with Node.js, Express.js, and GraphQL Yoga that serves data from a static JSON file.

## Features

- GraphQL queries and mutations
- Static JSON data storage
- Express.js server integration
- Jest unit testing (>80% coverage)
- Environment variable configuration

## Tech Stack

- **Backend**: Node.js with Express.js
- **GraphQL Server**: GraphQL Yoga
- **Database**: Static JSON file
- **Testing**: Jest
- **Package Manager**: npm

## Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm

### Installation

1. Clone the repository:
```bash
git clone https://github.com/YOUR_USERNAME/graphql-api-project.git
cd graphql-api-project

Install dependencies:

bashnpm install

Create environment file:

bashcp .env.example .env

Start the development server:

bashnpm run dev

Open GraphQL Playground at http://localhost:4000

Available Scripts

npm start - Start production server
npm run dev - Start development server with nodemon
npm test - Run tests
npm run test:coverage - Run tests with coverage report
npm run lint - Run ESLint
npm run lint:fix - Fix ESLint issues

API Documentation
Queries
Get all users
graphqlquery {
  users {
    id
    name
    email
    posts {
      id
      title
    }
  }
}
Get user by ID
graphqlquery {
  user(id: "1") {
    id
    name
    email
    posts {
      id
      title
      content
    }
  }
}
Mutations
Create user
graphqlmutation {
  createUser(input: {
    name: "John Doe"
    email: "john@example.com"
  }) {
    id
    name
    email
  }
}
Update user
graphqlmutation {
  updateUser(id: "1", input: {
    name: "Updated Name"
  }) {
    id
    name
    email
  }
}
Project Structure
src/
├── data/
│   └── data.json          # Static JSON data
├── resolvers/
│   ├── index.js           # Combined resolvers
│   ├── queryResolvers.js  # Query resolvers
│   └── mutationResolvers.js # Mutation resolvers
├── schema/
│   └── typeDefs.js        # GraphQL schema
├── utils/
│   └── dataManager.js     # Data access layer
└── server.js              # Express server setup
tests/
├── unit/                  # Unit tests
└── integration/           # Integration tests
Testing
Run tests with coverage:
bashnpm run test:coverage
The project maintains >80% test coverage as required.
Environment Variables
Create a .env file based on .env.example:
envPORT=4000
NODE_ENV=development
DATA_FILE_PATH=./src/data/data.json
Contributing

Fork the repository
Create your feature branch (git checkout -b feature/amazing-feature)
Commit your changes (git commit -m 'Add some amazing feature')
Push to the branch (git push origin feature/amazing-feature)
Open a Pull Request

License
This project is licensed under the MIT License - see the LICENSE file for details.

#### Create `.env.example` file
```env
# Server Configuration
PORT=4000
NODE_ENV=development

# Data Configuration
DATA_FILE_PATH=./src/data/data.json

# Add other environment variables here