import * as amplitude from '@amplitude/analytics-node';
import dotenv from 'dotenv';
dotenv.config();

let isInitialized = false;

export function initAmplitude() {
    const apiKey = process.env.AMPLITUDE_API_KEY;
    if (!apiKey || apiKey === 'placeholder_замени_после_создания_проекта' || apiKey === 'your_amplitude_api_key_here') {
        console.warn('⚠️ [Amplitude] API Key missing or placeholder. Running in dry mode.');
        return;
    }
    
    try {
        amplitude.init(apiKey, {
            logLevel: amplitude.Types.LogLevel.Warn,
        });
        isInitialized = true;
        console.log('✅ [Amplitude] Initialized');
    } catch (error) {
        console.error('❌ [Amplitude] Initialization error:', error.message);
    }
}

// Ensure it initializes
initAmplitude();

export async function setUserProperties(userId, userProperties) {
    if (!userId) return;
    
    try {
        if (isInitialized) {
            const identifyObj = new amplitude.Identify();
            for (const [key, value] of Object.entries(userProperties)) {
                if (value !== undefined && value !== null) {
                    identifyObj.set(key, value);
                }
            }
            amplitude.identify(identifyObj, { user_id: String(userId) });
        }
        // console.log(`📊 [Amplitude] User properties updated for: ${userId}`);
    } catch (error) {
        console.error('❌ [Amplitude] Error setting user properties:', error.message);
    }
}

export async function trackEvent(userId, eventName, eventProperties = {}) {
    if (!userId) return;
    
    try {
        const payload = {
            event_type: eventName,
            user_id: String(userId),
            event_properties: {
                ...eventProperties,
                timestamp: Date.now()
            }
        };
        
        if (isInitialized) {
            amplitude.track(payload);
        }
        console.log(`📊 [Amplitude] Event sent: ${eventName}`);
    } catch (error) {
        console.error(`❌ [Amplitude] Error tracking event ${eventName}:`, error.message);
    }
}
