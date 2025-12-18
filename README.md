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
- ⚛️ **React Ready**: Designed to work seamlessly with `useTracker` in React.
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

### 1. Define your API (Backend/Shared)

Define your collection, schemas, methods, and subscriptions in a shared file (or
server-side file if you prefer, but types must be available to client).

```typescript
import { typedMethod, typedSubscribe } from "@chneau/typed-meteor";
import z from "zod";

const linkSchema = z.object({
	_id: z.string().optional(),
	title: z.string(),
	url: z.url(),
	createdAt: z.date(),
	deletedAt: z.date().nullish(),
});

type Link = z.infer<typeof linkSchema>;

export const LinksCollection = new Mongo.Collection<Link>("links");

export const subscribeLinks = typedSubscribe({
	name: "links",
	input: z.boolean().optional(),
	output: linkSchema.extend({ _id: z.string() }),
	collection: LinksCollection,
	fn: (showDeletedToo) => {
		const query: Mongo.Query<Link> = {};
		if (!showDeletedToo) {
			query.$or = [{ deletedAt: { $exists: false } }, { deletedAt: null }];
		}
		return LinksCollection.find(query);
	},
});

export const methodCreateLink = typedMethod({
	name: "links.insert",
	input: z.object({
		title: z.string(),
		url: z.url(),
	}),
	output: z.string(),
	fn: async ({ title, url }) =>
		await LinksCollection.insertAsync({ title, url, createdAt: new Date() }),
});

export const methodDeleteLink = typedMethod({
	name: "links.delete",
	input: z.string(),
	output: z.number(),
	fn: async (_id) => {
		const current = await LinksCollection.findOneAsync(
			{ _id },
			{ fields: { deletedAt: 1 } },
		);
		if (current?.deletedAt) {
			return await LinksCollection.updateAsync(
				{ _id },
				{ $set: { deletedAt: null } },
			);
		}
		return await LinksCollection.updateAsync(
			{ _id },
			{ $set: { deletedAt: new Date() } },
		);
	},
});

export const createFor1Second = typedMethod({
	name: "links.createFor1Second",
	input: z.void(),
	output: z.void(),
	fn: async () => {
		const _id = await methodCreateLink({
			title: "Temporary Link",
			url: "https://temporary-link.com",
		});
		await new Promise((resolve) => setTimeout(resolve, 1000));
		await methodDeleteLink(_id);
	},
});
```

### 2. Use in Frontend (React)

Use the defined methods and subscriptions in your React components.

```tsx
import { useTracker } from "meteor/react-meteor-data";
import { useState } from "react";
// Import from your API file
import {
	createFor1Second,
	methodCreateLink,
	methodDeleteLink,
	subscribeLinks,
} from "../api/links";

const SmallInfo = ({ children }: { children: React.ReactNode }) =>
	children && (
		<small style={{ color: "gray", fontFamily: "monospace" }}>{children}</small>
	);

export const Info = () => {
	const [showDeletedToo, setShowDeletedToo] = useState(false);
	const links = useTracker(() => subscribeLinks(showDeletedToo));
	const [x, setX] = useState(0);
	return (
		<div>
			<h2>Learn Meteor!</h2>
			<button type="button" onClick={() => setX(x + 1)}>
				Click Me
			</button>
			<p>You've pressed the button {x} times.</p>
			<button type="button" onClick={() => setShowDeletedToo(!showDeletedToo)}>
				{showDeletedToo ? "Showing deleted links" : "Hiding deleted links"}
			</button>
			<h3>Links ({links.length})</h3>
			<ul>
				{links.map((x) => (
					<li key={x._id}>
						<SmallInfo>{x._id}</SmallInfo>
						&nbsp;
						<a href={x.url} target="_blank">
							{x.title}
						</a>
						&nbsp;
						<SmallInfo>({x.url})</SmallInfo>
						&nbsp;
						<SmallInfo>{x.createdAt.toISOString()}</SmallInfo>
						&nbsp;
						<SmallInfo>{x.deletedAt?.toISOString()}</SmallInfo>
						&nbsp;
						<button
							type="button"
							onClick={() => methodCreateLink(x)}
							style={{ fontSize: "0.5em" }}
						>
							Duplicate
						</button>
						&nbsp;
						<button
							type="button"
							onClick={() => methodDeleteLink(x._id)}
							style={{ fontSize: "0.5em" }}
						>
							Delete
						</button>
					</li>
				))}
			</ul>
			<button type="button" onClick={() => createFor1Second()}>
				Create for 1 second
			</button>
		</div>
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

Creates a type-safe Meteor publication helper.

- **options.name**: `string` - Unique name for the publication.
- **options.input**: `ZodSchema` (optional) - Schema for subscription arguments.
- **options.output**: `ZodSchema` (optional) - Schema to validate/transform the
  documents returned by the collection.
- **options.collection**: `Mongo.Collection` - The Mongo Collection instance.
- **options.fn**: `(input) => void | Mongo.Cursor` - The publication function.

**Returns:** A function `(input) => Output[]` that should be called within a
reactive context (like `useTracker`). It handles the subscription and returns
the data from the collection.
