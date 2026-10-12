// ─── Scoring ──────────────────────────────────────────────────────────────────

export interface ScoringWeights {
	swellDirection: number; // default 0.30
	windDirection: number;  // default 0.25
	swellHeight: number;    // default 0.20
	swellPeriod: number;    // default 0.15
	tideState: number;      // default 0.10
	// must sum to 1.0
}

export type ScoreLabel = 'excellent' | 'good' | 'fair' | 'poor';

export interface ParameterScore {
	value: number;       // 1–5
	label: ScoreLabel;
	explanation: string; // plain English, e.g. "NNW swell (318°) — ideal angle for Scheveningen"
}

export interface Score {
	composite: number; // 1.0–5.0
	parameters: {
		swellDirection: ParameterScore;
		windDirection: ParameterScore;
		swellHeight: ParameterScore;
		swellPeriod: ParameterScore;
		tideState: ParameterScore;
	};
	cappedByHeight: boolean; // true if composite forced to 1 due to Hs < 0.3m
}

// ─── Forecast ─────────────────────────────────────────────────────────────────

export type TideState = 'low' | 'mid' | 'high';
export type TideDirection = 'flooding' | 'ebbing' | 'slack';
export type Confidence = 'standard' | 'reduced';
export type DataSourceStatus = 'ok' | 'error' | 'stale';

export interface ForecastSlot {
	timestamp: string; // ISO 8601

	// Wave (Open-Meteo Marine)
	swellHeight: number;    // Hs metres
	swellPeriod: number;    // Tp seconds
	swellDirection: number; // degrees (FROM)
	windWaveHeight: number; // metres
	windWavePeriod: number; // seconds

	// Wind (Open-Meteo Weather)
	windSpeed: number;    // m/s at 10m
	windDirection: number; // degrees (FROM)
	windGusts: number;    // m/s

	// Tide (Rijkswaterstaat)
	tideHeight: number;         // cm above NAP
	tideState: TideState;
	tideDirection: TideDirection;

	score: Score;
	confidence: Confidence;
	dataFetchedAt: string; // ISO 8601
}

export type TimeWindow = 'morning' | 'midday' | 'afternoon' | 'evening';

export interface DailySummary {
	date: string;
	meanScore: number;
	confidence: Confidence;
	avgSwellHeight: number; // metres, one decimal
	avgWindSpeed: number;   // Beaufort integer
}

export interface NextBestSession {
	date: string;        // ISO date
	window: TimeWindow;
	startTime: string;   // HH:MM — first slot with score ≥ 3.5
	endTime: string;     // HH:MM — last slot with score ≥ 3.5
	compositeScore: number;
	confidence: Confidence;
	topConditions: [ParameterScore, ParameterScore, ParameterScore];
}

export interface ForecastCache {
	location: 'scheveningen';
	fetchedAt: string; // ISO 8601
	slots: ForecastSlot[];
	nextBestSession: NextBestSession | null;
	dataSourceStatus: {
		wave: DataSourceStatus;
		wind: DataSourceStatus;
		tide: DataSourceStatus;
	};
}

// ─── Expert Message / Parser ──────────────────────────────────────────────────

export interface SpotMention {
	raw: string;
	resolved: string;
	isScheveningen: boolean;
}

export interface TimeWindowExtraction {
	dayReference: string;  // e.g. "vrijdag"
	resolvedDate: string;  // ISO date
	startHour: number | null;
	endHour: number | null;
	rawText: string;
}

export type WaveType = 'swell' | 'wind_waves' | 'unknown';

export interface WaveDescriptor {
	raw: string;
	hsMin: number; // metres
	hsMax: number; // metres
	waveType: WaveType;
}

export interface WindDescriptor {
	raw: string;
	directionDegrees: number | null;
	beaufort: number | null;
	quality: 'offshore' | 'side-offshore' | 'onshore' | 'unknown';
}

export interface TideDescriptor {
	raw: string;
	state: TideState | null;
	direction: TideDirection | null;
}

export type DivergenceLevel = 'agreement' | 'minor' | 'significant' | 'no_model_data';

export interface DivergenceRecord {
	id: string;
	expertMessageId: string;
	resolvedDate: string;
	timeWindow: { start: number; end: number } | null;
	expertClaim: {
		description: string;
		impliedScore: number | null;
	};
	modelPrediction: {
		meanScore: number;
		slotCount: number;
	};
	divergence: DivergenceLevel;
	createdAt: string;
}

export interface ExpertMessage {
	id: string;
	rawText: string;
	ingestedAt: string;
	extractions: {
		spots: SpotMention[];
		timeWindows: TimeWindowExtraction[];
		waveDescriptors: WaveDescriptor[];
		windDescriptors: WindDescriptor[];
		tideDescriptors: TideDescriptor[];
	};
	comparison: DivergenceRecord[];
	previousVersionId: string | null;
}

// ─── Session Logging ──────────────────────────────────────────────────────────

export interface SessionLog {
	id: string;
	date: string;       // ISO date
	startHour: number;  // 0–23
	endHour: number;    // 0–23
	spot: string;
	personalRating: 1 | 2 | 3 | 4 | 5;
	notes: string;
	modelScore: number | null;
	createdAt: string;
}

export interface ModelAccuracy {
	sessionCount: number;
	correlationScore: number; // Pearson r, -1 to 1
	meanAbsoluteError: number;
	computedAt: string;
}
