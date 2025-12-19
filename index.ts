/// <amd-module name="@chneau/typed-meteor" />
import type z from "zod";

type TypedSubscribeProps<I extends z.ZodType, O extends z.ZodType> = {
	name: string;
	input: I;
	output: O;
	// biome-ignore lint: The collection can hold any type of document.
	collection: Mongo.Collection<any>;
	// biome-ignore lint: The function can either return void or a Mongo.Cursor, which is a common pattern in Meteor publish functions.
	fn: (this: Subscription, input: z.infer<I>) => void | Mongo.Cursor<any>;
};
export const typedSubscribe = <I extends z.ZodType, O extends z.ZodType>(
	props: TypedSubscribeProps<I, O>,
) => {
	if (Meteor.isServer) {
		Meteor.publish(props.name, props.fn);
	}
	return (input: z.infer<I>) => {
		Meteor.subscribe(props.name, props.input.parse(input));
		const data = props.collection.find().map((doc) => props.output.parse(doc));
		return data;
	};
};

type TypedMethodProps<I extends z.ZodType, O extends z.ZodType> = {
	name: string;
	input: I;
	output: O;
	fn: (
		this: ThisParameterType<Parameters<typeof Meteor.methods>[0][string]>,
		input: z.infer<I>,
	) => Promise<z.infer<O>>;
};
export const typedMethod = <I extends z.ZodType, O extends z.ZodType>(
	props: TypedMethodProps<I, O>,
) => {
	if (Meteor.isServer) {
		Meteor.methods({ [props.name]: props.fn });
	}
	return (input: z.infer<I>): Promise<z.infer<O>> =>
		Meteor.callAsync(props.name, props.input.parse(input)).then((res) =>
			props.output.parse(res),
		);
};
