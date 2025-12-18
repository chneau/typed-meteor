/// <amd-module name="@chneau/typed-meteor" />
import { Meteor, type Subscription } from "meteor/meteor";
import type { Mongo } from "meteor/mongo";
import { useTracker } from "meteor/react-meteor-data";
import type { DependencyList } from "react";
import type z from "zod";

type TypedSubscribeProps<T extends z.ZodType, U extends z.ZodType> = {
	name: string;
	input?: T;
	output?: U;
	// biome-ignore lint: The collection can hold any type of document.
	collection: Mongo.Collection<any>;
	// biome-ignore lint: The function can either return void or a Mongo.Cursor, which is a common pattern in Meteor publish functions.
	fn: (this: Subscription, input: z.infer<T>) => void | Mongo.Cursor<any>;
};
export const typedSubscribe = <T extends z.ZodType, U extends z.ZodType>(
	props: TypedSubscribeProps<T, U>,
) => {
	if (Meteor.isServer) {
		Meteor.publish(props.name, props.fn);
	}
	return (input: z.infer<T>, deps?: DependencyList) =>
		useTracker(() => {
			Meteor.subscribe(props.name, props.input?.parse(input));
			const data = props.collection
				.find()
				.map((x) => props.output?.parse(x) ?? x);
			return data;
		}, deps);
};

type TypedMethodProps<T extends z.ZodType, U extends z.ZodType> = {
	name: string;
	input?: T;
	output?: U;
	fn: (
		this: ThisParameterType<Parameters<typeof Meteor.methods>[0][string]>,
		input: z.infer<T>,
	) => Promise<z.infer<U>>;
};
export const typedMethod = <T extends z.ZodType, U extends z.ZodType>(
	props: TypedMethodProps<T, U>,
) => {
	if (Meteor.isServer) {
		Meteor.methods({ [props.name]: props.fn });
	}
	return (x: z.infer<T>): Promise<z.infer<U>> =>
		Meteor.callAsync(props.name, props.input?.parse(x)).then(
			(x) => props.output?.parse(x) ?? x,
		);
};
