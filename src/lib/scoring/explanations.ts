export function explainSwellDirection(degrees: number, label: string): string {
	if (label === 'excellent') return `NW–NNW swell (${degrees}°) — ideal angle for Scheveningen`;
	if (label === 'good') return `W–NW swell (${degrees}°) — workable angle`;
	if (label === 'fair') return `Marginal swell angle (${degrees}°) — reduced quality`;
	return `Unfavourable swell angle (${degrees}°) — wrong direction`;
}

export function explainWindDirection(degrees: number, bft: number, label: string): string {
	if (label === 'excellent') return `E offshore (${degrees}°, ${bft} Bft) — ideal glass conditions`;
	if (label === 'good') return `NE side-offshore (${degrees}°, ${bft} Bft) — good conditions`;
	if (label === 'fair') return `SE light onshore (${degrees}°, ${bft} Bft) — acceptable`;
	if (label === 'poor' && degrees >= 160 && degrees <= 220)
		return `S onshore (${degrees}°, ${bft} Bft) — messy surface`;
	return `Onshore (${degrees}°, ${bft} Bft) — ruins wave quality`;
}

export function explainSwellHeight(hs: number, label: string): string {
	if (hs < 0.3) return `${hs.toFixed(1)}m — flat, not surfable`;
	if (label === 'excellent') return `${hs.toFixed(1)}m — solid surfable height for Scheveningen`;
	if (label === 'good') return `${hs.toFixed(1)}m — decent, on the upper/lower range`;
	if (label === 'fair') return `${hs.toFixed(1)}m — marginal height`;
	if (hs > 2) return `${hs.toFixed(1)}m — too big, likely closeouts`;
	return `${hs.toFixed(1)}m — barely surfable`;
}

export function explainSwellPeriod(tp: number, label: string): string {
	if (label === 'excellent') return `${tp}s period — quality groundswell`;
	if (label === 'good') return `${tp}s period — decent swell energy`;
	if (label === 'fair') return `${tp}s period — short, weak swell`;
	return `${tp}s period — choppy wind swell only`;
}

export function explainTideState(state: string, direction: string, label: string): string {
	if (state === 'mid' && direction === 'flooding') return 'Mid tide, rising — best window for Scheveningen pier';
	if (state === 'mid') return 'Mid tide — good conditions near the pier';
	if (state === 'low' && direction === 'flooding') return 'Low tide, rising — banks exposed, improving';
	if (state === 'low') return 'Low tide — banks exposed, choppy near shore';
	return 'High tide — likely closeouts at Scheveningen pier';
}
