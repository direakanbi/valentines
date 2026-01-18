import { z } from 'zod'

// Validation schema for journey creation
export const journeySchema = z.object({
    slug: z.string()
        .min(3, 'Slug must be at least 3 characters')
        .max(50, 'Slug must be less than 50 characters')
        .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens')
        .refine(val => !val.startsWith('-') && !val.endsWith('-'), 'Slug cannot start or end with a hyphen'),

    partner_name: z.string()
        .min(2, 'Partner name must be at least 2 characters')
        .max(50, 'Partner name must be less than 50 characters')
        .regex(/^[a-zA-Z\s'-]+$/, 'Partner name can only contain letters, spaces, hyphens, and apostrophes'),

    proposer_name: z.string()
        .min(2, 'Proposer name must be at least 2 characters')
        .max(50, 'Proposer name must be less than 50 characters')
        .regex(/^[a-zA-Z\s'-]+$/, 'Proposer name can only contain letters, spaces, hyphens, and apostrophes'),

    proposer_phone: z.string()
        .regex(/^\+?[1-9]\d{1,14}$/, 'Please enter a valid phone number (e.g., +1234567890)')
        .min(10, 'Phone number must be at least 10 digits')
        .max(15, 'Phone number must be less than 15 digits'),

    passcode: z.string()
        .min(3, 'Passcode must be at least 3 characters')
        .max(50, 'Passcode must be less than 50 characters'),

    music_url: z.string()
        .url('Please enter a valid URL')
        .optional()
        .or(z.literal('')),

    photos: z.array(z.string().url('Invalid photo URL'))
        .min(3, 'Please upload at least 3 photos')
        .max(10, 'Maximum 10 photos allowed')
})

export type JourneyFormData = z.infer<typeof journeySchema>
