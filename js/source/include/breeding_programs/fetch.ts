/**
 * Reads the JSON body of a breeding program endpoint response.
 *
 * `delete` answers with an empty body on success, so an empty body is treated
 * as a successful, message-less response.
 */
const readResponseBody = async (response: Response): Promise<BreedingProgramResponse> => {
    const text = await response.text();
    if (!text) {
        return {};
    }
    try {
        return JSON.parse(text) as BreedingProgramResponse;
    } catch {
        return { error: `Unexpected response from the server (HTTP ${response.status}).` };
    }
};

/**
 * Creates a program when `program` is `null`, and updates it otherwise.
 *
 * `POST /breeders/program/store` keys on the `id` field: no id creates a new
 * program, an existing id updates that program.
 */
export const storeBreedingProgram = async (
    program: BreedingProgram | null,
    values: BreedingProgramValues,
): Promise<void> => {
    const body = new URLSearchParams({ name: values.name, desc: values.description });
    if (program) {
        body.set('id', program.id);
    }

    const response = await fetch('/breeders/program/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
    });

    const result = await readResponseBody(response);
    if (result.error) {
        throw new Error(result.error);
    }
    if (!response.ok) {
        throw new Error(`The server could not save the breeding program (HTTP ${response.status}).`);
    }
};

/**
 * Deletes a breeding program by its id.
 */
export const deleteBreedingProgram = async ({ id }: Pick<BreedingProgram, 'id'>): Promise<void> => {
    const response = await fetch(`/breeders/program/delete/${encodeURIComponent(id)}`);

    const result = await readResponseBody(response);
    if (result.error) {
        throw new Error(result.error);
    }
    if (!response.ok) {
        throw new Error(`The server could not delete the breeding program (HTTP ${response.status}).`);
    }
};
