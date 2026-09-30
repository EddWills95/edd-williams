import { writable } from 'svelte/store';

// The moment the day-in-the-life strip is currently showing, shared with the flow diagram above
// it so scrubbing the day replays that moment's flows. null means "live, right now".
// When set: { t: Date, solarW, houseW, gridW, soc, batteryW, solarKwh } where batteryW is
// positive while discharging, and any field can be null when that series isn't published.
export const replay = writable(null);
