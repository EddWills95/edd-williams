const config = {
	content: ['./src/**/*.{html,js,svelte,ts}'],

	theme: {
		extend: {
			colors: {
				'bdazzled-blue': {
					DEFAULT: '#3D5A80',
					50: '#A2B7D3',
					100: '#94ACCC',
					200: '#7897BF',
					300: '#5D82B2',
					400: '#4A6D9C',
					500: '#3D5A80',
					600: '#2B3F5A',
					700: '#192534',
					800: '#070A0E',
					900: '#000000'
				},
				'burnt-sienna': {
					DEFAULT: '#EE6C4D',
					50: '#FEF6F5',
					100: '#FCE7E2',
					200: '#F9C8BD',
					300: '#F5AA97',
					400: '#F28B72',
					500: '#EE6C4D',
					600: '#E9421A',
					700: '#B93212',
					800: '#86240D',
					900: '#531608'
				},
				'pale-cerulean': '#98c1d9ff',
				'light-cyan': '#e0fbfcff',
				gunmetal: '#293241ff'
			},
			backgroundImage: {
				'source-code': "url('code.png')"
			}
		}
	},

	plugins: []
};

module.exports = config;
