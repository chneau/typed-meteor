# @chneau/typed-meteor

Type-safe wrappers for Meteor methods and subscriptions using Zod schemas.
Define your methods and publications once, and enjoy full type safety across
client and server.

- **GitHub Repository**: https://github.com/chneau/typed-meteor
- **NPM Package**: https://www.npmjs.com/package/@chneau/typed-meteor

## Features

- 🛡️ **End-to-end Type Safety**: Uses Zod schemas to validate inputs and outputs
  for both methods and publications.
- 🤝 **Isomorphic Definitions**: Define your logic in one place. The library
  handles server-side registration and client-side consumption.
- ⚛️ **React Ready**: `typedSubscribe` returns a hook ready to be used in your
  React components via `useTracker`.
- ⚡ **Lightweight**: Minimal overhead wrapper around standard Meteor APIs.

## Installation

```bash
npm install @chneau/typed-meteor zod
# or
bun add @chneau/typed-meteor zod
# or
yarn add @chneau/typed-meteor zod
```

## Usage

### Typed Methods

Define a method with input and output validation.

```typescript
import { typedMethod } from "@chneau/typed-meteor";
import { z } from "zod";

// Define the method (shared code or server-side)
export const addNumbers = typedMethod({
  name: "math.add",
  input: z.object({
    a: z.number(),
    b: z.number(),
  }),
  output: z.number(),
  async fn({ a, b }) {
    // This runs on the server
    return a + b;
  },
});

// Use it on the client
// The input is type-checked against the Zod schema
// The result is type-checked as a number
const result = await addNumbers({ a: 5, b: 10 });
console.log(result); // 15
```

### Typed Subscriptions

Define a publication and consume it as a React hook.

```typescript
import { typedSubscribe } from "@chneau/typed-meteor";
import { z } from "zod";
import { TasksCollection } from "/imports/api/tasks"; // Your Mongo Collection

// Define the subscription
export const useTasks = typedSubscribe({
  name: "tasks.list",
  input: z.object({
    completed: z.boolean().optional(),
  }),
  // Validates documents coming from the collection
  output: z.object({
    _id: z.string(),
    text: z.string(),
    completed: z.boolean(),
  }),
  collection: TasksCollection,
  fn(input) {
    // This runs on the server (Publisher)
    // 'input' is fully typed based on the Zod schema
    const query =
      input.completed !== undefined ? { completed: input.completed } : {};
    return TasksCollection.find(query);
  },
});

// Use it in a React component
const TaskList = () => {
  // Automatically subscribes and fetches data
  // 'tasks' is typed as an array of the output Zod schema
  const tasks = useTasks({ completed: false });

  return (
    <ul>
      {tasks.map((task) => (
        <li key={task._id}>{task.text}</li>
      ))}
    </ul>
  );
};
```

## API

### `typedMethod<Input, Output>(options)`

Creates a type-safe Meteor method.

- **options.name**: `string` - Unique name for the method.
- **options.input**: `ZodSchema` (optional) - Schema for argument validation.
- **options.output**: `ZodSchema` (optional) - Schema for return value
  validation.
- **options.fn**: `(input) => Promise<Output>` - The function implementation.

**Returns:** An async function `(input) => Promise<Output>` that can be called
from the client.

### `typedSubscribe<Input, Output>(options)`

Creates a type-safe Meteor publication and a corresponding React hook.

- **options.name**: `string` - Unique name for the publication.
- **options.input**: `ZodSchema` (optional) - Schema for subscription arguments.
- **options.output**: `ZodSchema` (optional) - Schema to validate/transform the
  documents returned by the collection.
- **options.collection**: `Mongo.Collection` - The Mongo Collection instance.
- **options.fn**: `(input) => void | Mongo.Cursor` - The publication function.

**Returns:** A React hook `(input, deps?) => Output[]` that manages the
subscription and returns the data.
