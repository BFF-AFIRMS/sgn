interface BreedingProgram {
    id: string;
    name: string;
    description: string;
}

/** The two fields the create/edit dialog collects. */
interface BreedingProgramValues {
    name: string;
    description: string;
}

/**
 * The `/breeders/program/*` endpoints report failures as `{ error: string }`,
 * and `store` reports success as `{ success: string }`.
 */
interface BreedingProgramResponse {
    error?: string;
    success?: string;
}
