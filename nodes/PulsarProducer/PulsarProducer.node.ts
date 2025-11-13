import {
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IExecuteFunctions,
	NodeOperationError,
} from 'n8n-workflow';

const { publish } = require('@pulsar-js/producer');

export class PulsarProducer implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Apache Pulsar',
		name: 'pulsarProducer',
		icon: { light: 'file:pulsar.svg', dark: 'file:pulsar-white.svg' },
		group: ['input'],
		version: 1,
		description: 'Publish messages to Apache Pulsar',
		defaults: {
			name: 'Apache Pulsar Publisherz',
		},
		inputs: ['main'],
		outputs: ['main'],
		// usableAsTool: true,
		credentials: [
			{
				name: 'pulsarProducerApi',
				required: true,
				// This links the node to a test function on the credential itself.
				// This is only necessary for custom credential types.
			},
		],
		properties: [
			{
				displayName: "Topic",
				name: "topic",
				type: "string",
				default: '',
				placeholder: "persistent://public/default/test",
				required: true,
				description: "Topic to publish to",
			},
			{
				displayName: 'Message',
				name: "message",
				type: 'string',
				default: '',
				required: true,
				description: 'Message to publish (string)',
			},
			{
				displayName: "Message Options",
				name: "message_options",
				type: "collection",
				placeholder: "Add Message Option",
				default: {},
				options: [
					{
						displayName: "Deliver At",
						name: "deliverAt",
						type: "dateTime",
						default: "",
						description: 'Deliver at the exact time specified',
					},
					{
						displayName: 'Delivery Delay (Milliseconds)',
						name: "deliverAfter",
						type: "number",
						default: 0,
						description: "Delay message delivery by specified milliseconds",
					},
					{
						displayName: "Event Time",
						name: "eventTime",
						type: "dateTime",
						default: "",
						description: 'Event time of the message',
					},
					{
						displayName: "Message Key",
						name: "key",
						type: "string",
						default: "",
					},
					{
						displayName: "Ordering Key",
						name: "orderingKey",
						type: "string",
						default: "",
						description: 'Ordering key for KeyShared subscriptions',
					},
					{
						displayName: "Properties",
						name: "properties",
						type: "fixedCollection",
						typeOptions: {
							multipleValues: true,
						},
						placeholder: "Add Property",
						default: {},
						options: [
							{
								name: "property",
								displayName: "Property",
								values: [
									{
										displayName: "Key",
										name: "key",
										type: "string",
										default: "",
										required: true,
									},
									{
										displayName: "Value",
										name: "value",
										type: "string",
										default: "",
										required: true,
									},
								],
							},
						],
					},
					{
						displayName: "Replication Clusters",
						name: "replicationClusters",
						type: "fixedCollection",
						placeholder: "Add Cluster",
						default: {
							items: [],
						},
						typeOptions: {
							multipleValues: true,
						},
						description: 'List of clusters where the message should be replicated',
						options: [
							{
								name: "items",
								displayName: "Cluster",
								values: [{
									displayName: "Cluster Name",
									name: "clusterName",
									type: "string",
									default: "",
									required: true,
								}],
							},
						],
					},
					{
						displayName: "Sequence ID",
						name: "sequenceId",
						type: "string",
						default: "",
						description: 'Explicit sequence identifier',
					},
				],
			},
			{
				displayName: "Producer Options",
				name: "producer_options",
				type: "collection",
				placeholder: "Add Producer Option",
				default: {},
				options: [
					{
						displayName: "Producer Name",
						name: "name",
						type: "string",
						default: "n8n",
						description: "Name of the Producer to publish to",
					},
					{
						displayName: "Timeout (Seconds)",
						name: "timeout",
						type: "number",
						default: 30,
						description: "Timeout in seconds for sending messages (default = 30 seconds)",
					},
					{
						displayName: "Producer Properties",
						name: "properties",
						type: "fixedCollection",
						typeOptions: {
							multipleValues: true,
						},
						placeholder: "Add Property",
						default: {},
						options: [
							{
								name: "property",
								displayName: "Property",
								values: [
									{
										displayName: "Key",
										name: "key",
										type: "string",
										default: "",
										required: true,
									},
									{
										displayName: "Value",
										name: "value",
										type: "string",
										default: "",
										required: true,
									},
								],
							},
						],
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const returnData: INodeExecutionData[] = [];
		const authorization = await this.getCredentials('pulsarProducerApi') as any;
		const topic = await this.getNodeParameter('topic', 0, '') as string;
		const connection_string = `${authorization.pulsarServer}/${topic.replace(/\:\/+/, '/')}`;

		authorization.type = authorization.authType;
		delete authorization.authType;
		delete authorization.pulsarServer

		if (authorization.type === 'oidc') {
			authorization.token = authorization.jwtToken;
			delete authorization.jwtToken;

			if (authorization.hasOwnProperty('requireJwtVerification')) {
				authorization.allowUnverified = !authorization.requireJwtVerification;
				delete authorization.requireJwtVerification;
			}
		}

		const messageOptions = this.getNodeParameter('message_options', 0, {}) as any;
		const messageProps = {} as any;
		for (const { key, value } of messageOptions?.properties?.property ?? []) {
			messageProps[key] = value;
		}
		delete messageOptions.properties;

		const producerOptions = this.getNodeParameter('producer_options', 0, {}) as any;
		const producerProps = {} as any;
		for (const { key, value } of producerOptions?.properties?.property ?? []) {
			producerProps[key] = value;
		}
		delete producerOptions.properties;

		if (Object.keys(messageProps).length > 0) {
			messageOptions.properties = messageProps;
		}
		if (Object.keys(producerProps).length > 0) {
			producerOptions["producer-properties"] = producerProps;
		}

		const options = Object.assign(messageOptions, producerOptions) as any;
		if (authorization && Object.keys(authorization).length > 0 && authorization.type !== 'none') {
			options.authorization = authorization;
		}

		const message = this.getNodeParameter('message', 0, '') as string;
		console.log(connection_string, message, options);
		const messageId: string = await publish(connection_string, message, options).catch((e: Error) => {
			throw new NodeOperationError(this.getNode(), `failed to publish message: ${e.message}`);
		});

		// console.log({ message, messageId, connection_string, authorization, options, producerProps });

		returnData.push({ json: { messageId } });

		return [returnData];
	}
}
