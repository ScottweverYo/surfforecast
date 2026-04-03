// Sunrise/sunset calculator for Scheveningen (52.1033°N, 4.2700°E)
// Algorithm: NOAA / Ed Williams aviation formulary
// Returns UTC decimal hours (e.g. 6.5 = 06:30 UTC)

const LAT = 52.1033;
const LNG = 4.2700;

const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

function calcSolarTime(dateUTC: Date, rising: boolean): number {
	const startOfYear = Date.UTC(dateUTC.getUTCFullYear(), 0, 0);
	const N = Math.floor((dateUTC.getTime() - startOfYear) / 86_400_000);

	const lngHour = LNG / 15;
	const t = N + ((rising ? 6 : 18) - lngHour) / 24;

	const M = 0.9856 * t - 3.289;
	const L = ((M + 1.916 * Math.sin(toRad(M)) + 0.02 * Math.sin(toRad(2 * M)) + 282.634) % 360 + 360) % 360;

	let RA = toDeg(Math.atan(0.91764 * Math.tan(toRad(L))));
	RA = ((RA % 360) + 360) % 360;
	RA += Math.floor(L / 90) * 90 - Math.floor(RA / 90) * 90;
	RA /= 15;

	const sinDec = 0.39782 * Math.sin(toRad(L));
	const cosDec = Math.cos(Math.asin(sinDec));

	const ZENITH = 90.833; // official sunrise/sunset (accounts for refraction + solar disc)
	const cosH = (Math.cos(toRad(ZENITH)) - sinDec * Math.sin(toRad(LAT))) / (cosDec * Math.cos(toRad(LAT)));

	if (cosH > 1) return 0;   // polar night — sun never rises
	if (cosH < -1) return 24; // midnight sun — sun never sets

	const H = (rising ? 360 - toDeg(Math.acos(cosH)) : toDeg(Math.acos(cosH))) / 15;
	const T = H + RA - 0.06571 * t - 6.622;
	return ((T - lngHour) % 24 + 24) % 24;
}

export interface SolarWindow {
	riseUTC: number; // decimal hours
	setUTC: number;  // decimal hours
}

/**
 * Returns sunrise and sunset in UTC decimal hours for the given UTC date.
 * Includes a 30-minute grace buffer so slots near twilight are kept.
 */
export function getSolarWindow(dateUTC: Date, bufferMinutes = 30): SolarWindow {
	const buf = bufferMinutes / 60;
	return {
		riseUTC: Math.max(0, calcSolarTime(dateUTC, true) - buf),
		setUTC: Math.min(24, calcSolarTime(dateUTC, false) + buf)
	};
}

/**
 * Returns true if the given UTC timestamp falls within daylight hours
 * (including the grace buffer) for Scheveningen.
 */
export function isDaylight(timestampISO: string, bufferMinutes = 30): boolean {
	const d = new Date(timestampISO);
	const { riseUTC, setUTC } = getSolarWindow(d, bufferMinutes);
	const h = d.getUTCHours() + d.getUTCMinutes() / 60;
	return h >= riseUTC && h <= setUTC;
}
