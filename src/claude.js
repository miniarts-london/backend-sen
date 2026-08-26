import Anthropic from '@anthropic-ai/sdk';

const exerciseTool = {
  name: 'suggest_exercise',
  description:
    'Return one short, practical home practice for a child with special educational needs.',
  input_schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      title: { type: 'string', description: 'Short name, a few words.' },
      description: {
        type: 'string',
        description: 'Two or three sentences for the parent or carer, in plain UK English.',
      },
      steps: {
        type: 'array',
        minItems: 3,
        maxItems: 6,
        items: { type: 'string' },
        description: 'Concrete steps a family can follow at home.',
      },
      durationMinutes: {
        type: 'integer',
        minimum: 3,
        maximum: 15,
        description: 'How long the practice should take.',
      },
      materials: {
        type: 'array',
        items: { type: 'string' },
        description: 'Everyday household items, or an empty list.',
      },
      whyItHelps: {
        type: 'string',
        description: 'One sentence on why this may help, without medical claims.',
      },
      focus: {
        type: 'array',
        items: {
          type: 'string',
          enum: [
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
          ],
        },
        description: 'Support needs this practice is aimed at. Do not include "other".',
      },
    },
    required: [
      'title',
      'description',
      'steps',
      'durationMinutes',
      'materials',
      'whyItHelps',
      'focus',
    ],
  },
};

function buildPrompt(context) {
  const needs = context.supportNeeds
    .map((need) => (need === 'other' ? `other: ${context.otherSupportNeed}` : need))
    .join(', ');

  const history =
    context.pastExercises.length === 0
      ? 'None yet.'
      : context.pastExercises
          .map((exercise) => {
            const updates =
              exercise.updateSummaries.length > 0
                ? exercise.updateSummaries.join(' | ')
                : 'No updates';
            return `- ${exercise.title} (${exercise.status}): ${updates}`;
          })
          .join('\n');

  return `Suggest one new home practice for this child.

Child's first name: ${context.childName}
Age: ${context.childAge}
Support needs: ${needs}
How often a new practice arrives: ${context.frequency}

Recent practices and family updates:
${history}

Rules:
- This is a parent/carer-led home practice, not therapy, diagnosis, or a medical plan.
- Keep it short, calm, and possible in an ordinary home.
- Follow the child's lead. Offer an easy stop point.
- Do not repeat a recent title.
- Use what the family said helped or was hard.
- Language: plain UK English, no jargon.
- If the child is 5 or under, keep it especially short and concrete.
- If 12 or over, invite the young person to choose the order of steps.`;
}

export async function suggestExerciseWithClaude(context) {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set.');
  }

  const client = new Anthropic({ apiKey });
  const model = process.env.CLAUDE_MODEL?.trim() || 'claude-sonnet-4-5';

  const message = await client.messages.create({
    model,
    max_tokens: 1024,
    tools: [exerciseTool],
    tool_choice: { type: 'tool', name: 'suggest_exercise' },
    messages: [{ role: 'user', content: buildPrompt(context) }],
  });

  const toolBlock = message.content.find(
    (block) => block.type === 'tool_use' && block.name === 'suggest_exercise',
  );

  if (!toolBlock || typeof toolBlock.input !== 'object' || toolBlock.input === null) {
    throw new Error('Claude did not return an exercise.');
  }

  const input = toolBlock.input;
  const steps = Array.isArray(input.steps)
    ? input.steps.filter((step) => typeof step === 'string' && step.trim())
    : [];

  if (typeof input.title !== 'string' || typeof input.description !== 'string' || steps.length === 0) {
    throw new Error('Claude returned an incomplete exercise.');
  }

  return {
    title: input.title.trim(),
    description: input.description.trim(),
    steps,
    durationMinutes:
      Number.isInteger(input.durationMinutes) && input.durationMinutes > 0
        ? input.durationMinutes
        : 6,
    materials: Array.isArray(input.materials)
      ? input.materials.filter((item) => typeof item === 'string' && item.trim())
      : [],
    whyItHelps:
      typeof input.whyItHelps === 'string' && input.whyItHelps.trim()
        ? input.whyItHelps.trim()
        : 'Chosen to match this child’s support profile and recent practice.',
    focus: Array.isArray(input.focus)
      ? input.focus.filter((item) => typeof item === 'string')
      : [],
  };
}
