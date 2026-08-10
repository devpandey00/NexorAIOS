import { Lead } from '../types/lead.js';

const GOOGLE_PLACES_URL = 'https://places.googleapis.com/v1/places:searchText';

interface GooglePlace {
  id?: string;
  displayName?: {
    text?: string;
  };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  businessStatus?: string;
}

interface GooglePlacesResponse {
  places?: GooglePlace[];
}

export async function googleSearch(query: string): Promise<Lead[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    throw new Error('GOOGLE_PLACES_API_KEY is not configured');
  }

  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return [];
  }

  const response = await fetch(GOOGLE_PLACES_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask':
        'places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.businessStatus',
    },
    body: JSON.stringify({
      textQuery: normalizedQuery,
      pageSize: 20,
    }),
    cache: 'no-store',
  });

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(`Google Places API failed (${response.status}): ${responseText}`);
  }

  let data: GooglePlacesResponse;

  try {
    data = JSON.parse(responseText) as GooglePlacesResponse;
  } catch {
    throw new Error('Google Places API returned invalid JSON.');
  }

  const places = data.places ?? [];

  return places
    .filter((place) => {
      const name = place.displayName?.text?.trim();

      return Boolean(name && place.businessStatus !== 'CLOSED_PERMANENTLY');
    })
    .map((place) => ({
      name: place.displayName!.text!.trim(),
      website: place.websiteUri ?? '',
      phone: place.internationalPhoneNumber ?? place.nationalPhoneNumber,
      address: place.formattedAddress,
    }))
    .filter((lead) => lead.name.length > 0);
}
