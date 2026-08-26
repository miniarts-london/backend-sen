const SUPPORT_NEED_IDS = new Set([
  'autism',
  'adhd',
  'dyslexia',
  'dyspraxia',
  'speech_language',
  'sensory',
  'anxiety',
  'learning_disability',
  'physical_motor',
  'hearing',
  'vision',
  'social_emotional',
  'other',
]);

const FREQUENCIES = new Set(['daily', 'three_times_week', 'weekly', 'fortnightly']);
const STATUSES = new Set(['active', 'completed', 'replaced']);

export function validateSuggestionRequest(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Request body must be a JSON object.' };
  }

  const childName = typeof body.childName === 'string' ? body.childName.trim() : '';
  if (!childName) {
    return { error: 'childName is required.' };
  }

  const childAge = Number(body.childAge);
  if (!Number.isInteger(childAge) || childAge < 3 || childAge > 18) {
    return { error: 'childAge must be a whole number between 3 and 18.' };
  }

  if (!Array.isArray(body.supportNeeds) || body.supportNeeds.length === 0) {
    return { error: 'supportNeeds must be a non-empty array.' };
  }

  const supportNeeds = body.supportNeeds.filter((item) => typeof item === 'string');
  if (supportNeeds.some((item) => !SUPPORT_NEED_IDS.has(item))) {
    return { error: 'supportNeeds contains an unknown value.' };
  }

  const otherSupportNeed =
    typeof body.otherSupportNeed === 'string' && body.otherSupportNeed.trim()
      ? body.otherSupportNeed.trim()
      : undefined;

  if (supportNeeds.includes('other') && !otherSupportNeed) {
    return { error: 'otherSupportNeed is required when "other" is selected.' };
  }

  if (typeof body.frequency !== 'string' || !FREQUENCIES.has(body.frequency)) {
    return { error: 'frequency must be daily, three_times_week, weekly, or fortnightly.' };
  }

  const pastExercises = Array.isArray(body.pastExercises)
    ? body.pastExercises.slice(0, 12).map((item) => ({
        title: typeof item?.title === 'string' ? item.title : 'Untitled',
        suggestedAt: typeof item?.suggestedAt === 'string' ? item.suggestedAt : '',
        status: STATUSES.has(item?.status) ? item.status : 'completed',
        updateSummaries: Array.isArray(item?.updateSummaries)
          ? item.updateSummaries.filter((line) => typeof line === 'string').slice(0, 6)
          : [],
      }))
    : [];

  return {
    context: {
      childName,
      childAge,
      supportNeeds,
      otherSupportNeed,
      frequency: body.frequency,
      pastExercises,
    },
  };
}
