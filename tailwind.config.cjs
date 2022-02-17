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
			boxShadow: {
				'deep-inner':
					'rgba(50, 50, 93, 0.25) 0px 30px 60px -12px inset, rgba(0, 0, 0, 0.3) 0px 18px 36px -18px inset'
			},
			keyframes: {
				scroll: {
					'0%': {
						transform: 'translateY(0px)'
					},
					'20%': {
						transform: 'translateY(0px)'
					},
					// Make change
					'35%': {
						transform: 'translateY(-36px)'
					},
					'60%': {
						transform: 'translateY(-36px)'
					},
					// make Change
					'75%': {
						transform: 'translateY(-71px)'
					},
					'100%': {
						transform: 'translateY(-71px)'
					}
				}
			},
			animation: {
				/* @keyframes duration | easing-function | delay | iteration-count | direction | fill-mode | play-state | name */
				// animation: 3s ease-in 1s 2 reverse both paused slidein;

				'translate-scroll': 'scroll 6s ease-in 0s infinite alternate'
			},
			backgroundImage: {
				'source-code': "url('./code.png')"
			}
		}
	},

	plugins: []
};

module.exports = config;
