import type { ParameterScore, TideState, TideDirection } from '$lib/types';
import {
	explainSwellDirection,
	explainWindDirection,
	explainSwellHeight,
	explainSwellPeriod,
	explainTideState
} from './explanations';

export function msToBft(ms: number): number {
	return Math.min(12, Math.round(Math.cbrt((ms / 0.836) ** 2)));
}

function ps(value: number, explanation: string): ParameterScore {
	const label =
		value >= 5 ? 'excellent' : value >= 4 ? 'good' : value >= 3 ? 'fair' : 'poor';
	return { value, label, explanation };
}

export function scoreSwellDirection(degrees: number): ParameterScore {
	const d = ((degrees % 360) + 360) % 360;
	let value: number;
	if (d >= 315 && d <= 340) value = 5;
	else if ((d > 270 && d < 315) || (d > 340 && d <= 360)) value = 4;
	else if ((d >= 240 && d <= 270) || (d >= 0 && d <= 30)) value = 3;
	else if (d > 30 && d < 90) value = 2;
	else value = 1;
	const label = value >= 5 ? 'excellent' : value >= 4 ? 'good' : value >= 3 ? 'fair' : 'poor';
	return { value, label, explanation: explainSwellDirection(Math.round(d), label) };
}

export function scoreWindDirection(degrees: number): ParameterScore {
	const d = ((degrees % 360) + 360) % 360;
	let value: number;
	if (d >= 80 && d <= 120) value = 5;
	else if (d >= 45 && d < 80) value = 4;
	else if (d > 120 && d <= 160) value = 3;
	else if (d > 160 && d <= 220) value = 2;
	else value = 1;
	const label = value >= 5 ? 'excellent' : value >= 4 ? 'good' : value >= 3 ? 'fair' : 'poor';
	return { value, label, explanation: explainWindDirection(Math.round(d), 0, label) };
}

export function scoreWindDirectionWithBft(degrees: number, ms: number): ParameterScore {
	const base = scoreWindDirection(degrees);
	const bft = msToBft(ms);
	return {
		...base,
		explanation: explainWindDirection(Math.round(((degrees % 360) + 360) % 360), bft, base.label)
	};
}

export function scoreSwellHeight(hs: number): ParameterScore {
	let value: number;
	if (hs >= 0.6 && hs <= 1.2) value = 5;
	else if (hs > 1.2 && hs <= 1.5) value = 4;
	else if (hs >= 0.4 && hs < 0.6) value = 3;
	else if ((hs >= 0.3 && hs < 0.4) || (hs > 1.5 && hs <= 2.0)) value = 2;
	else value = 1;
	const label = value >= 5 ? 'excellent' : value >= 4 ? 'good' : value >= 3 ? 'fair' : 'poor';
	return { value, label, explanation: explainSwellHeight(hs, label) };
}

export function scoreSwellPeriod(tp: number): ParameterScore {
	let value: number;
	if (tp >= 10) value = 5;
	else if (tp >= 8) value = 4;
	else if (tp >= 6) value = 3;
	else value = 1;
	const label = value >= 5 ? 'excellent' : value >= 4 ? 'good' : value >= 3 ? 'fair' : 'poor';
	return { value, label, explanation: explainSwellPeriod(tp, label) };
}

export function scoreTideState(state: TideState, direction: TideDirection): ParameterScore {
	let value: number;
	if (state === 'mid' && direction === 'flooding') value = 5;
	else if (state === 'mid') value = 4;
	else if (state === 'low' && direction !== 'ebbing') value = 3;
	else if (state === 'low') value = 2;
	else value = 1; // high tide
	const label = value >= 5 ? 'excellent' : value >= 4 ? 'good' : value >= 3 ? 'fair' : 'poor';
	return { value, label, explanation: explainTideState(state, direction, label) };
}
