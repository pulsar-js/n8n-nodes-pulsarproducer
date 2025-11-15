import {
	Icon,
	ICredentialType,
	INodeProperties,
	ICredentialTestRequest,
	IHttpRequestOptions,
} from 'n8n-workflow';

// @ts-ignore
const { test } = require('@pulsar-js/producer');

export class PulsarProducerApi implements ICredentialType {
	name = 'pulsarProducerApi';
	displayName = 'Apache Pulsar Producer'; // eslint-disable-line n8n-nodes-base/cred-class-field-display-name-missing-api
	documentationUrl = 'https://github.com/pulsar-js/n8n-nodes-pulsarproducer#credentials';
	icon: Icon = { light: 'file:pulsar.svg', dark: 'file:pulsar-white.svg' };

	properties: INodeProperties[] = [
		{
			displayName: 'Connection String',
			name: 'pulsarServer',
			type: 'string',
			default: '',
			required: true,
			placeholder: 'pulsar://localhost:6650',
			description: 'Pulsar server connection string.',
			hint: 'specify `pulsar+ssl://domain:6651` for TLS connection.'
		},
		{
			displayName: 'Authentication Type',
			name: 'authType',
			type: 'options',
			default: 'none',
			options: [
				{ name: 'None', value: 'none' },
				{ name: 'Basic', value: 'basic' },
				{ name: 'OpenID Connect (OIDC)', value: 'oidc' },
				{ name: 'OAuth 2.0', value: 'oauth' },
				{ name: 'mTLS', value: 'mtls' },
				{ name: 'Athenz', value: 'athenz' }
			],
		},
		// basic
		{
			displayName: 'Username',
			name: 'username',
			type: 'string',
			default: '',
			displayOptions: {
				show: { authType: ['basic'] },
			},
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			displayOptions: {
				show: { authType: ['basic'] },
			},
		},
		// OIDC
		{
			displayName: 'JWT Token',
			name: 'jwtToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			displayOptions: {
				show: { authType: ['oidc'] },
			}
		},
		{
			displayName: 'Require JWT Verification',
			name: 'requireJwtVerification',
			type: 'boolean',
			default: true,
			displayOptions: {
				show: { authType: ['oidc'] },
			},
		},
		// mTLS
		{
			displayName: 'Client Certificate',
			name: 'clientCertificate',
			type: 'string',
			default: '',
			displayOptions: {
				show: { authType: ['mtls'] },
			},
			description: 'PEM formatted client certificate for mTLS authentication.',
			required: true,
			hint: 'Absolute filepath'
		},
		{
			displayName: 'Client Key',
			name: 'clientKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			displayOptions: {
				show: { authType: ['mtls'] },
			},
			description: 'PEM formatted client key for mTLS authentication.',
			required: true,
			hint: 'Absolute filepath'
		},
		{
			displayName: 'CA Certificate',
			name: 'caCertificate',
			type: 'string',
			default: '',
			displayOptions: {
				show: { authType: ['mtls'] },
			},
			description: 'PEM formatted CA certificate for mTLS authentication.',
			hint: 'Absolute filepath'
		},
		// Oauth 2.0
		{
			displayName: 'Issuer URL',
			name: 'issuerUrl',
			type: 'string',
			default: '',
			required: true,
			displayOptions: {
				show: { authType: ['oauth'] },
			},
			description: 'The OAuth2 issuer URL.',
		},
		{
			displayName: 'Audience',
			name: 'audience',
			type: 'string',
			default: '',
			required: true,
			displayOptions: {
				show: { authType: ['oauth'] },
			},
			description: 'The OAuth2 audience.',
		},
		{
			displayName: 'Client ID',
			name: 'clientId',
			type: 'string',
			default: '',
			required: true,
			displayOptions: {
				show: { authType: ['oauth'] },
			},
			description: 'The OAuth2 client ID.',
		},
		{
			displayName: 'Client Secret',
			name: 'privateKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			displayOptions: {
				show: { authType: ['oauth'] },
			},
			description: 'The OAuth2 client secret.',
		},
		// Athenz
		{
			displayName: 'Athenz Domain',
			name: 'athenzDomain',
			type: 'string',
			default: '',
			required: true,
			displayOptions: {
				show: { authType: ['athenz'] },
			},
			description: 'The Athenz domain.',
		},
		{
			displayName: 'Service Name',
			name: 'serviceName',
			type: 'string',
			default: '',
			required: true,
			displayOptions: {
				show: { authType: ['athenz'] },
			},
			description: 'The Athenz service name.',
		},
		{
			displayName: 'Private Key',
			name: 'athenzPrivateKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			displayOptions: {
				show: { authType: ['athenz'] },
			},
			description: 'The PEM formatted private key for the Athenz service.',
		},
		{
			displayName: 'ZTS URL',
			name: 'ztsUrl',
			type: 'string',
			default: '',
			required: true,
			displayOptions: {
				show: { authType: ['athenz'] },
			},
			description: 'The Athenz ZTS URL.',
		},
		// {
		// 	displayName:
		// 		'<b><u>The setting below is ignored!</u></b><br/><br/>Unfortunately, n8n does not support custom credential tests for non-HTTP based connections. This credential mocks an HTTP request in order to run a custom authentication check to the Pulsar server (using the Pulsar binary protocol, not HTTP). n8n adds the "Allowed HTTP Request Domains" to all credentials it thinks are HTTP credentials, resulting in the unused form field below.',
		// 	name: 'credNote',
		// 	type: 'notice',
		// 	default: '',
		// },
		// These hidden fields are required to mock the HTTP credential type
		{
			displayName: 'Base URL (ignored)',
			name: 'baseURL',
			type: 'string',
			default: 'http://localhost', // anything valid
			displayOptions: {
				show: { authType: ['na'] },
			},
		},
		{
			displayName: 'Allowed HTTP Request Domains',
			name: 'allowedHttpRequestDomains',
			type: 'options',
			default: 'all',                // this is the important part
			options: [
				{ name: 'All', value: 'all' },
				{ name: 'Specific Domains', value: 'domains' },
				{ name: 'None', value: 'none' },
			],
			displayOptions: {
				show: { authType: ['na'] },
			},
			// No description needed — it will never be seen
		},
		{
			displayName: 'Allowed Domains',
			name: 'allowedDomains',
			type: 'string',
			default: '',
			displayOptions: {
				show: { authType: ['na'] },
			},
		},
	];

	// credentialTest = {
	// 	function: async function (): Promise<boolean> {
	// 		throw new Error('like chump, heyy!')
	// 		return true;
	// 	},
	// };

	// Use the function form of `authenticate` (IAuthenticate) so n8n will call it with credentials and requestOptions
	authenticate = async (
		credentials: any,
		requestOptions?: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> => {
		const connectionString = credentials?.pulsarServer as string;
		const authentication = {} as any;

		if (credentials?.authType !== 'none') {
			authentication.type = credentials?.authType;

			if (credentials?.authType === 'basic') {
				authentication.username = credentials?.username;
				authentication.password = credentials?.password;
			} else if (credentials?.authType === 'oidc') {
				authentication.token = credentials?.jwtToken;
				authentication.allowUnverified = !credentials?.requireJwtVerification;
			} else if (credentials?.authType === 'mtls') {
				authentication.certPath = credentials?.clientCertificate;
				authentication.keyPath = credentials?.clientKey;
				authentication.caCert = credentials?.caCertificate;
			} else if (credentials?.authType === 'oauth') {
				authentication.issuer = credentials?.issuerUrl;
				authentication.audience = credentials?.audience;
				authentication.clientId = credentials?.clientId;
				authentication.privateKey = credentials?.privateKey;
			} else if (credentials?.authType === 'athenz') {
				authentication.domain = credentials?.athenzDomain;
				authentication.service = credentials?.serviceName;
				authentication.privateKey = credentials?.athenzPrivateKey;
				authentication.url = credentials?.ztsUrl;
				authentication.caCert = credentials?.athenzCaCert;
			}
		}

		const accessible: boolean = await test(connectionString, { authentication }).catch(console.error);
		if (!accessible) {
			throw new Error(`cannot reach Pulsar server at ${credentials?.pulsarServer}`);
		}

		requestOptions = requestOptions ?? ({ headers: {} } as IHttpRequestOptions);
		requestOptions.baseURL = 'http://example.com';
		requestOptions.headers = requestOptions.headers ?? {};

		return requestOptions;
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseURL}}',
			url: '/health', // always 404 (intentional)
			ignoreHttpStatusErrors: true, // prevents n8n from marking the whole test as failed
		},
	};

}